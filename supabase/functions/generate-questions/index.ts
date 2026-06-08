import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const k = Deno.env.get('GEMINI_API_KEY') || ''
  const u = Deno.env.get('SUPABASE_URL') || ''
  const s = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const db = createClient(u, s)
  
  // Get dayKey from request body or fallback to current UTC date
  let dayKey;
  try {
    const body = await req.json();
    dayKey = body.day_key || body.dayKey;
  } catch (e) {
    // Fallback if no body or invalid JSON
  }
  
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

    // 2. Prompt Gemini for the 3 daily questions
    const prompt = `Generiere 3 absolut abwechslungsreiche und einzigartige Fragen für eine Beziehungs-App (Bisou) im Format JSON.
    WICHTIG: Damit die Fragen nicht immer gleich sind, wähle für JEDE der 3 Fragen zufällig EINES der folgenden Themengebiete aus:
   
    - Kindheitserinnerungen 
    - Familie
    - Intimität & Zärtlichkeit 
    - Romantik
    - Finanzen
    - Karriere
    - Zukunftsplanung
    - Hobbys
    - Urlaub
    - Freizeit
    - Philosophische Fragen
    - Moral & Werte
    - Streiten, Verzeihen                     
    - Persönlichkeitsentwicklung
    - Popkultur 
    - Filme
    - Musik
    - Essen
    - Gemeinsamer Haushalt
    - Träume
    - Ängste
    - Geheimnisse
    
    Achte darauf, dass die Themengebiete für jede der drei Fragen stark unterschiedlich sind. Sei kreativ, nutze keine Standardfragen!

    Das Format MUSS exakt so aussehen:
    {
      "tot": { 
        "q": "Eine Entweder-Oder Frage (aus einem der Themengebiete)", 
        "h": "Ein kurzer, passender Hilfstext", 
        "o": ["Option A", "Option B"] 
      },
      "ranking": { 
        "q": "Eine Frage bei der 4 Dinge geordnet werden müssen (aus einem der Themengebiete)", 
        "h": "Ein kurzer, passender Hilfstext", 
        "o": ["Ding 1", "Ding 2", "Ding 3", "Ding 4"] 
      },
      "text": { 
        "q": "Eine offene Frage, die mit Text beantwortet wird (aus einem der Themengebiete)", 
        "h": "Ein kurzer, passender Hilfstext", 
        "o": [] 
      }
    }
    
    Sprache: Deutsch. Wichtig: Gib NUR das pure JSON-Objekt ohne Markierungen zurück.`

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
