import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtfucttzaswmqqhmmhfb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'gas-cylinder-app'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function to handle network errors with retry logic
export const supabaseWithRetry = async (operation, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Supabase operation attempt ${attempt} failed:`, error);
      
      // Check if it's a network error
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('NetworkError') ||
          error.message?.includes('timeout') ||
          error.code === 'NETWORK_ERROR') {
        
        if (attempt === maxRetries) {
          throw new Error(`Network error after ${maxRetries} attempts: ${error.message}`);
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Network error detected, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For non-network errors, don't retry
      throw error;
    }
  }
};
