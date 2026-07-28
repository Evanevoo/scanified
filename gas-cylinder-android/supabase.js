import { createClient } from '@supabase/supabase-js';

/**
 * Legacy JS entry — prefer supabase.ts (reads Expo extra / env).
 * Keys must come from environment; never hardcode anon keys in git.
 */
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase.js] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (or VITE_* equivalents).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
