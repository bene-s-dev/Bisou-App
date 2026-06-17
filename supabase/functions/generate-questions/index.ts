import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenAI, ThinkingLevel } from "npm:@google/genai"
import { z } from "npm:zod"
import { zodToJsonSchema } from "npm:zod-to-json-schema"

// ==========================================
// ZOD-SCHEMA FÜR STRUKTURIERTE AUSGABE
// ==========================================
const dailyQuestionsSchema = z.object({
  tot: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 50 bis 130 Zeichen"),
    h: z.string().describe("Ein kurzer, passender Hilfstext"),
    o: z.array(z.string()).length(2).describe("Exakt 2 Optionen für die Entweder-Oder-Frage, Länge jeweils ca. 10 bis 70 Zeichen")
  }),
  ranking: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
    h: z.string().describe("Ein kurzer, passender Hilfstext"),
    o: z.array(z.string()).length(4).describe("Exakt 4 Optionen, Länge jeweils ca. 10 bis 60 Zeichen")
  }),
  text: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
    h: z.string().describe("Ein kurzer, passender Hilfstext"),
    o: z.array(z.string()).length(0).describe("Muss ein leeres Array sein")
  }),
  wwe: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
    h: z.string().describe("Ein kurzer, passender Hilfstext"),
    o: z.array(z.string()).length(2).describe("Exakt 2 Optionen: ['Ich', 'Partner']")
  })
});

