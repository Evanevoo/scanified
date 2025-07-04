-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'feature', 'account', 'general')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create support_ticket_messages table for conversation history
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'support')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester_id ON support_tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);

-- Enable Row Level Security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
-- Users can only see tickets from their organization
CREATE POLICY "Users can view their organization's tickets" ON support_tickets
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Users can create tickets for their organization
CREATE POLICY "Users can create tickets for their organization" ON support_tickets
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update their own tickets
CREATE POLICY "Users can update their own tickets" ON support_tickets
    FOR UPDATE USING (
        requester_id = auth.uid()
    );

-- Owners can view all tickets
CREATE POLICY "Owners can view all tickets" ON support_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- RLS Policies for support_ticket_messages
-- Users can view messages for their organization's tickets
CREATE POLICY "Users can view messages for their organization's tickets" ON support_ticket_messages
    FOR SELECT USING (
        ticket_id IN (
            SELECT id FROM support_tickets 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Users can create messages for their organization's tickets
CREATE POLICY "Users can create messages for their organization's tickets" ON support_ticket_messages
    FOR INSERT WITH CHECK (
        ticket_id IN (
            SELECT id FROM support_tickets 
            WHERE organization_id IN (
                SELECT organization_id FROM user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Owners can view and create messages for all tickets
CREATE POLICY "Owners can manage all ticket messages" ON support_ticket_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_updated_at(); 