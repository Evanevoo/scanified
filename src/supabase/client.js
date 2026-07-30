import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const authOptions = {
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
    // Always off in shipped builds (import.meta.env.DEV was incorrectly true in prod bundles).
    debug: false,
  },
  // Global headers
  global: {
    headers: {
      'X-Client-Info': 'scanified-web-app'
    }
  }
};

/**
 * Never throw during module init — a missing VITE_* build env blanks the entire SPA
 * (including the marketing homepage). Callers still get a usable client shape.
 */
function createConfiguredClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.'
    );
    const err = () =>
      Promise.reject(
        new Error(
          'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for this build.'
        )
      );
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'auth') {
            return new Proxy(
              {},
              {
                get(_a, authProp) {
                  if (authProp === 'onAuthStateChange') {
                    return () => ({ data: { subscription: { unsubscribe() {} } } });
                  }
                  if (authProp === 'getSession') {
                    return () => Promise.resolve({ data: { session: null }, error: null });
                  }
                  if (authProp === 'getUser') {
                    return () => Promise.resolve({ data: { user: null }, error: null });
                  }
                  return err;
                },
              }
            );
          }
          if (prop === 'from' || prop === 'rpc' || prop === 'functions' || prop === 'storage') {
            return () =>
              new Proxy(
                {},
                {
                  get: () => err,
                }
              );
          }
          return err;
        },
      }
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, authOptions);
}

export const supabase = createConfiguredClient();
