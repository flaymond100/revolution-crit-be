import { createClient, SupabaseClient } from '@supabase/supabase-js'; // typed

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
}

console.log(
  'Supabase config:',
  supabaseServiceKey
    ? '✓ service role key loaded (server writes will bypass RLS)'
    : '⚠ service role key MISSING — falling back to anon key (writes will fail RLS)'
);

// Public client — respects Row Level Security
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Service client — bypasses RLS, used for server-side writes (webhooks, registrations)
const supabaseService: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export { supabase, supabaseService };
