import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration at startup
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure session persistence
    persistSession: true,
    // Use localStorage for session storage
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Auto refresh tokens
    autoRefreshToken: true,
    // Detect session in URL (needed for OAuth callbacks)
    detectSessionInUrl: true,
    // Use PKCE flow for better security (prevents authorization code interception attacks)
    flowType: 'pkce',
    // Disable debug mode in production
    debug: import.meta.env.DEV,
  },
  // Global headers
  global: {
    headers: {
      'X-Client-Info': 'scanified-web-app'
    }
  }
});
