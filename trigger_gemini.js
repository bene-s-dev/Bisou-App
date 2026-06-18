import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://odsghowxbgqnfsyjstcb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc2dob3d4YmdxbmZzeWpzdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1MTMsImV4cCI6MjA5NDQ0NTUxM30.-3ns3ckkDcBClXix43lek-TKehfv_THqYsqkvGUf1HU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const daysToGenerate = ['2026-06-20', '2026-06-21'];

async function triggerAll() {
  for (const dayKey of daysToGenerate) {
    console.log(`\n--- Triggering question generation with Gemini for day_key: ${dayKey} ---`);
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: { day_key: dayKey }
      });

      if (error) {
        console.error(`Error triggering for ${dayKey}:`, error);
        if (error.context) {
          try {
            const errText = await error.context.text();
            console.error(`Error response body:`, errText);
          } catch (e) {}
        }
      } else {
        console.log(`Success for ${dayKey}:`);
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.error(`Exception during invoke for ${dayKey}:`, e);
    }
  }
}

triggerAll();