serve(async (req) => {
  const k = Deno.env.get('GEMINI_API_KEY') || ''
  const u = Deno.env.get('SUPABASE_URL') || ''
  const s = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const db = createClient(u, s)

  // GenAI Client initialisieren
  const ai = new GoogleGenAI({ apiKey: k });

  let dayKey;
  try {
    const body = await req.json();
    dayKey = body.day_key || body.dayKey;
  } catch (e) {}

  if (!dayKey) {
    dayKey = new Date().toISOString().split('T')[0];
  }

  try {
    // 1. Prüfen, ob für heute bereits Fragen existieren
    const { data: ex } = await db.from('daily_questions').select('questions').eq('day_key', dayKey).maybeSingle()
    if (ex) {
      // Clean up queue if it exists
      await db.from('failed_generations').delete().eq('day_key', dayKey).catch(() => {});
      return new Response(JSON.stringify(ex), { 
        headers: { 'Content-Type': 'application/json' } 
      })
    }

    // ==========================================================
    // HISTORIE AUS SUPABASE LADEN (Die letzten 60 Tage)
    // ==========================================================
    const { data: historie } = await db
      .from('daily_questions')
      .select('questions')
      .order('day_key', { ascending: false })
      .limit(60);

    const bisherigeFragen: string[] = [];
    if (historie && Array.isArray(historie)) {
      historie.forEach(row => {
        if (row.questions) {
          if (row.questions.tot?.q) bisherigeFragen.push(`- ${row.questions.tot.q}`);
          if (row.questions.ranking?.q) bisherigeFragen.push(`- ${row.questions.ranking.q}`);
          if (row.questions.text?.q) bisherigeFragen.push(`- ${row.questions.text.q}`);
        }
      });
    }

    const ausgeschlosseneFragenText = bisherigeFragen.length > 0 
      ? bisherigeFragen.join('\n') 
      : 'Keine (das ist einer der ersten Durchläufe)';

    // ==========================================================
    // DETERMINISTISCHE 30-TAGE-ROTATION (90 völlig isolierte Themen)
    // ==========================================================
    const dateObj = new Date(dayKey);
    const startOfYear = new Date(dateObj.getFullYear(), 0, 0);
    const diff = dateObj.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / 1000 / 60 / 60 / 24);

    const themeSets = [
      ['Romantik', 'Finanzen', 'Alltagsmacken', 'Abenteuer'], // Tag 1
      ['Streitkultur', 'Popkultur', 'Zukunftsplanung', 'Haushalt'], // Tag 2
      ['Kindheitserinnerungen', 'Haushaltspflichten', 'Geheimnisse', 'Soziale Kontakte'], // Tag 3
      ['Intimität', 'Fernreisen', 'Philosophische Fragen', 'Gesundheit'], // Tag 4
      ['Familie', 'Karrierewege', 'Moralvorstellungen', 'Technologie'], // Tag 5
      ['Selbsterkenntnis', 'Kochen', 'Persönliche Ängste', 'Natur'], // Tag 6
      ['Vertrauen', 'Was-wäre-wenn-Szenarien', 'Sehnsüchte', 'Geld'], // Tag 7
      ['Flirtverhalten', 'Große Investitionen', 'Macken des Partners', 'Sport'], // Tag 8
      ['Versöhnung', 'Musikgeschmack', 'Wohnen', 'Bildung'], // Tag 9
      ['Jugendjahre', 'Freizeitgestaltung', 'Tabuthemen', 'Essen'], // Tag 10
      ['Körperliche Zärtlichkeit', 'Mikro-Abenteuer', 'Gesellschaftstrends', 'Arbeit'], // Tag 11
      ['Freundeskreis', 'Work-Life-Balance', 'Lebenssinn', 'Kindheit'], // Tag 12
      ['Mentale Gesundheit', 'Kulinarik', 'Innere Unsicherheiten', 'Zukunft'], // Tag 13
      ['Emotionale Meilensteine', 'Humor', 'Zukunftswünsche', 'Kommunikation'], // Tag 14
      ['Erste Verliebtheitsphase', 'Konsumverhalten', 'Morgenroutinen', 'Abendrituale'], // Tag 15
      ['Konfliktvermeidung', 'Filmgeschmack', 'Rollenverteilung', 'Reisen'], // Tag 16
      ['Schulerinnerungen', 'Haustiere', 'Peinliche Momente', 'Mode'], // Tag 17
      ['Körperliche Nähe', 'Wochenendgestaltung', 'Kultur', 'Technik'], // Tag 18
      ['Schwiegerfamilie', 'Stressbewältigung', 'Gerechtigkeitsempfinden', 'Politik'], // Tag 19
      ['Charakterzüge', 'Lieblingsgerichte', 'Zukunft der Welt', 'Werte'], // Tag 20
      ['Bindungsdynamiken', 'Kreative Hobbys', 'Existenzielle Fragen', 'Nostalgie'], // Tag 21
      ['Liebesbeweise', 'Umgang mit Erbschaften', 'Abendrituale', 'Spontaneität'], // Tag 22
      ['Missverständnisse', 'Serienvorlieben', 'Raumaufteilung', 'Ordnung'], // Tag 23
      ['Erziehungsvorstellungen', 'Sport', 'Nostalgie', 'Verantwortung'], // Tag 24
      ['Romantische Gesten', 'Ausflugsziele', 'Große Lebensentscheidungen', 'Mut'], // Tag 25
      ['Alte Freundschaften', 'Jobzufriedenheit', 'Glaubensfragen', 'Träume'], // Tag 26
      ['Achtsamkeit', 'Lieblingssnacks', 'Kindheitsängste', 'Stärken'], // Tag 27
      ['Eifersucht', 'Gaming', 'Das perfekte Zuhause', 'Ruhe'], // Tag 28
      ['Liebeserklärungen', 'Versicherungen', 'Social-Media-Konsum', 'Fokus'], // Tag 29
      ['Kompromissbereitschaft', 'Konzerte', 'Lebenslanges Lernen', 'Leidenschaft'] // Tag 30
    ];

    const todaysThemes = themeSets[dayOfYear % themeSets.length];
    const [themaTot, themaRanking, themaText, themaWwe] = todaysThemes;

    const prompt = `Du bist ein einfühlsamer, bodenständiger Fragenautor für eine Pärchen-App. Generiere exakt 4 Fragen.

WICHTIG: Folgende Fragen wurden den Nutzern in den letzten 60 Tagen gestellt. Generiere NIEMALS Fragen, die inhaltlich ähnlich, semantisch identisch oder strukturell wiederholend sind, überlege, welche Fragen nicht langweilig und wiederholend sind, wenn man folgende Fragen aus den vergangenen Tagen kennt:
${ausgeschlosseneFragenText}

Befolge für den heutigen Tag exakt diese Themen-Vorgaben und Zeichenlimits:
1. "tot" (Entweder-Oder): Thema muss "${themaTot}" sein. Frage: ca. 50-130 Zeichen. Die 2 Antwortoptionen sollen jeweils ca. 10-70 Zeichen lang sein.
2. "ranking" (4 Dinge ordnen): Thema muss "${themaRanking}" sein. Frage: ca. 40-130 Zeichen. Die 4 Antwortoptionen sollen jeweils ca. 10-60 Zeichen lang sein.
3. "text" (Offene Frage): Thema muss "${themaText}" sein. Frage: ca. 40-130 Zeichen.
4. "wwe" (Wer würde eher): Thema muss "${themaWwe}" sein. Frage: ca. 40-130 Zeichen. Die Antwortoptionen müssen IMMER ["Ich", "Partner"] sein.

STIMMUNG & TONFALL (WICHTIG!):
- Schreibe alltagsnahe, nahbare und natürliche Fragen, über die ein echtes Paar abends gerne auf dem Sofa plaudert.
- Vermeide absurde Gedankenexperimente, seltsame/bizarre hypothetische Szenarien oder allzu abstrakte, verkopfte philosophische Rätsel. Die Fragen müssen bodenständig sein.`;

    // ==========================================
    // API CALL ZU GEMINI MIT THINKING & ZOD
    // ==========================================
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(dailyQuestionsSchema),
        temperature: 1.0
      }
    });

    if (!response.text) {
       throw new Error("Gemini lieferte keine Inhalte zurück.");
    }

    // JSON parsen und durch Zod absichern
    let rawJson = JSON.parse(response.text);
    
    // Gemini returns array of [{type, question, options}] — transform to expected {tot:{q,h,o}, ...}
    if (Array.isArray(rawJson)) {
      const transformed: any = {};
      for (const item of rawJson) {
        const key = item.type; // 'tot', 'ranking', 'text', 'wwe'
        transformed[key] = {
          q: item.question || item.q || '',
          h: item.hint || item.h || '',
          o: item.options || item.o || []
        };
      }
      rawJson = transformed;
    }
    
    const content = dailyQuestionsSchema.parse(rawJson);

    // ==========================================
    // IN DATENBANK SPEICHERN
    // ==========================================
    const { error: insertError } = await db.from('daily_questions').insert({ 
      day_key: dayKey, 
      questions: content 
    })

    if (insertError) {
      if (insertError.code === '23505') {
        console.log("Duplicate key violation caught - fetching questions from database");
        const { data: ex2, error: fetchError } = await db
          .from('daily_questions')
          .select('questions')
          .eq('day_key', dayKey)
          .maybeSingle();

        if (ex2 && ex2.questions) {
          return new Response(JSON.stringify({ questions: ex2.questions }), { 
            headers: { 'Content-Type': 'application/json' } 
          });
        }
        if (fetchError) throw fetchError;
      }
      throw insertError;
    }

    // Lösche aus failed_generations Warteschlange bei Erfolg
    await db.from('failed_generations').delete().eq('day_key', dayKey).catch(() => {});

    return new Response(JSON.stringify({ questions: content }), { 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (err: any) {
    console.error("Function error:", err.message);

    // Queue in failed_generations table to trigger retry via cron
    try {
      const { data: currentJob } = await db
        .from('failed_generations')
        .select('attempts')
        .eq('day_key', dayKey)
        .maybeSingle();

      const nextAttempt = currentJob ? ((currentJob.attempts || 0) + 1) : 1;

      await db.from('failed_generations').upsert({
        day_key: dayKey,
        attempts: nextAttempt,
        last_attempt: new Date().toISOString(),
        status: 'failed'
      }, { onConflict: 'day_key' });
      console.log(`Failed generation queued for day: ${dayKey}. Attempt: ${nextAttempt}`);
    } catch (queueErr: any) {
      console.error("Failed to queue failed generation:", queueErr.message);
    }

    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
})
