import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jtfucttzaswmqqhmmhfb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30.6-CAPYefAektlh3dLRVFZbPKYSnhIAzp3knohc3NDEg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
