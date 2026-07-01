import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  if (mA === 0 || mB === 0) return 0;
  return dotProduct / (mA * mB);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const u = Deno.env.get('SUPABASE_URL') || ''
    const s = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const db = createClient(u, s)

    const body = await req.json()
    const { userId, partnerId, timezone } = body

    if (!userId || !partnerId) {
      return new Response(
        JSON.stringify({ error: 'userId and partnerId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Secure the API endpoint: Validate the caller's JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tempClient = createClient(u, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await tempClient.auth.getUser()
    if (userError || !user) {
      console.error("JWT Verification failed:", userError?.message || "User is null");
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${userError?.message || "Invalid Session"}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dateStr90 = ninetyDaysAgo.toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr30 = thirtyDaysAgo.toISOString().split('T')[0];

    // Fetch answers and streaks in parallel (90 days of answers)
    const [answersRes, streaksRes] = await Promise.all([
      db.from('answers').select('*').gte('day_key', dateStr90).in('user_id', [userId, partnerId]),
      db.from('streaks').select('*').in('user_id', [userId, partnerId])
    ]);

    if (answersRes.error) throw answersRes.error;
    if (streaksRes.error) throw streaksRes.error;

    const answers = answersRes.data || [];
    const streaks = streaksRes.data || [];

    const myAnswers = answers.filter(a => a.user_id === userId);
    const partnerAnswers = answers.filter(a => a.user_id === partnerId);

    // Days where both answered (90 day window)
    const daysWithBoth = myAnswers.filter(ma => 
      partnerAnswers.some(pa => pa.day_key === ma.day_key)
    );

    // Fetch daily questions for these days to check hDir metadata
    const dayKeysList = daysWithBoth.map(d => d.day_key);
    const { data: dailyQuestions, error: dqError } = dayKeysList.length > 0
      ? await db.from('daily_questions').select('day_key, questions').in('day_key', dayKeysList)
      : { data: [], error: null };
    
    if (dqError) throw dqError;

    const questionsMap = new Map<string, any>();
    if (dailyQuestions) {
      dailyQuestions.forEach(row => {
        questionsMap.set(row.day_key, row.questions);
      });
    }

    // Filter for 30 day window
    const daysWithBoth30 = daysWithBoth.filter(ma => ma.day_key >= dateStr30);
    const myAnswers30 = myAnswers.filter(a => a.day_key >= dateStr30);
    const partnerAnswers30 = partnerAnswers.filter(a => a.day_key >= dateStr30);

    // Calculate together active days based on streaks table intersection (30 days)
    let totalAnswers = daysWithBoth30.length;
    if (streaks && streaks.length > 0) {
      const myStreak = streaks.find(s => s.user_id === userId);
      const partnerStreak = streaks.find(s => s.user_id === partnerId);
      
      const myHist = Array.isArray(myStreak?.streak_history) ? myStreak.streak_history : [];
      const partnerHist = Array.isArray(partnerStreak?.streak_history) ? partnerStreak.streak_history : [];

      const myHist30 = myHist.filter(d => d >= dateStr30);
      const partnerHist30 = partnerHist.filter(d => d >= dateStr30);

      const commonDates = myHist30.filter(d => partnerHist30.includes(d));
      if (commonDates.length > 0) {
        totalAnswers = commonDates.length;
      }
    }

    if (daysWithBoth.length === 0) {
      return new Response(
        JSON.stringify({
          totalAnswers: 0,
          myHabit: 0,
          partnerHabit: 0,
          totMatch: 0,
          rankingMatch: 0,
          textMatch: 0,
          wweMatch: 0,
          bisouScore: 0,
          scoreHistory: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse answer string format: "q0_ans | q1_ans | q2_ans | q3_ans [sig]"
    const parseChoice = (choiceStr: string) => {
      const mainPart = String(choiceStr || '').split(" [")[0];
      const parts = mainPart.split(" | ");
      return {
        tot: (parts[0] || '').trim(),
        ranking: parts[1] ? parts[1].split(" > ").map(s => s.trim()) : [],
        text: (parts[2] || '').trim(),
        wwe: (parts[3] || '').trim()
      };
    };

    const textPairs: { day_key: string; text1: string; text2: string }[] = [];

    // Setup Free Text pairs for comparison across all 90 days
    daysWithBoth.forEach(ma => {
      const pa = partnerAnswers.find(p => p.day_key === ma.day_key);
      if (pa) {
        const myP = parseChoice(ma.choice);
        const partnerP = parseChoice(pa.choice);
        if (myP.text || partnerP.text) {
          textPairs.push({
            day_key: ma.day_key,
            text1: myP.text,
            text2: partnerP.text
          });
        }
      }
    });

    const debugErrors: any[] = [];

    // 4. Free Text match (semantic comparison via Gemini API or Jaccard fallback)
    const textSimilarities: Record<string, number> = {};

    if (textPairs.length > 0) {
      const uniqueTexts = new Set<string>();
      for (const pair of textPairs) {
        const t1 = String(pair.text1 || '').trim();
        const t2 = String(pair.text2 || '').trim();
        if (t1 && t2 && t1 !== t2) {
          uniqueTexts.add(t1);
          uniqueTexts.add(t2);
        }
      }

      const textToVectorMap = new Map<string, number[]>();

      const k = Deno.env.get('GEMINI_API_KEY') || '';

      if (uniqueTexts.size > 0 && k) {
        const textList = Array.from(uniqueTexts);
        await Promise.all(
          textList.map(async (text) => {
            try {
              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${k}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: "models/gemini-embedding-001",
                  content: { parts: [{ text }] }
                })
              });
              if (res.ok) {
                const data = await res.json();
                const vector = data.embedding?.values;
                if (vector && Array.isArray(vector)) {
                  textToVectorMap.set(text, vector);
                }
              } else {
                console.error(`Gemini embedding request failed for "${text}": status ${res.status}`);
              }
            } catch (e: any) {
              console.error(`Error generating embedding for "${text}":`, e.message);
            }
          })
        );
      }

      textPairs.forEach(pair => {
        const t1 = String(pair.text1 || '').trim();
        const t2 = String(pair.text2 || '').trim();

        if (!t1 || !t2) {
          textSimilarities[pair.day_key] = 0;
        } else if (t1 === t2) {
          textSimilarities[pair.day_key] = 100;
        } else {
          const v1 = textToVectorMap.get(t1);
          const v2 = textToVectorMap.get(t2);

          if (!v1 || !v2) {
            // Local Jaccard overlap fallback if embeddings failed
            const clean1 = t1.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            const clean2 = t2.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            if (!clean1 || !clean2) {
              textSimilarities[pair.day_key] = 0;
            } else {
              const words1 = clean1.split(/\s+/);
              const words2 = clean2.split(/\s+/);
              const set1 = new Set(words1);
              const set2 = new Set(words2);
              let intersect = 0;
              for (const w of set1) {
                if (set2.has(w)) intersect++;
              }
              const union = new Set([...words1, ...words2]).size;
              textSimilarities[pair.day_key] = union > 0 ? (intersect / union) * 100 : 0;
            }
          } else {
            const rawSimilarity = cosineSimilarity(v1, v2);
            // Apply generous scaling: map [0.2, 1] to [0, 1] with power curve 0.4 for very high/generous similarity
            const normalized = Math.max(0, (rawSimilarity - 0.2) / 0.8);
            const similarityPercent = Math.min(100, Math.max(0, Math.round(Math.pow(normalized, 0.4) * 1000) / 10));
            textSimilarities[pair.day_key] = similarityPercent;
          }
        }
      });
    }

    // 5. Modular Helper to calculate scores & match averages for any range of days
    const getStatsForDays = (daysList: any[]) => {
      if (daysList.length === 0) {
        return { tot: 0, ranking: 0, wwe: 0, text: 0, score: 0 };
      }
      
      let totSum = 0, totDaysCount = 0;
      let rankingSum = 0, rankingDaysCount = 0;
      let wweSum = 0, wweDaysCount = 0;
      let textSum = 0, textDaysCount = 0;

      daysList.forEach(ma => {
        const pa = partnerAnswers.find(p => p.day_key === ma.day_key);
        if (pa) {
          const myP = parseChoice(ma.choice);
          const partnerP = parseChoice(pa.choice);
          const qData = questionsMap.get(ma.day_key);

          // Get harmony directions, fallback to "high" (full backward compatibility)
          const totHDir = qData?.tot?.hDir || "high";
          const rankingHDir = qData?.ranking?.hDir || "high";
          const textHDir = qData?.text?.hDir || "high";
          const wweHDir = qData?.wwe?.hDir || "high";

          // Dies-oder-Das-Frage
          if (myP.tot && partnerP.tot) {
            totDaysCount++;
            const isMatch = myP.tot === partnerP.tot;
            if (totHDir === "low") {
              totSum += !isMatch ? 100 : 0;
            } else {
              totSum += isMatch ? 100 : 0;
            }
          }

          // Ranking-Frage
          const commonItems = myP.ranking.filter(item => partnerP.ranking.includes(item));
          const n = commonItems.length;
          if (n > 1) {
            let sumSqDiff = 0;
            for (const item of commonItems) {
              const myPos = myP.ranking.indexOf(item);
              const partnerPos = partnerP.ranking.indexOf(item);
              sumSqDiff += Math.pow(myPos - partnerPos, 2);
            }
            const maxSqDiff = (n * (n * n - 1)) / 3;
            const rawSim = maxSqDiff > 0 ? (1 - (sumSqDiff / maxSqDiff)) * 100 : 100;
            const sim = Math.sqrt(Math.max(0, rawSim) / 100) * 100;
            
            const finalSim = rankingHDir === "low" ? 100 - sim : sim;
            rankingSum += finalSim;
            rankingDaysCount++;
          }

          // Wer-würde-eher-Frage
          if (myP.wwe && partnerP.wwe) {
            wweDaysCount++;
            // Note: in string representation, A saying "Ich" and B saying "Partner" is actually agreement.
            // That means strings are DIFFERENT (myP.wwe !== partnerP.wwe).
            const isAgree = myP.wwe !== partnerP.wwe;
            if (wweHDir === "low") {
              wweSum += !isAgree ? 100 : 0; // disagreement speaks for harmony
            } else {
              wweSum += isAgree ? 100 : 0; // agreement speaks for harmony
            }
          }

          // Freitext-Frage
          const sim = textSimilarities[ma.day_key];
          if (sim !== undefined) {
            const finalSim = textHDir === "low" ? 100 - sim : sim;
            textSum += finalSim;
            textDaysCount++;
          }
        }
      });

      const totMatchAvg = totDaysCount > 0 ? Math.round(totSum / totDaysCount) : 0;
      const rankingMatchAvg = rankingDaysCount > 0 ? Math.round(rankingSum / rankingDaysCount) : 0;
      const wweMatchAvg = wweDaysCount > 0 ? Math.round(wweSum / wweDaysCount) : 0;
      const textMatchAvg = textDaysCount > 0 ? Math.round(textSum / textDaysCount) : 0;

      // Equal Weighting: Arithmetic mean of all active categories
      let activeCategories = 0;
      let sumMatchAvgs = 0;

      if (totDaysCount > 0) { activeCategories++; sumMatchAvgs += totMatchAvg; }
      if (rankingDaysCount > 0) { activeCategories++; sumMatchAvgs += rankingMatchAvg; }
      if (wweDaysCount > 0) { activeCategories++; sumMatchAvgs += wweMatchAvg; }
      if (textDaysCount > 0) { activeCategories++; sumMatchAvgs += textMatchAvg; }

      const avgPercent = activeCategories > 0 ? (sumMatchAvgs / activeCategories) : 0;
      const score = Math.max(0, Math.min(10, Math.round((avgPercent / 10) * 10) / 10));

      return {
        tot: totMatchAvg,
        ranking: rankingMatchAvg,
        wwe: wweMatchAvg,
        text: textMatchAvg,
        score
      };
    };

    // Calculate current stats based on the last 30 days
    const stats30 = getStatsForDays(daysWithBoth30);
    const bisouScore = stats30.score;
    const totMatchAvg = stats30.tot;
    const rankingMatchAvg = stats30.ranking;
    const wweMatchAvg = stats30.wwe;
    const textMatchAvg = stats30.text;

    // Calculate previous 30-day score (minus the most recent day in the 30-day window)
    const sortedDays30 = [...daysWithBoth30].sort((a, b) => a.day_key.localeCompare(b.day_key));
    let prevBisouScore: number | null = null;
    if (sortedDays30.length > 1) {
      const mostRecentDayKey = sortedDays30[sortedDays30.length - 1].day_key;
      const prevDays30 = sortedDays30.filter(d => d.day_key !== mostRecentDayKey);
      prevBisouScore = getStatsForDays(prevDays30).score;
    }

    const getLocalDateStr = (utcString: string, timeZone: string) => {
      try {
        const date = new Date(utcString);
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timeZone || 'Europe/Berlin',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const parts = formatter.formatToParts(date);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
      } catch {
        return utcString.split('T')[0];
      }
    };

    // Fetch unlocked milestones for the calling user only (not the partner)
    const { data: unlocked, error: milestonesErr } = await db
      .from('unlocked_milestones')
      .select('*, milestones(*)')
      .eq('user_id', userId);

    if (milestonesErr) {
      console.error("Milestones fetch error:", milestonesErr);
    }

    const milestonesByDate: Record<string, any[]> = {};
    if (unlocked && unlocked.length > 0) {
      unlocked.forEach(u => {
        const localDate = getLocalDateStr(u.unlocked_at, timezone);
        if (!milestonesByDate[localDate]) {
          milestonesByDate[localDate] = [];
        }
        milestonesByDate[localDate].push({
          id: u.milestones?.id || u.milestone_id,
          name: u.milestones?.name || 'Meilenstein',
          description: u.milestones?.description || '',
          icon: u.milestones?.icon || '🏆',
          userId: u.user_id
        });
      });
    }

    // Sort 90 days answers chronologically
    const sortedDays90 = [...daysWithBoth].sort((a, b) => a.day_key.localeCompare(b.day_key));

    // Calculate rolling 30-day Bisou Score for each day in the 90-day history
    const scoreHistory = sortedDays90.map(d => {
      const currentDate = new Date(d.day_key);
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - 30);
      const startStr = startDate.toISOString().split('T')[0];

      // Filter answers to the 30-day window ending on d.day_key
      const daysSubset = sortedDays90.filter(sd => sd.day_key >= startStr && sd.day_key <= d.day_key);
      const score = getStatsForDays(daysSubset).score;
      return {
        date: d.day_key,
        score: score,
        milestones: milestonesByDate[d.day_key] || []
      };
    });

    // 6. Habits (Avg Hour) in target timezone (representing last 30 days)
    const getAvgHour = (ans: any[]) => {
      if (ans.length === 0) return 0;
      const totalHours = ans.reduce((acc, a) => {
        let hour = 0;
        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            hour12: false,
            timeZone: timezone || 'Europe/Berlin'
          });
          const formatted = formatter.format(new Date(a.created_at));
          hour = parseInt(formatted, 10) % 24;
        } catch (e) {
          hour = (new Date(a.created_at).getUTCHours() + 2) % 24;
        }
        return acc + hour;
      }, 0);
      return Math.round(totalHours / ans.length) % 24;
    };

    // Who answers first? Compare created_at timestamps for each shared day (last 30 days)
    let myFirstCount = 0;
    let partnerFirstCount = 0;
    daysWithBoth30.forEach(ma => {
      const pa = partnerAnswers30.find(p => p.day_key === ma.day_key);
      if (pa && ma.created_at && pa.created_at) {
        const myTime = new Date(ma.created_at).getTime();
        const partnerTime = new Date(pa.created_at).getTime();
        if (myTime < partnerTime) myFirstCount++;
        else if (partnerTime < myTime) partnerFirstCount++;
        // ties are ignored
      }
    });
    const firstAnswerTotal = myFirstCount + partnerFirstCount;
    const myFirstPercent = firstAnswerTotal > 0
      ? Math.round((myFirstCount / firstAnswerTotal) * 100)
      : null;

    const finalStats = {
      totalAnswers,
      myHabit: getAvgHour(myAnswers30),
      partnerHabit: getAvgHour(partnerAnswers30),
      myFirstPercent,
      totMatch: totMatchAvg,
      rankingMatch: rankingMatchAvg,
      textMatch: textMatchAvg,
      wweMatch: wweMatchAvg,
      bisouScore,
      prevBisouScore,
      scoreHistory
    };

    return new Response(
      JSON.stringify(finalStats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error("Calculate stats function error:", err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
