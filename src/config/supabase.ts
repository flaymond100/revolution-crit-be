import { createClient, SupabaseClient } from '@supabase/supabase-js'; // typed

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
}

// Public client - uses anon key and respects Row Level Security
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey); // typed

export { supabase }; // typed
