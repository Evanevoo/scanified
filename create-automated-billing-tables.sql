-- Automated Billing System Tables
-- These tables support automated invoice generation, billing automation, and payment processing

-- 1. Enhanced invoices table (if not exists, or add missing columns)
DO $$
BEGIN
  -- Add new columns to existing invoices table if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='invoice_number') THEN
    ALTER TABLE invoices ADD COLUMN invoice_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='billing_period_start') THEN
    ALTER TABLE invoices ADD COLUMN billing_period_start DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='billing_period_end') THEN
    ALTER TABLE invoices ADD COLUMN billing_period_end DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='line_items') THEN
    ALTER TABLE invoices ADD COLUMN line_items JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='subtotal') THEN
    ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax_amount') THEN
    ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_status') THEN
    ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='paid_date') THEN
    ALTER TABLE invoices ADD COLUMN paid_date TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_method') THEN
    ALTER TABLE invoices ADD COLUMN payment_method TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_reference') THEN
    ALTER TABLE invoices ADD COLUMN payment_reference TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='generated_automatically') THEN
    ALTER TABLE invoices ADD COLUMN generated_automatically BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='generation_date') THEN
    ALTER TABLE invoices ADD COLUMN generation_date TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='email_sent') THEN
    ALTER TABLE invoices ADD COLUMN email_sent BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='email_sent_date') THEN
    ALTER TABLE invoices ADD COLUMN email_sent_date TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='rental_id') THEN
    ALTER TABLE invoices ADD COLUMN rental_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='rental_type') THEN
    ALTER TABLE invoices ADD COLUMN rental_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='due_date') THEN
    ALTER TABLE invoices ADD COLUMN due_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='issue_date') THEN
    ALTER TABLE invoices ADD COLUMN issue_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='total_amount') THEN
    ALTER TABLE invoices ADD COLUMN total_amount DECIMAL(10,2) DEFAULT 0.00;
  END IF;
END $$;

-- 2. Add billing fields to rentals table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rentals' AND column_name='next_billing_date') THEN
    ALTER TABLE rentals ADD COLUMN next_billing_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rentals' AND column_name='last_billed_date') THEN
    ALTER TABLE rentals ADD COLUMN last_billed_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rentals' AND column_name='billing_frequency') THEN
    ALTER TABLE rentals ADD COLUMN billing_frequency TEXT DEFAULT 'monthly';
  END IF;
END $$;

-- 3. Add payment fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='auto_pay_enabled') THEN
    ALTER TABLE customers ADD COLUMN auto_pay_enabled BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='payment_method_id') THEN
    ALTER TABLE customers ADD COLUMN payment_method_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='billing_email') THEN
    ALTER TABLE customers ADD COLUMN billing_email TEXT;
  END IF;
END $$;

-- 4. Billing Automation Settings
CREATE TABLE IF NOT EXISTS billing_automation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Automation flags
  auto_generate_monthly BOOLEAN DEFAULT false,
  auto_send_emails BOOLEAN DEFAULT false,
  auto_process_payments BOOLEAN DEFAULT false,
  auto_send_reminders BOOLEAN DEFAULT true,
  
  -- Timing settings
  generation_day INTEGER DEFAULT 1, -- Day of month to generate (1-28)
  generation_time TIME DEFAULT '09:00:00', -- Time of day to generate
  reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1], -- Days before due date to send reminders
  
  -- Email templates
  invoice_email_template TEXT DEFAULT 'default',
  reminder_email_template TEXT DEFAULT 'default',
  overdue_email_template TEXT DEFAULT 'default',
  
  -- Payment settings
  payment_processor TEXT DEFAULT 'stripe',
  payment_terms_days INTEGER DEFAULT 30,
  late_fee_enabled BOOLEAN DEFAULT false,
  late_fee_amount DECIMAL(10,2) DEFAULT 0.00,
  late_fee_percentage DECIMAL(5,2) DEFAULT 0.00,
  
  -- Notification settings
  notify_on_generation BOOLEAN DEFAULT true,
  notify_on_payment BOOLEAN DEFAULT true,
  notify_on_failure BOOLEAN DEFAULT true,
  notification_email TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT billing_automation_settings_unique_org UNIQUE(organization_id),
  CONSTRAINT billing_automation_settings_generation_day_check CHECK (generation_day BETWEEN 1 AND 28),
  CONSTRAINT billing_automation_settings_payment_terms_check CHECK (payment_terms_days > 0)
);

-- 5. Billing Automation Log (for tracking automation runs)
CREATE TABLE IF NOT EXISTS billing_automation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Run details
  run_type TEXT NOT NULL, -- 'invoice_generation', 'payment_processing', 'reminder_sending'
  run_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'partial'
  
  -- Results
  items_processed INTEGER DEFAULT 0,
  items_successful INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Details
  details JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Invoice Reminders (track reminder emails sent)
