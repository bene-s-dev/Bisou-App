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
    console.log("Authorization Header received:", authHeader ? authHeader.substring(0, 25) + "..." : "null");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    // Direct fetch to verify the JWT against Supabase Auth to bypass any client library session-merging bugs
    const authResponse = await fetch(`${u}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': authHeader
      }
    })

    if (!authResponse.ok) {
      const errBody = await authResponse.json().catch(() => ({}));
      console.error("JWT Verification failed via direct fetch:", errBody);
      return new Response(
        JSON.stringify({ error: `Unauthorized: ${errBody.msg || errBody.error_description || errBody.message || "Invalid Session"}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = await authResponse.json()
    if (!user || !user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid user payload returned' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Fetch answers and streaks in parallel
    const [answersRes, streaksRes] = await Promise.all([
      db.from('answers').select('*').gte('day_key', dateStr).in('user_id', [userId, partnerId]),
      db.from('streaks').select('*').in('user_id', [userId, partnerId])
    ]);

    if (answersRes.error) throw answersRes.error;
    if (streaksRes.error) throw streaksRes.error;

    const answers = answersRes.data || [];
    const streaks = streaksRes.data || [];

    const myAnswers = answers.filter(a => a.user_id === userId);
    const partnerAnswers = answers.filter(a => a.user_id === partnerId);

    // 1. Total Questions (Days where both answered)
    const daysWithBoth = myAnswers.filter(ma => 
      partnerAnswers.some(pa => pa.day_key === ma.day_key)
    );

    // Calculate together active days based on streaks table intersection
    let totalAnswers = daysWithBoth.length;
    if (streaks && streaks.length > 0) {
      const myStreak = streaks.find(s => s.user_id === userId);
      const partnerStreak = streaks.find(s => s.user_id === partnerId);
      
      const myHist = Array.isArray(myStreak?.streak_history) ? myStreak.streak_history : [];
      const partnerHist = Array.isArray(partnerStreak?.streak_history) ? partnerStreak.streak_history : [];

      const myHist30 = myHist.filter(d => d >= dateStr);
      const partnerHist30 = partnerHist.filter(d => d >= dateStr);

      const commonDates = myHist30.filter(d => partnerHist30.includes(d));
      if (commonDates.length > 0) {
        totalAnswers = commonDates.length;
      }
    }

    if (daysWithBoth.length === 0) {
      return new Response(
        JSON.stringify({
          totalAnswers,
          myHabit: 0,
          partnerHabit: 0,
          totMatch: 0,
          rankingMatch: 0,
          textMatch: 0,
          wweMatch: 0,
          bisouScore: 0
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

    let totSum = 0;
    let totDaysCount = 0;
    let rankingSum = 0;
    let rankingDaysCount = 0;
    let wweSum = 0;
    let wweDaysCount = 0;
    const textPairs: { day_key: string; text1: string; text2: string }[] = [];

    daysWithBoth.forEach(ma => {
      const pa = partnerAnswers.find(p => p.day_key === ma.day_key);
      if (pa) {
        const myP = parseChoice(ma.choice);
        const partnerP = parseChoice(pa.choice);

        // Dies-oder-Das-Frage: Binärer Logik-Abgleich
        if (myP.tot && partnerP.tot) {
          totDaysCount++;
          if (myP.tot === partnerP.tot) {
            totSum += 100;
          }
        }

        // Ranking-Frage: Positions-Abstands-Analyse
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
          // Apply an encouraging square-root scaling to make the score feel more balanced and fair
          const sim = Math.sqrt(Math.max(0, rawSim) / 100) * 100;
          rankingSum += sim;
          rankingDaysCount++;
        }

        // Setup Free Text pairs for comparison
        if (myP.text || partnerP.text) {
          textPairs.push({
            day_key: ma.day_key,
            text1: myP.text,
            text2: partnerP.text
          });
        }

        // Wer-würde-eher-Frage: Binärer Logik-Abgleich
        if (myP.wwe && partnerP.wwe) {
          wweDaysCount++;
          // A match happens if both choose the same person.
          // Since one says "Ich" and the other says "Partner" for the same person, 
          // a match is when the strings are NOT equal.
          if (myP.wwe !== partnerP.wwe) {
            wweSum += 100;
          }
        }
      }
    });

    const totalDays = daysWithBoth.length;
    const totMatchAvg = totDaysCount > 0 ? Math.round(totSum / totDaysCount) : 0;
    const rankingMatchAvg = rankingDaysCount > 0 
      ? Math.round(rankingSum / rankingDaysCount) 
      : 0;
    const wweMatchAvg = wweDaysCount > 0
      ? Math.round(wweSum / wweDaysCount)
      : 0;

    // 4. Free Text match (semantic comparison via Gemini API or fallback)
    let textMatchAvg = 0;
    const textSimilarities: Record<string, number> = {};

    if (textPairs.length > 0) {
      const uniqueTexts = new Set<string>()
      for (const pair of textPairs) {
        const t1 = String(pair.text1 || '').trim()
        const t2 = String(pair.text2 || '').trim()
        if (t1 && t2 && t1 !== t2) {
          uniqueTexts.add(t1)
          uniqueTexts.add(t2)
        }
      }

      const textToVectorMap = new Map<string, number[]>()

      if (uniqueTexts.size > 0) {
        try {
          // Check if Supabase.ai is globally available in this Edge Function context
          if (typeof Supabase !== 'undefined' && Supabase && Supabase.ai && Supabase.ai.Session) {
            console.log("Initializing Supabase.ai.Session for gte-small embeddings...");
            const session = new Supabase.ai.Session('gte-small');
            const textList = Array.from(uniqueTexts);
            
            await Promise.all(
              textList.map(async (text) => {
                try {
                  const embedding = await session.run(text, {
                    mean_pool: true,
                    normalize: true,
                  });
                  if (embedding) {
                    const vector = Array.from(embedding as number[] | Float32Array);
                    textToVectorMap.set(text, vector);
                  }
                } catch (e: any) {
                  console.error(`Error generating embedding for "${text}":`, e.message);
                }
              })
            );
          } else {
            console.log("Supabase.ai.Session is not supported in this Edge Runtime context. Using Jaccard similarity fallback.");
          }
        } catch (e: any) {
          console.error("Failed to initialize Supabase.ai.Session:", e.message);
        }
      }

      textPairs.forEach(pair => {
        const t1 = String(pair.text1 || '').trim()
        const t2 = String(pair.text2 || '').trim()

        if (!t1 || !t2) {
          textSimilarities[pair.day_key] = 0;
        } else if (t1 === t2) {
          textSimilarities[pair.day_key] = 100;
        } else {
          const v1 = textToVectorMap.get(t1)
          const v2 = textToVectorMap.get(t2)

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
            const rawSimilarity = cosineSimilarity(v1, v2)
            // Map [0.3, 0.9] to [0, 100] linearly for a fair, balanced score
            const normalized = Math.max(0, (rawSimilarity - 0.3) / 0.6)
            const similarityPercent = Math.min(100, Math.max(0, Math.round(normalized * 1000) / 10))
            textSimilarities[pair.day_key] = similarityPercent
          }
        }
      });

      let textSum = 0;
      let activeTextDays = 0;
      daysWithBoth.forEach(ma => {
        const sim = textSimilarities[ma.day_key];
        if (sim !== undefined) {
          textSum += sim;
          activeTextDays++;
        }
      });
      textMatchAvg = activeTextDays > 0 ? Math.round(textSum / activeTextDays) : 0;
    }

    // 5. Calculate Bisou Score (0-10, one decimal place) 
    const calculateScoreForDays = (daysList: any[]) => {
      if (daysList.length === 0) return 0;
      
      let totSum = 0;
      let totDaysCount = 0;
      let rankingSum = 0;
      let rankingDaysCount = 0;
      let wweSum = 0;
      let wweDaysCount = 0;
      let textSum = 0;
      let textDaysCount = 0;

      daysList.forEach(ma => {
        const pa = partnerAnswers.find(p => p.day_key === ma.day_key);
        if (pa) {
          const myP = parseChoice(ma.choice);
          const partnerP = parseChoice(pa.choice);

          // Dies-oder-Das-Frage
          if (myP.tot && partnerP.tot) {
            totDaysCount++;
            if (myP.tot === partnerP.tot) {
              totSum += 100;
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
            rankingSum += sim;
            rankingDaysCount++;
          }

          // Wer-würde-eher-Frage
          if (myP.wwe && partnerP.wwe) {
            wweDaysCount++;
            if (myP.wwe !== partnerP.wwe) {
              wweSum += 100;
            }
          }

          // Freitext-Frage
          const sim = textSimilarities[ma.day_key];
          if (sim !== undefined) {
            textSum += sim;
            textDaysCount++;
          }
        }
      });

      const totMatchAvg = totDaysCount > 0 ? Math.round(totSum / totDaysCount) : 0;
      const rankingMatchAvg = rankingDaysCount > 0 ? Math.round(rankingSum / rankingDaysCount) : 0;
      const wweMatchAvg = wweDaysCount > 0 ? Math.round(wweSum / wweDaysCount) : 0;
      const textMatchAvg = textDaysCount > 0 ? Math.round(textSum / textDaysCount) : 0;

      let activeWeights = 0;
      let weightedSum = 0;

      if (totDaysCount > 0) { activeWeights += 0.25; weightedSum += totMatchAvg * 0.25; }
      if (rankingDaysCount > 0) { activeWeights += 0.25; weightedSum += rankingMatchAvg * 0.25; }
      if (wweDaysCount > 0) { activeWeights += 0.25; weightedSum += wweMatchAvg * 0.25; }
      if (textDaysCount > 0) { activeWeights += 0.25; weightedSum += textMatchAvg * 0.25; }

      const weightedPercent = activeWeights > 0 ? (weightedSum / activeWeights) : 0;
      return Math.max(0, Math.min(10, Math.round((weightedPercent / 10) * 10) / 10));
    };

    // Calculate today's Bisou Score (using all days)
    const bisouScore = calculateScoreForDays(daysWithBoth);

    // Sort days with both answered in ascending order of date
    const sortedDays = [...daysWithBoth].sort((a, b) => a.day_key.localeCompare(b.day_key));
    
    // The previous score should be calculated by excluding the most recent day's answers.
    // This handles both cases:
    // - If both answered today: compares today's score with yesterday's score.
    // - If both have NOT answered today: compares yesterday's score (last active) with the day before yesterday's score.
    let prevBisouScore: number | null = null;
    if (sortedDays.length > 1) {
      const mostRecentDayKey = sortedDays[sortedDays.length - 1].day_key;
      const prevDays = sortedDays.filter(d => d.day_key !== mostRecentDayKey);
      prevBisouScore = calculateScoreForDays(prevDays);
    }

    // 6. Habits (Avg Hour) in target timezone
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

    const finalStats = {
      totalAnswers,
      myHabit: getAvgHour(myAnswers),
      partnerHabit: getAvgHour(partnerAnswers),
      totMatch: totMatchAvg,
      rankingMatch: rankingMatchAvg,
      textMatch: textMatchAvg,
      wweMatch: wweMatchAvg,
      bisouScore,
      prevBisouScore
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
