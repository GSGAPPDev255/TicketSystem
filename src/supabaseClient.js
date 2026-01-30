import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lymvqysstxblkapkxylm.supabase.co';
// The "Legacy Anon" key - This is the correct one for 401 errors
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXZxeXNzdHhibGthcGt4eWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2OTg2MjksImV4cCI6MjA4NTI3NDYyOX0.CXl-ffV4alT2z68acAHo0cOYXdHEPQp2fu8fdX1L1X0';

export const supabase = createClient(supabaseUrl, supabaseKey);
