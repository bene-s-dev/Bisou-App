import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenAI, ThinkingLevel } from "npm:@google/genai"
import { z } from "npm:zod"
import { zodToJsonSchema } from "npm:zod-to-json-schema"

// ==========================================
// ZOD-SCHEMA FÜR STRUKTURIERTE AUSGABE
// ==========================================
const questionBaseSchema = z.object({
  q: z.string().describe("Die eigentliche Frage"),
  h: z.string().describe("Ein kurzer, passender Hilfstext"),
});

const dailyQuestionsSchema = z.object({
  tot: questionBaseSchema.extend({
    o: z.array(z.string()).length(2).describe("Exakt 2 Optionen für die Entweder-Oder-Frage")
  }),
  ranking: questionBaseSchema.extend({
    o: z.array(z.string().max(70)).length(4).describe("Exakt 4 Optionen, jede Option darf maximal 70 Zeichen lang sein")
  }),
  text: questionBaseSchema.extend({
    o: z.array(z.string()).length(0).describe("Muss ein leeres Array sein")
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
      ['Romantik', 'Finanzen', 'Alltagsmacken'], // Tag 1
      ['Streitkultur', 'Popkultur', 'Zukunftsplanung'], // Tag 2
      ['Kindheitserinnerungen', 'Haushaltspflichten', 'Geheimnisse'], // Tag 3
      ['Intimität', 'Fernreisen', 'Philosophische Fragen'], // Tag 4
      ['Familie', 'Karrierewege', 'Moralvorstellungen'], // Tag 5
      ['Selbsterkenntnis', 'Kochen', 'Persönliche Ängste'], // Tag 6
      ['Vertrauen', 'Absurde Was-wäre-wenn-Szenarien', 'Sehnsüchte'], // Tag 7
      ['Flirtverhalten', 'Große Investitionen', 'Macken des Partners'], // Tag 8
      ['Versöhnung', 'Musikgeschmack', 'Wohnen'], // Tag 9
      ['Jugendjahre', 'Freizeitgestaltung', 'Tabuthemen'], // Tag 10
      ['Körperliche Zärtlichkeit', 'Mikro-Abenteuer', 'Gesellschaftstrends'], // Tag 11
      ['Freundeskreis', 'Work-Life-Balance', 'Lebenssinn'], // Tag 12
      ['Mentale Gesundheit', 'Kulinarik', 'Innere Unsicherheiten'], // Tag 13
      ['Emotionale Meilensteine', 'Humor', 'Zukunftswünsche'], // Tag 14
      ['Erste Verliebtheitsphase', 'Konsumverhalten', 'Morgenroutinen'], // Tag 15
      ['Konfliktvermeidung', 'Filmgeschmack', 'Rollenverteilung'], // Tag 16
      ['Schulerinnerungen', 'Haustiere', 'Peinliche Momente'], // Tag 17
      ['Körperliche Nähe', 'Wochenendgestaltung', 'Kultur'], // Tag 18
      ['Schwiegerfamilie', 'Stressbewältigung', 'Gerechtigkeitsempfinden'], // Tag 19
      ['Charakterzüge', 'Lieblingsgerichte', 'Zukunft der Welt'], // Tag 20
      ['Bindungsdynamiken', 'Kreative Hobbys', 'Existenzielle Fragen'], // Tag 21
      ['Liebesbeweise', 'Umgang mit Erbschaften', 'Abendrituale'], // Tag 22
      ['Missverständnisse', 'Serienvorlieben', 'Raumaufteilung'], // Tag 23
      ['Erziehungsvorstellungen', 'Sport', 'Nostalgie'], // Tag 24
      ['Romantische Gesten', 'Ausflugsziele', 'Große Lebensentscheidungen'], // Tag 25
      ['Alte Freundschaften', 'Jobzufriedenheit', 'Glaubensfragen'], // Tag 26
      ['Achtsamkeit', 'Lieblingssnacks', 'Kindheitsängste'], // Tag 27
      ['Eifersucht', 'Gaming', 'Das perfekte Zuhause'], // Tag 28
      ['Liebeserklärungen', 'Versicherungen', 'Social-Media-Konsum'], // Tag 29
      ['Kompromissbereitschaft', 'Konzerte', 'Lebenslanges Lernen'] // Tag 30
    ];

    const todaysThemes = themeSets[dayOfYear % themeSets.length];
    const [themaTot, themaRanking, themaText] = todaysThemes;

    // ==========================================
    // KOMPRIMIERTER PROMPT
    // ==========================================
    const prompt = `Du bist ein kreativer Spieleentwickler für die Beziehungs-App (Bisou). Generiere exakt 3 Fragen.

WICHTIG: Folgende Fragen wurden den Nutzern in den letzten 60 Tagen gestellt. Generiere NIEMALS Fragen, die inhaltlich ähnlich oder semantisch identisch sind:
${ausgeschlosseneFragenText}

Um maximale Abwechslung zu garantieren, befolge für den heutigen Tag exakt diese Themen-Vorgaben:
1. "tot" Frage (Entweder-Oder): Thema muss "${themaTot}" sein.
2. "ranking" Frage (4 Dinge ordnen): Thema muss "${themaRanking}" sein.
3. "text" Frage (Offene Frage): Thema muss "${themaText}" sein.

STIMMUNG & PERSPEKTIVE (WICHTIG!):
Die drei Fragen dürfen sich niemals ähnlich anfühlen. Nutze dein logisches Denken (Thinking), um die Stimmung extrem stark zu variieren. Mache eine Frage eher leicht/humorvoll, eine sehr tiefgründig/reflektiert und eine extrem alltäglich/praktisch. Wechsle auch die Erzählwinkel (z.B. ein hypothetisches Szenario vs. ein ganz kleines Alltagsdetail).`;

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
        responseFormat: { 
          text: { 
            mimeType: "application/json", 
            schema: zodToJsonSchema(dailyQuestionsSchema) 
          } 
        },
        temperature: 1.1 // Hohe Temperatur für mehr Kreativität innerhalb der Vorgaben
      }
    });

    if (!response.text) {
       throw new Error("Gemini lieferte keine Inhalte zurück.");
    }

    // JSON parsen und durch Zod absichern
    const rawJson = JSON.parse(response.text);
    const content = dailyQuestionsSchema.parse(rawJson);

    // ==========================================
    // IN DATENBANK SPEICHERN
    // ==========================================
    const { error: insertError } = await db.from('daily_questions').insert({ 
      day_key: dayKey, 
      questions: content 
    })

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ questions: content }), { 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (err: any) {
    console.error("Function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
})
