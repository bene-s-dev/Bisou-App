import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenAI, ThinkingLevel } from "npm:@google/genai"
import { z } from "npm:zod"
import { zodToJsonSchema } from "npm:zod-to-json-schema"
import { themeSets } from "./themeSets.ts"

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?/i, '');
    cleaned = cleaned.replace(/```$/, '');
  }
  return cleaned.trim();
}

// ==========================================
// ZOD-SCHEMA FÜR STRUKTURIERTE AUSGABE
// ==========================================
const dailyQuestionsSchema = z.object({
  tot: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 50 bis 130 Zeichen"),
    o: z.array(z.string()).length(2).describe("Exakt 2 Optionen für die Entweder-Oder-Frage, Länge jeweils ca. 10 bis 70 Zeichen")
  }),
  ranking: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
    o: z.array(z.string()).length(4).describe("Exakt 4 Optionen, Länge jeweils ca. 10 bis 60 Zeichen")
  }),
  text: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
    o: z.array(z.string()).length(0).describe("Muss ein leeres Array sein")
  }),
  wwe: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
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
  let rawResponseText = "";
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
      try { await db.from('failed_generations').delete().eq('day_key', dayKey); } catch (e) {}
      return new Response(JSON.stringify(ex), { 
        headers: { 'Content-Type': 'application/json' } 
      })
    }

    // Check how many attempts have been recorded for this dayKey
    let attempts = 0;
    try {
      const { data: currentJob } = await db
        .from('failed_generations')
        .select('attempts')
        .eq('day_key', dayKey)
        .maybeSingle();
      if (currentJob) {
        attempts = currentJob.attempts || 0;
      }
    } catch (e) {
      console.warn("Could not fetch attempts from failed_generations:", e.message);
    }

    // ==========================================================
    // HISTORIE AUS SUPABASE LADEN (Letzte 60 Tage vor dayKey + alle zukünftigen)
    // ==========================================================
    const targetDate = new Date(dayKey);
    const pastDateObj = new Date(targetDate);
    pastDateObj.setUTCDate(pastDateObj.getUTCDate() - 60);
    const pastDateStr = pastDateObj.toISOString().split('T')[0];

    const { data: historie } = await db
      .from('daily_questions')
      .select('questions')
      .neq('day_key', dayKey)
      .gte('day_key', pastDateStr);

    const bisherigeFragen: string[] = [];
    if (historie && Array.isArray(historie)) {
      historie.forEach(row => {
        if (row.questions) {
          if (row.questions.tot?.q) bisherigeFragen.push(`- ${row.questions.tot.q}`);
          if (row.questions.ranking?.q) bisherigeFragen.push(`- ${row.questions.ranking.q}`);
          if (row.questions.text?.q) bisherigeFragen.push(`- ${row.questions.text.q}`);
          if (row.questions.wwe?.q) bisherigeFragen.push(`- ${row.questions.wwe.q}`);
        }
      });
    }

    const ausgeschlosseneFragenText = bisherigeFragen.length > 0 
      ? bisherigeFragen.join('\n') 
      : 'Keine (das ist einer der ersten Durchläufe)';

    console.log(`Found ${bisherigeFragen.length} historical questions to exclude.`);

    // ==========================================================
    // DETERMINISTISCHE 300-TAGE-ROTATION (1200 völlig isolierte, hochspezifische Themen)
    // ==========================================================
    const dateObj = new Date(dayKey);
    const year = dateObj.getUTCFullYear();
    const startOfYear = Date.UTC(year, 0, 0);
    const diff = dateObj.getTime() - startOfYear;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    const todaysThemes = themeSets[dayOfYear % themeSets.length];
    const [themaTot, themaRanking, themaText, themaWwe] = todaysThemes;

    const prompt = `Du bist ein einfühlsamer, kreativer und bodenständiger Fragenautor für eine Pärchen-App. Deine Aufgabe ist es, exakt 4 Fragen für den heutigen Tag zu schreiben.

WICHTIGSTE STRUKTURELLE REGEL (STRENGER AUSSCHLUSS VON DOPPELUNGEN):
Die folgenden Fragen wurden den Nutzern in den letzten 60 Tagen bereits gestellt. Es ist absolut verboten, Fragen zu generieren, die inhaltlich ähnlich, semantisch verwandt oder thematisch überschneidend sind:
--- BEREITS GESTELLTE FRAGEN ---
${ausgeschlosseneFragenText}
--------------------------------

Prüfe jede deiner 4 neu generierten Fragen einzeln gegen die obige Liste:
- Falls in der Liste bereits eine Frage zu einem ähnlichen Thema existiert (z.B. Konflikte, Streitverhalten, Versöhnung, Macken des Partners, Geldausgaben, etc.), darfst du KEINE neue Frage stellen, die dasselbe Kernproblem, denselben Auslöser oder dieselbe Dynamik behandelt. Weiche stattdessen auf ein völlig anderes Teilthema oder eine andere Perspektive aus.
- Die neu generierten Fragen müssen sich komplett frisch, neuartig und unverbraucht anfühlen.

Um maximale Abwechslung zu garantieren, befolge für die 4 heutigen Fragen exakt diese Themen-Vorgaben, Fragentypen und Zeichenlimits:

1. "tot" (Entweder-Oder-Frage):
   - Thema: "${themaTot}" (Die Frage und die beiden Antwortoptionen müssen sich um dieses Thema drehen).
   - Format: Frage ca. 50-130 Zeichen. Die 2 Antwortoptionen sollen jeweils ca. 10-70 Zeichen lang sein.

2. "ranking" (4 Dinge ordnen/priorisieren):
   - Thema: "${themaRanking}" (Die Frage und alle 4 Antwortoptionen müssen zu diesem Thema passen).
   - Format: Frage ca. 40-130 Zeichen. Die 4 Antwortoptionen zum Sortieren sollen jeweils ca. 10-60 Zeichen lang sein.

3. "text" (Offene Frage):
   - Thema: "${themaText}" (Die offene Frage muss sich auf dieses Thema beziehen).
   - Format: Frage ca. 40-130 Zeichen. Das Antwortoptionen-Array ("o") MUSS leer sein (also []).

4. "wwe" (Wer würde eher-Frage):
   - Thema: "${themaWwe}" (Die "Wer würde eher"-Situation muss zu diesem Thema passen).
   - Format: Frage ca. 40-130 Zeichen. Die Antwortoptionen müssen IMMER exakt ["Ich", "Partner"] sein.

STIMMUNG & TONFALL (SEHR WICHTIG!):
- Schreibe alltagsnahe, nahbare, liebevolle und natürliche Fragen, über die ein echtes Paar abends gerne auf dem Sofa plaudert.
- Jede Frage muss im Kontext einer Liebesbeziehung stehen und einen echten Gesprächsimpuls für die Partner bieten.
- Vermeide absurde Gedankenexperimente, bizarre hypothetische Szenarien oder allzu abstrakte philosophische Rätsel. Die Fragen müssen bodenständig und realistisch sein.
- Variiere die Stimmung zwischen den 4 Fragen: Mache eine eher leicht/humorvoll, eine tiefgründig/reflektiert, eine alltäglich/praktisch und eine neugierig/spielerisch.

METHODE FÜR MULTIPERSPEKTIVISCHE FRAGEN (STRENGSTENS BEFOLGEN):
Wenn ein Thema (wie z. B. "Streitkultur", "Romantik", "Finanzen") breit oder unvollständig definiert ist, darfst du dich NICHT auf die naheliegendste Standardfrage verlassen. Beleuchte stattdessen gezielt verschiedene Dimensionen des Themas:
- **Die emotionale Dimension**: Gefühle, Unsicherheiten, Hoffnungen, Werte.
- **Die Verhaltens-Dimension**: Typische Alltagsreaktionen, kleine Angewohnheiten, Macken.
- **Die biografische Dimension**: Prägungen aus der Kindheit, Verhaltensmuster der eigenen Eltern.
- **Die zukunftsorientierte Dimension**: Pläne, Wünsche, Träume, hypothetische Weiterentwicklungen.

Beispiel für ein Thema wie "Finanzen":
*Schlecht (generisch)*: "Wer von euch gibt mehr Geld aus?"
*Gut (spezifisch/mehrdimensional)*:
  - "Welche Spar-Angewohnheit deiner Eltern irritiert dich bis heute?" (Biografisch)
  - "Bei welchem Spontankauf für unter 50 Euro fühlst du dich sofort schuldig?" (Emotional)
  - "Welcher finanzielle Traum fühlt sich für dich nach purer Freiheit an?" (Zukunftsorientiert)

Beispiel für ein Thema wie "Streitkultur":
*Schlecht (generisch)*: "Wer verträgt sich nach einem Streit schneller?"
*Gut (spezifisch/mehrdimensional)*:
  - "Gibt es ein bestimmtes Wort oder eine Geste deines Partners, die eine hitzige Diskussion sofort abkühlen kann?" (Verhalten/Praktisch)
  - "Wie wurde in deiner Familie gestritten, als du ein Kind warst – eher laut oder schweigend?" (Biografisch)
  - "Welcher Gedanke hilft dir am meisten, wenn wir uns mal nicht einig werden?" (Emotional)

WICHTIGE VERTEILUNGS-REGELN (GEGEN MONOTONIE):
- **Keine Wiederholung von Dimensionen an einem Tag**: Die 4 heutigen Fragen müssen sich auf völlig unterschiedliche Dimensionen beziehen (z.B. 1x emotional, 1x biografisch, 1x spielerisch/Alltag, 1x Zukunft). Erzeuge niemals am selben Tag mehrere biografische Fragen (wie Kindheit/Familie) oder mehrere schwere emotionale Fragen.
- **Biografische Fragen sparsam einsetzen**: Fragen zu Kindheit, Eltern oder früheren Beziehungen sind spannend, sollten aber maximal 1 der 4 täglichen Fragen ausmachen und nicht an jedem Tag vorkommen. Die Mehrheit der Fragen (ca. 70-80%) soll im Hier und Jetzt der Partnerschaft, der gemeinsamen Zukunft oder auf einer humorvollen/spielerischen Ebene stattfinden.
- **Natürliche Variation**: Wechsle die Perspektive von Tag zu Tag. Wenn gestern über die Kindheit gesprochen wurde, soll heute der Fokus auf einer witzigen Alltagsgewohnheit oder einem Zukunftstraum liegen.

Wende diese mehrdimensionale Denkweise und Verteilungs-Regeln konsequent auf jedes Thema an, um tiefe, aber ausgewogene und abwechslungsreiche Einblicke zu schaffen!`;

    // ==========================================
    // API CALL ZU GEMINI ODER GEMMA MIT THINKING & ZOD
    // ==========================================
    const useGemma = attempts >= 5;
    const modelName = useGemma ? "gemma-4-31b-it" : "gemini-3.5-flash";
    console.log(`Generating questions for ${dayKey} using model: ${modelName} (Attempt: ${attempts})`);

    let promptText = prompt;
    let modelConfig: any = {};

    if (useGemma) {
      promptText += `\n\nAntworte AUSSCHLIESSLICH mit einem validen JSON-Objekt im folgenden Format (keine Erklärungen, kein Markdown-Codeblock, nur das JSON):
{
  "tot": {
    "q": "Eine Frage...",
    "o": ["Option 1", "Option 2"]
  },
  "ranking": {
    "q": "Eine Frage...",
    "o": ["Option 1", "Option 2", "Option 3", "Option 4"]
  },
  "text": {
    "q": "Eine Frage...",
    "o": []
  },
  "wwe": {
    "q": "Wer würde eher...",
    "o": ["Ich", "Partner"]
  }
}`;
      modelConfig = {
        temperature: 0.7
      };
    } else {
      modelConfig = {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(dailyQuestionsSchema),
        temperature: 1.0,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        }
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: modelConfig
    });

    if (!response.text) {
       throw new Error("Gemini lieferte keine Inhalte zurück.");
    }

    rawResponseText = response.text;
    console.log("Raw AI response text:", rawResponseText);

    // JSON parsen und durch Zod absichern
    let rawJson = JSON.parse(cleanJsonString(rawResponseText));
    
    // Gemini returns array of [{type, question, options}] — transform to expected {tot:{q,h,o}, ...}
    if (Array.isArray(rawJson)) {
      const transformed: any = {};
      for (const item of rawJson) {
        const key = item.type || item.t; // 'tot', 'ranking', 'text', 'wwe'
        if (key) {
          transformed[key] = {
            q: item.question || item.q || '',
            o: item.options || item.o || []
          };
        }
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
    try { await db.from('failed_generations').delete().eq('day_key', dayKey); } catch (e) {}

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

    return new Response(JSON.stringify({ 
      error: err.message,
      rawResponseText: rawResponseText
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
})
