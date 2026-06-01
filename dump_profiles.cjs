const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://odsghowxbgqnfsyjstcb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kc2dob3d4YmdxbmZzeWpzdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Njk1MTMsImV4cCI6MjA5NDQ0NTUxM30.-3ns3ckkDcBClXix43lek-TKehfv_THqYsqkvGUf1HU'
);

async function main() {
  const { data: profiles, error: err1 } = await supabase.from('profiles').select('*');
  console.log('--- PROFILES ---');
  console.log(profiles);

  const { data: streaks, error: err2 } = await supabase.from('streaks').select('*');
  console.log('--- STREAKS ---');
  console.log(streaks);
}

main();
