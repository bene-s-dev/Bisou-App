import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Helper-Funktion zum echten, zufälligen Durchmischen (Fisher-Yates Shuffle)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

serve(async (req) => {
  const k = Deno.env.get('GEMINI_API_KEY') || ''
  const u = Deno.env.get('SUPABASE_URL') || ''
  const s = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const db = createClient(u, s)
  
  let dayKey;
  try {
    const body = await req.json();
    dayKey = body.day_key || body.dayKey;
  } catch (e) {}
  
  if (!dayKey) {
    dayKey = new Date().toISOString().split('T')[0];
  }

  try {
    // 1. Check if questions already exist for today
    const { data: ex } = await db.from('daily_questions').select('questions').eq('day_key', dayKey).maybeSingle()
    if (ex) {
      return new Response(JSON.stringify(ex), { 
        headers: { 'Content-Type': 'application/json' } 
      })
    }

    // ==========================================================
    // LOGIK FÜR MAXIMALE TÄGLICHE VARIANZ (ALLE THEMEN GEÖFFNET)
    // ==========================================================
    
    // Alle 22 Themen in einem einzigen großen Pool
    const alleThemen = [
      'Kindheitserinnerungen', 'Familie', 'Intimität & Zärtlichkeit', 'Romantik', 
      'Philosophische Fragen', 'Moral & Werte', 'Streiten & Verzeihen', 
      'Persönlichkeitsentwicklung', 'Träume', 'Ängste', 'Geheimnisse',
      'Finanzen', 'Karriere', 'Zukunftsplanung', 'Hobbys', 'Urlaub', 
      'Freizeit', 'Popkultur', 'Filme', 'Musik', 'Essen', 'Gemeinsamer Haushalt'
    ];

    // Den gesamten Pool komplett durchmischen und 3 einzigartige Themen ziehen
    const gemischteThemen = shuffleArray(alleThemen);
    const themaTot = gemischteThemen[0];
    const themaRanking = gemischteThemen[1];
    const themaText = gemischteThemen[2];

    // Stimmungen definieren und komplett durchmischen
    const stimmungX = 'Leicht, humorvoll, locker oder unterhaltsam';
    const stimmungY = 'Praktisch, alltagsnah oder prioritätenorientiert';
    const stimmungZ = 'Tiefgründig, reflektiert oder emotional verbindend';

    const gemischteStimmungen = shuffleArray([stimmungX, stimmungY, stimmungZ]);
    const stimmungTot = gemischteStimmungen[0];
    const stimmungRanking = gemischteStimmungen[1];
    const stimmungText = gemischteStimmungen[2];

    // Erzählwinkel/Perspektiven definieren (bereits bereinigt) und durchmischen
    const perspektiven = [
      'Fokus auf ein hypothetisches "Was-wäre-wenn"-Szenario',
      'Fokus auf ganz kleine, unscheinbare Details im Alltag',
      'Bezug zu langfristigen, zukünftigen Wünschen oder Zielen',
      'Fokus auf eine unvorhersehbare Zwickmühle',
      'Reflektion über emotionale Nähe, Vertrauen und Gefühle',
      'Ein spielerischer Blick auf Macken, Angewohnheiten oder Marotten'
    ];
    
    const gemischtePerspektiven = shuffleArray(perspektiven);
    const winkelTot = gemischtePerspektiven[0];
    const winkelRanking = gemischtePerspektiven[1];
    const winkelText = gemischtePerspektiven[2];

    // ==========================================
    // PROMPT MIT ECHTEM TÄGLICHEN ZUFALLS-MIX
    // ==========================================
    const prompt = `Du bist ein creative Spieleentwickler für die Beziehungs-App (Bisou). Deine Aufgabe ist es, exakt 3 abwechslungsreiche Fragen im JSON-Format zu generieren.

Um absolute Einzigartigkeit zu garantieren und Wiederholungen zu vermeiden, wurden dir die Rahmenbedingungen für heute fest zugeteilt. Weiche nicht davon ab!

DEINE VORGABEN FÜR HEUTE:
1. Für die "tot" Frage (Entweder-Oder):
   - Thema: ${themaTot}
   - Stimmung: ${stimmungTot}
   - Erzählwinkel/Fokus: ${winkelTot}

2. Für die "ranking" Frage (4 Dinge ordnen):
   - Thema: ${themaRanking}
   - Stimmung: ${stimmungRanking}
   - Erzählwinkel/Fokus: ${winkelRanking}
   - WICHTIG: Jedes der 4 Elemente im Array "o" darf MAXIMAL 70 Zeichen lang sein! Eine strikte UI-Vorgabe.

3. Für die "text" Frage (Offene Frage):
   - Thema: ${themaText}
   - Stimmung: ${stimmungText}
   - Erzählwinkel/Fokus: ${winkelText}

HINWEIS: Klassische und bewährte Beziehungsfragen sind absolut willkommen! Nutze den vorgegebenen Erzählwinkel und die Stimmung, um die Frage so zu formen, dass sie frisch, individuell und unverbraucht wirkt.

Das Format MUSS exakt so aussehen:
{
  "tot": { 
    "q": "Die Entweder-Oder Frage", 
    "h": "Ein kurzer, passender Hilfstext", 
    "o": ["Option A", "Option B"] 
  },
  "ranking": { 
    "q": "Die Ranking-Frage", 
    "h": "Ein kurzer, passender Hilfstext", 
    "o": ["Kurzes Ding 1 (max. 70 Zeichen)", "Kurzes Ding 2 (max. 70 Zeichen)", "Kurzes Ding 3 (max. 70 Zeichen)", "Kurzes Ding 4 (max. 70 Zeichen)"] 
  },
  "text": { 
    "q": "Die offene Frage", 
    "h": "Ein kurzer, passender Hilfstext", 
    "o": [] 
  }
}

Sprache: Deutsch. Wichtig: Gib NUR das pure JSON-Objekt ohne Markdown-Formatierung (\`\`\`json ...) zurück.`;

    // 2. Prompt Gemini for the 3 daily questions
    const api = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + k

    const geminiRes = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          response_mime_type: 'application/json',
          temperature: 1.1
        }
      })
    })

    const json = await geminiRes.json()
    
    if (!geminiRes.ok) {
       console.error("Gemini API Error:", json);
       throw new Error(`Gemini API Fehler (${geminiRes.status}): ${json.error?.message || JSON.stringify(json)}`);
    }
    
    if (!json.candidates?.[0]?.content?.parts?.[0]?.text) {
       console.error("Gemini Empty Response:", json);
       throw new Error("Gemini lieferte keine Inhalte zurück.");
    }

    const content = JSON.parse(json.candidates[0].content.parts[0].text)

    // 3. Insert the newly generated questions into the database
    const { error: insertError } = await db.from('daily_questions').insert({ 
      day_key: dayKey, 
      questions: content 
    })
    
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ questions: content }), { 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (err) {
    console.error("Function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
})
