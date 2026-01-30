import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lymvqysstxblkapkxylm.supabase.co';
const supabaseKey = 'sb_publishable_nDRmNxdsXZw1Cn4m2lapgQ_mz7zUwZ9';

// --- DEBUGGING TRACER ---
// This will prove if the new code is deployed.
console.log("%c CORP-TICKET DEBUG ", "background: #222; color: #bada55");
console.log("1. Supabase Client Initializing...");
console.log("2. Key used:", supabaseKey);
console.log("3. Key Length:", supabaseKey.length);
// ------------------------

export const supabase = createClient(supabaseUrl, supabaseKey);
