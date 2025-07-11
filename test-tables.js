import { createClient } from '@supabase/supabase-js';

// Get environment variables from the .env file or use defaults
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jtfucttzaswmqqhmmhfb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTables() {
  try {
    console.log('\n1. Testing basic connection...');
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('Connection test failed:', testError);
      return;
    }
    
    console.log('✅ Connection successful');
    
    console.log('\n2. Checking if support_tickets table exists...');
    
    // Try to query support_tickets table
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('*')
      .limit(1);
    
    if (ticketsError) {
      console.error('❌ support_tickets table error:', ticketsError);
      console.log('\nThe support_tickets table does not exist or has issues.');
      console.log('Please run the SQL commands from create-support-tables.html');
    } else {
      console.log('✅ support_tickets table exists');
      console.log('Sample data:', ticketsData);
    }
    
    console.log('\n3. Checking if support_ticket_messages table exists...');
    
    // Try to query support_ticket_messages table
    const { data: messagesData, error: messagesError } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ support_ticket_messages table error:', messagesError);
    } else {
      console.log('✅ support_ticket_messages table exists');
      console.log('Sample data:', messagesData);
    }
    
    console.log('\n4. Testing organizations table...');
    
    // Test organizations table
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);
    
    if (orgError) {
      console.error('❌ organizations table error:', orgError);
    } else {
      console.log('✅ organizations table exists');
      console.log('Organizations:', orgData);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTables(); 