CREATE TABLE IF NOT EXISTS invoice_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Reminder details
  reminder_type TEXT NOT NULL, -- 'due_soon', 'overdue', 'final_notice'
  days_before_due INTEGER, -- Negative for overdue
  sent_date TIMESTAMPTZ DEFAULT NOW(),
  email_address TEXT NOT NULL,
  
  -- Status
  delivery_status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'failed'
  opened BOOLEAN DEFAULT false,
  clicked BOOLEAN DEFAULT false,
  
  -- Content
  subject TEXT,
  template_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON invoices(organization_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_org_due_date ON invoices(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_rental_id ON invoices(rental_id);
CREATE INDEX IF NOT EXISTS idx_rentals_org_next_billing ON rentals(organization_id, next_billing_date);
CREATE INDEX IF NOT EXISTS idx_billing_automation_log_org_date ON billing_automation_log(organization_id, run_date);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice_id ON invoice_reminders(invoice_id);

-- Enable RLS for new tables
ALTER TABLE billing_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_automation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billing_automation_settings
CREATE POLICY "Users can view billing automation settings for their organization" 
ON billing_automation_settings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = billing_automation_settings.organization_id::text
  )
);

CREATE POLICY "Admins can manage billing automation settings" 
ON billing_automation_settings FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = billing_automation_settings.organization_id::text
    AND profiles.role IN ('admin', 'owner', 'manager')
  )
);

-- RLS Policies for billing_automation_log
CREATE POLICY "Users can view billing automation log for their organization" 
ON billing_automation_log FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = billing_automation_log.organization_id::text
  )
);

CREATE POLICY "System can insert billing automation log" 
ON billing_automation_log FOR INSERT 
WITH CHECK (true); -- Allow system processes to log

-- RLS Policies for invoice_reminders
CREATE POLICY "Users can view invoice reminders for their organization" 
ON invoice_reminders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id::text = invoice_reminders.organization_id::text
  )
);

CREATE POLICY "System can manage invoice reminders" 
ON invoice_reminders FOR ALL 
WITH CHECK (true); -- Allow system processes to manage reminders

-- Add triggers for updated_at
CREATE TRIGGER update_billing_automation_settings_updated_at 
BEFORE UPDATE ON billing_automation_settings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to set next billing dates for existing rentals
CREATE OR REPLACE FUNCTION initialize_rental_billing_dates()
RETURNS void AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Set next_billing_date for rentals that don't have one
  UPDATE rentals 
  SET next_billing_date = CASE 
    WHEN rental_type = 'monthly' THEN 
      DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    WHEN rental_type = 'yearly' THEN 
      DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year'  
    ELSE 
      CURRENT_DATE + INTERVAL '1 day'
  END
  WHERE next_billing_date IS NULL 
  AND status = 'active';
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Updated % rental records with billing dates', affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Initialize billing dates for existing rentals
SELECT initialize_rental_billing_dates();

-- Insert default automation settings for existing organizations
INSERT INTO billing_automation_settings (organization_id, auto_send_reminders, notify_on_generation)
SELECT id, true, true
FROM organizations
WHERE NOT EXISTS (
  SELECT 1 FROM billing_automation_settings bas 
  WHERE bas.organization_id = organizations.id
);

COMMENT ON TABLE billing_automation_settings IS 'Configuration for automated billing processes per organization';
COMMENT ON TABLE billing_automation_log IS 'Log of all automated billing operations';
COMMENT ON TABLE invoice_reminders IS 'Track reminder emails sent for invoices';

-- Create a view for invoice dashboard statistics
CREATE OR REPLACE VIEW invoice_dashboard_stats AS
SELECT 
  i.organization_id,
  COUNT(*) as total_invoices,
  COUNT(*) FILTER (WHERE i.payment_status = 'paid') as paid_invoices,
  COUNT(*) FILTER (WHERE i.payment_status = 'unpaid') as unpaid_invoices,
  COUNT(*) FILTER (WHERE i.payment_status = 'unpaid' AND i.due_date < CURRENT_DATE) as overdue_invoices,
  SUM(i.total_amount) FILTER (WHERE i.payment_status = 'paid') as total_revenue,
  SUM(i.total_amount) FILTER (WHERE i.payment_status = 'unpaid') as outstanding_amount,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE i.payment_status = 'paid')::decimal / COUNT(*)) * 100 
      ELSE 0 
    END, 1
  ) as collection_rate
FROM invoices i
WHERE i.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY i.organization_id;
