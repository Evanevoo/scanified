import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createTempCustomer() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        CustomerListID: 'TEMP',
        name: 'Temp Customer - Pending Assignment',
        organization_id: null // This will be set by RLS
      });

    if (error) {
      console.error('Error creating temp customer:', error);
    } else {
      console.log('Temp customer created successfully:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

createTempCustomer(); 