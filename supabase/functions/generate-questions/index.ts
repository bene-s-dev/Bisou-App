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
const harmonyDirectionSchema = z.enum(["high", "low"]).describe(
  "Gibt an, ob eine hohe Übereinstimmung der Antworten (high) oder eine geringe/komplementäre Übereinstimmung/Gegensätzlichkeit (low) für eine harmonische Beziehung spricht."
);

const dailyQuestionsSchema = z.object({
  tot: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 50 bis 130 Zeichen"),
    o: z.array(z.string()).length(2).describe("Exakt 2 Optionen für die Entweder-Oder-Frage, Länge jeweils ca. 10 bis 70 Zeichen"),
    hDir: harmonyDirectionSchema
  }),
  ranking: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
    o: z.array(z.string()).length(4).describe("Exakt 4 Optionen, Länge jeweils ca. 10 bis 60 Zeichen"),
    hDir: harmonyDirectionSchema
  }),
  text: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
    o: z.array(z.string()).length(0).describe("Muss ein leeres Array sein"),
    hDir: harmonyDirectionSchema
  }),
  wwe: z.object({
    q: z.string().describe("Die eigentliche Frage, Länge ca. 40 bis 130 Zeichen"),
    o: z.array(z.string()).length(2).describe("Exakt 2 Optionen: ['Ich', 'Partner']"),
    hDir: harmonyDirectionSchema
  })
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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

    // ==========================================================
    // SUNDAY VISUAL PAIR – fetch next unused photo pair
    // ==========================================================
    const ENABLE_VISUAL_QUESTIONS = false; // Set to true to activate photo questions on Sundays
    const dayDate = new Date(dayKey + 'T00:00:00Z');
    const isSunday = dayDate.getUTCDay() === 0;

    let visualPair: any = null;
    if (isSunday && ENABLE_VISUAL_QUESTIONS) {
      const { data: vp } = await db
        .from('visual_questions_pool')
        .select('*')
        .is('used_on', null)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();
      visualPair = vp;
      console.log(visualPair ? `Visual pair found: #${visualPair.order_index} (${visualPair.topic_hint})` : 'No unused visual pair available – using text tot');
    }

    const prompt = `Du bist ein einfühlsamer, kreativer und bodenständiger Fragenautor für eine Pärchen-App. Deine Aufgabe ist es, exakt 4 Fragen für den heutigen Tag zu schreiben.

WICHTIGSTE STRUKTURELLE REGEL (STRENGER AUSSCHLUSS VON DOPPELUNGEN):
Die folgenden Fragen wurden den Nutzern in den letzten 60 Tagen bereits gestellt. Es ist absolut verboten, Fragen zu generieren, die inhaltlich ähnlich, semantisch verwandt oder thematisch überschneidend sind:
--- BEREITS GESTELLTE FRAGEN ---
${ausgeschlosseneFragenText}
--------------------------------

Prüfe jede deiner 4 neu generierten Fragen einzeln gegen die obige Liste:
- Falls in der Liste bereits eine Frage zu einem ähnlichen Thema existiert (z.B. Konflikte, Streitverhalten, Versöhnung, Macken, Geldausgaben, etc.), darfst du KEINE neue Frage stellen, die dieselbe Dynamik behandelt. Weiche stattdessen auf ein anderes Teilthema aus.
- Die neu generierten Fragen müssen sich komplett frisch, neuartig und unverbraucht anfühlen.

Befolge für die 4 heutigen Fragen exakt diese Vorgaben, Fragentypen und Limits:

1. "tot" (Entweder-Oder-Frage):
${visualPair
  ? `   - HEUTE IST SONNTAG – BILD-FRAGE: Die Nutzer sehen heute zwei echte Fotos statt Text-Buttons.
   - Bild A zeigt: "${visualPair.label_a}" | Bild B zeigt: "${visualPair.label_b}"
   - Thema-Kontext: "${visualPair.topic_hint}"
   - Schreibe eine kurze, einladende Frage, die zu diesen beiden Bildern passt (z.B. "Welcher Wohnstil spricht dich eher an?").
   - Die Antwortoptionen MÜSSEN exakt lauten: ["${visualPair.label_a}", "${visualPair.label_b}"] – ändere sie NICHT.
   - Format: Frage ca. 40-100 Zeichen.`
  : `   - Thema: "${themaTot}" (Frage und Optionen müssen sich um dieses Thema drehen).
   - Format: Frage ca. 50-130 Zeichen. Die 2 Optionen jeweils ca. 10-70 Zeichen.`}

2. "ranking" (4 Dinge ordnen/priorisieren):
   - Thema: "${themaRanking}".
   - Format: Frage ca. 40-130 Zeichen. Die 4 Antwortoptionen zum Sortieren jeweils ca. 10-60 Zeichen.

3. "text" (Offene Frage):
   - Thema: "${themaText}".
   - Format: Frage ca. 40-130 Zeichen. Das Antwortoptionen-Array ("o") MUSS leer sein (also []).

4. "wwe" (Wer würde eher-Frage):
   - Thema: "${themaWwe}".
   - Format: Frage ca. 40-130 Zeichen. Die Optionen müssen IMMER exakt ["Ich", "Partner"] sein.

NEU: BEWERTUNG DER KOMPATIBILITÄT (hDir für alle Fragen):
WICHTIG: Entscheide für jede Frage völlig unabhängig und inhaltlich begründet, ob eine hohe Übereinstimmung (Similarity) oder eine geringe Übereinstimmung (Complementarity/Opposites) harmonischer für eine Liebesbeziehung ist. Setze dafür das Feld "hDir" auf einen der folgenden Werte (kopiere keinesfalls einfach Vorgabewerte):
- "high": Hohe Übereinstimmung spricht für Harmonie. Das ist der Standard für gemeinsame Interessen, Werte, Zukunftspläne oder Konsens (z. B. "Derselbe Urlaubsort", "Gleiche Priorität bei der Karriere").
- "low": Eine geringe Übereinstimmung oder Ergänzung (Komplementarität) spricht für Harmonie. Das gilt für komplementäre Rollen (z. B. "Wer kocht vs. wer spült"), gegensätzliche Persönlichkeitsmerkmale, die sich ausgleichen (z. B. "Einer plant, einer ist spontan"), oder spielerische Fragen, bei denen Gegensätze die Beziehung bereichern.

STIMMUNG & TONFALL (SEHR WICHTIG!):
- Schreibe alltagsnahe, nahbare, liebevolle und natürliche Fragen, über die ein echtes Paar abends gerne auf dem Sofa plaudert.
- Vermeide absurde Gedankenexperimente oder allzu abstrakte Rätsel. Die Fragen müssen bodenständig und realistisch sein.
- Variiere die Stimmung zwischen den 4 Fragen: Mache eine eher leicht/humorvoll, eine tiefgründig/reflektiert, eine alltäglich/praktisch und eine neugierig/spielerisch.

METHODE FÜR MULTIPERSPEKTIVISCHE FRAGEN (STRENGSTENS BEFOLGEN):
Vermeide oberflächliche Standardfragen (z.B. nicht "Wer gibt mehr Geld aus?" oder "Wer verträgt sich schneller?"). Beleuchte stattdessen gezielt verschiedene Dimensionen eines Themas:
- **Emotionale Dimension**: Gefühle, Unsicherheiten, Hoffnungen, Werte.
- **Verhaltens-Dimension**: Typische Alltagsreaktionen, kleine Angewohnheiten, Macken.
- **Biografische Dimension**: Prägungen aus der Kindheit, Verhaltensmuster der eigenen Eltern.
- **Zukunftsorientierte Dimension**: Pläne, Wünsche, Träume.

Gute Beispiele für tiefgründige / spezifische Fragen:
* "Welche Spar-Angewohnheit deiner Eltern irritiert dich bis heute?" (Biografisch)
* "Bei welchem Spontankauf für unter 50 Euro fühlst du dich sofort schuldig?" (Emotional)
* "Gibt es ein bestimmtes Wort oder eine Geste deines Partners, die eine hitzige Diskussion sofort abkühlen kann?" (Verhalten)
* "Welcher finanzielle Traum fühlt sich für dich nach purer Freiheit an?" (Zukunftsorientiert)

WICHTIGE VERTEILUNGS-REGELN (GEGEN MONOTONIE):
- **Keine Wiederholung von Dimensionen**: Die 4 heutigen Fragen müssen sich auf völlig unterschiedliche Dimensionen beziehen (z.B. 1x emotional, 1x biografisch, 1x Alltag, 1x Zukunft).
- **Biografische Fragen sparsam**: Maximal 1 der 4 täglichen Fragen darf biografisch sein. Die Mehrheit (70-80%) soll im Hier & Jetzt der Partnerschaft oder der Zukunft stattfinden.`;

    // ==========================================
    // API CALL ZU GEMINI ODER GEMMA MIT THINKING & ZOD
    // ==========================================
    const useGemma = attempts >= 5;
    const modelName = useGemma ? "gemma-4-31b-it" : "gemini-3.5-flash";
    console.log(`Generating questions for ${dayKey} using model: ${modelName} (Attempt: ${attempts})`);

    let promptText = prompt;
    let modelConfig: any = {};

    if (useGemma) {
      promptText += `\n\nAntworte AUSSCHLIESSLICH mit einem validen JSON-Objekt im folgenden Format (keine Erklärungen, kein Markdown-Codeblock, nur das JSON).
WICHTIG: Kopiere nicht stumpf die "hDir"-Werte ("high"/"low") aus diesem Beispiel, sondern entscheide für jede deiner generierten Fragen individuell und inhaltlich begründet, ob "high" oder "low" zutrifft:
{
  "tot": {
    "q": "Eine Frage...",
    "o": ["Option 1", "Option 2"],
    "hDir": "high"
  },
  "ranking": {
    "q": "Eine Frage...",
    "o": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "hDir": "high"
  },
  "text": {
    "q": "Eine Frage...",
    "o": [],
    "hDir": "high"
  },
  "wwe": {
    "q": "Wer würde eher...",
    "o": ["Ich", "Partner"],
    "hDir": "low"
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
            o: item.options || item.o || [],
            hDir: item.hDir || item.hdir || 'high',
            visual: item.visual,
            images: item.images
          };
        }
      }
      rawJson = transformed;
    }
    
    let content: any = dailyQuestionsSchema.parse(rawJson);

    // If Sunday visual pair was used, override tot with image fields & mark as used
    if (visualPair) {
      content = {
        ...content,
        tot: {
          ...content.tot,
          o: [visualPair.label_a, visualPair.label_b], // enforce exact labels
          h: 'Tippe auf das Bild, das dich mehr anspricht.',
          visual: true,
          images: [visualPair.photo_id_a, visualPair.photo_id_b]
        }
      };
      // Mark pair as used (fire-and-forget, don't block response)
      db.from('visual_questions_pool')
        .update({ used_on: dayKey })
        .eq('id', visualPair.id)
        .then(({ error }) => { if (error) console.error('Failed to mark visual pair as used:', error.message); });
    }

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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        if (fetchError) throw fetchError;
      }
      throw insertError;
    }

    // Lösche aus failed_generations Warteschlange bei Erfolg
    try { await db.from('failed_generations').delete().eq('day_key', dayKey); } catch (e) {}

    return new Response(JSON.stringify({ questions: content }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
