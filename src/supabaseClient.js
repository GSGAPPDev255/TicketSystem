import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lymvqysstxblkapkxylm.supabase.co';
const supabaseKey = 'sb_publishable_nDRmNxdsXZw1Cn4m2lapgQ_mz7zUwZ9';

export const supabase = createClient(supabaseUrl, supabaseKey);
