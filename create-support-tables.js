import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSupportTables() {
  try {
    console.log('Creating support_tickets table...');
    
    // Create support_tickets table
    const createTicketsTable = `
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'feature', 'account', 'general')),
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: ticketsError } = await supabase.rpc('exec_sql', { sql: createTicketsTable });
    if (ticketsError) {
      console.error('Error creating support_tickets table:', ticketsError);
      return;
    }
    
    console.log('Creating support_ticket_messages table...');
    
    // Create support_ticket_messages table
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS support_ticket_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender TEXT NOT NULL CHECK (sender IN ('user', 'support')),
        message TEXT NOT NULL,
        sender_email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: messagesError } = await supabase.rpc('exec_sql', { sql: createMessagesTable });
    if (messagesError) {
      console.error('Error creating support_ticket_messages table:', messagesError);
      return;
    }
    
    console.log('Creating indexes...');
    
    // Create indexes
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_support_tickets_organization_id ON support_tickets(organization_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
      CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);
    `;
    
    const { error: indexesError } = await supabase.rpc('exec_sql', { sql: createIndexes });
    if (indexesError) {
      console.error('Error creating indexes:', indexesError);
      return;
    }
    
    console.log('Enabling RLS...');
    
    // Enable RLS
    const enableRLS = `
      ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
      ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
    `;
    
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: enableRLS });
    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
      return;
    }
    
    console.log('Creating RLS policies...');
    
    // Create RLS policies
    const createPolicies = `
      -- Users can view tickets from their organization
      DROP POLICY IF EXISTS "Users can view their organization's tickets" ON support_tickets;
      CREATE POLICY "Users can view their organization's tickets" ON support_tickets
        FOR SELECT USING (
          organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
          )
        );

      -- Users can create tickets for their organization
      DROP POLICY IF EXISTS "Users can create tickets for their organization" ON support_tickets;
      CREATE POLICY "Users can create tickets for their organization" ON support_tickets
        FOR INSERT WITH CHECK (
          organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid()
          )
        );

      -- Users can update their own tickets
      DROP POLICY IF EXISTS "Users can update their own tickets" ON support_tickets;
      CREATE POLICY "Users can update their own tickets" ON support_tickets
        FOR UPDATE USING (
          user_id = auth.uid()
        );

      -- Users can delete their own tickets
      DROP POLICY IF EXISTS "Users can delete their own tickets" ON support_tickets;
      CREATE POLICY "Users can delete their own tickets" ON support_tickets
        FOR DELETE USING (
          user_id = auth.uid()
        );

      -- Owners can view all tickets
      DROP POLICY IF EXISTS "Owners can view all tickets" ON support_tickets;
      CREATE POLICY "Owners can view all tickets" ON support_tickets
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'owner'
          )
        );

      -- Users can view messages for their organization's tickets
      DROP POLICY IF EXISTS "Users can view messages for their organization's tickets" ON support_ticket_messages;
      CREATE POLICY "Users can view messages for their organization's tickets" ON support_ticket_messages
        FOR SELECT USING (
          ticket_id IN (
            SELECT id FROM support_tickets 
            WHERE organization_id IN (
              SELECT organization_id FROM profiles 
              WHERE id = auth.uid()
            )
          )
        );

      -- Users can create messages for their organization's tickets
      DROP POLICY IF EXISTS "Users can create messages for their organization's tickets" ON support_ticket_messages;
      CREATE POLICY "Users can create messages for their organization's tickets" ON support_ticket_messages
        FOR INSERT WITH CHECK (
          ticket_id IN (
            SELECT id FROM support_tickets 
            WHERE organization_id IN (
              SELECT organization_id FROM profiles 
              WHERE id = auth.uid()
            )
          )
        );

      -- Owners can manage all ticket messages
      DROP POLICY IF EXISTS "Owners can manage all ticket messages" ON support_ticket_messages;
      CREATE POLICY "Owners can manage all ticket messages" ON support_ticket_messages
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'owner'
          )
        );
    `;
    
    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: createPolicies });
    if (policiesError) {
      console.error('Error creating policies:', policiesError);
      return;
    }
    
    console.log('Creating trigger function...');
    
    // Create trigger function
    const createTriggerFunction = `
      CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: functionError } = await supabase.rpc('exec_sql', { sql: createTriggerFunction });
    if (functionError) {
      console.error('Error creating trigger function:', functionError);
      return;
    }
    
    console.log('Creating trigger...');
    
    // Create trigger
    const createTrigger = `
      DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
      CREATE TRIGGER update_support_tickets_updated_at
        BEFORE UPDATE ON support_tickets
        FOR EACH ROW
        EXECUTE FUNCTION update_support_ticket_updated_at();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: createTrigger });
    if (triggerError) {
      console.error('Error creating trigger:', triggerError);
      return;
    }
    
    console.log('Support tables created successfully!');
    
  } catch (error) {
    console.error('Error creating support tables:', error);
  }
}

createSupportTables(); 