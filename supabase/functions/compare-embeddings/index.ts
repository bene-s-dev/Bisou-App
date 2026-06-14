import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai"

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
    const k = Deno.env.get('GEMINI_API_KEY') || ''
    if (!k) {
      throw new Error("GEMINI_API_KEY not configured on server")
    }

    const body = await req.json()
    const { pairs, model: requestedModel } = body
    const embeddingModel = requestedModel || 'gemini-embedding-001'

    if (!pairs || !Array.isArray(pairs)) {
      return new Response(
        JSON.stringify({ error: 'pairs array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Gather all unique non-trivial texts that we need embeddings for
    const uniqueTexts = new Set<string>()
    for (const pair of pairs) {
      const t1 = String(pair.text1 || '').trim()
      const t2 = String(pair.text2 || '').trim()
      if (t1 && t2 && t1 !== t2) {
        uniqueTexts.add(t1)
        uniqueTexts.add(t2)
      }
    }

    // 2. Fetch embeddings in parallel for all unique texts
    const ai = new GoogleGenAI({ apiKey: k });
    const textToVectorMap = new Map<string, number[]>()
 
    if (uniqueTexts.size > 0) {
      const textList = Array.from(uniqueTexts)
      await Promise.all(
        textList.map(async (text) => {
          try {
            const response = await ai.models.embedContent({
              model: embeddingModel,
              contents: text,
            })
            const vector = response.embedding?.values || response.embeddings?.[0]?.values
            if (vector && Array.isArray(vector)) {
              textToVectorMap.set(text, vector)
            }
          } catch (e: any) {
            console.error(`Error generating embedding for "${text}":`, e.message)
          }
        })
      )
    }
 
    // 3. Compute similarities for all pairs
    const results = pairs.map((pair) => {
      const t1 = String(pair.text1 || '').trim()
      const t2 = String(pair.text2 || '').trim()
 
      if (!t1 || !t2) {
        return { day_key: pair.day_key, similarity: 0 }
      }
 
      if (t1 === t2) {
        return { day_key: pair.day_key, similarity: 100 }
      }
 
      const v1 = textToVectorMap.get(t1)
      const v2 = textToVectorMap.get(t2)
 
      if (!v1 || !v2) {
        // If we failed to get embedding, default to fallback check
        // (e.g. word overlap or exact comparison)
        return { day_key: pair.day_key, similarity: 0 }
      }
 
      const rawSimilarity = cosineSimilarity(v1, v2)
      // Standard cosine similarity ranges from -1 to 1, but for text embeddings it's almost always > 0.
      // We scale it from 0 to 100
      const percent = Math.max(0, Math.min(100, rawSimilarity * 100))
      return { day_key: pair.day_key, similarity: Math.round(percent * 10) / 10 }
    })
 
    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error("Embedding comparison function error:", err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
