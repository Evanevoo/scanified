import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ensure session persistence
    persistSession: true,
    // Use localStorage for session storage
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // Auto refresh tokens
    autoRefreshToken: true,
    // Detect session in URL
    detectSessionInUrl: true,
    // Disable security features that might trigger captcha
    flowType: 'implicit', // Use implicit flow instead of PKCE
    // Disable additional security checks
    debug: false,
    // Ensure no verification challenges
    verify: false
  },
  // Global headers
  global: {
    headers: {
      'X-Client-Info': 'scanified-app'
    }
  }
}); 