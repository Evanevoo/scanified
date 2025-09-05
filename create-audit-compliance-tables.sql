-- =============================================
-- Comprehensive Audit Trails & Compliance System
-- Track all changes, maintain compliance records
-- =============================================

-- Create audit logs table for tracking all system changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  user_id UUID,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', etc.
  resource_type VARCHAR(100) NOT NULL, -- 'bottle', 'customer', 'rental', 'invoice', etc.
  resource_id UUID,
  resource_identifier VARCHAR(255), -- barcode, customer number, etc.
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  api_endpoint VARCHAR(255),
  request_method VARCHAR(10),
  request_body JSONB,
  response_status INTEGER,
  processing_time_ms INTEGER,
  compliance_tags TEXT[], -- ['HIPAA', 'SOX', 'GDPR', 'DOT', etc.]
  risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create compliance reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  report_type VARCHAR(100) NOT NULL, -- 'DOT_INSPECTION', 'SAFETY_AUDIT', 'FINANCIAL_AUDIT', etc.
  report_name VARCHAR(255) NOT NULL,
  report_period_start DATE,
  report_period_end DATE,
  generated_by UUID,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'submitted', 'archived')),
  compliance_standard VARCHAR(100), -- 'DOT', 'OSHA', 'ISO9001', 'SOX', etc.
  findings JSONB, -- Structured findings data
  recommendations TEXT,
  action_items JSONB, -- Array of action items
  risk_assessment JSONB,
  attachments JSONB, -- Array of file references
  reviewer_id UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create data retention policies table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  policy_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(100) NOT NULL, -- 'audit_logs', 'customer_data', 'financial_records', etc.
  retention_period_days INTEGER NOT NULL,
  retention_reason VARCHAR(255),
  legal_basis VARCHAR(255), -- 'Legal requirement', 'Business need', 'Regulatory compliance'
  auto_delete BOOLEAN DEFAULT false,
  archive_before_delete BOOLEAN DEFAULT true,
  notification_before_days INTEGER DEFAULT 30,
  policy_status VARCHAR(50) DEFAULT 'active' CHECK (policy_status IN ('active', 'inactive', 'pending')),
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create privacy requests table (GDPR, CCPA compliance)
CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'portability', 'rectification', 'erasure', 'restriction', 'objection')),
  customer_id UUID,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  request_details TEXT,
  requested_by UUID, -- User who submitted the request
  legal_basis VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')),
  due_date DATE, -- Legal deadline (e.g., 30 days for GDPR)
  assigned_to UUID,
  processing_notes TEXT,
  data_exported JSONB, -- For access/portability requests
  actions_taken JSONB, -- Record of actions performed
  completion_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create security incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  incident_type VARCHAR(100) NOT NULL, -- 'data_breach', 'unauthorized_access', 'system_compromise', etc.
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  affected_systems TEXT[],
  affected_data_types TEXT[],
  potential_impact TEXT,
  discovered_at TIMESTAMP WITH TIME ZONE,
  discovered_by UUID,
  reported_by UUID,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  containment_actions TEXT,
  investigation_findings TEXT,
  remediation_actions TEXT,
  lessons_learned TEXT,
  notification_required BOOLEAN DEFAULT false,
  authorities_notified BOOLEAN DEFAULT false,
  customers_notified BOOLEAN DEFAULT false,
  notification_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create regulatory compliance tracking
CREATE TABLE IF NOT EXISTS regulatory_compliance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  regulation_name VARCHAR(255) NOT NULL, -- 'DOT HAZMAT', 'OSHA PSM', 'EPA Clean Air Act', etc.
  regulation_code VARCHAR(100),
  requirement_description TEXT,
  compliance_status VARCHAR(50) DEFAULT 'pending' CHECK (compliance_status IN ('compliant', 'non_compliant', 'pending', 'not_applicable')),
  last_assessment_date DATE,
  next_assessment_due DATE,
  assessment_frequency VARCHAR(50), -- 'annual', 'biannual', 'monthly', etc.
  responsible_person UUID,
  evidence_documents JSONB, -- Array of document references
  compliance_notes TEXT,
  risk_if_non_compliant TEXT,
  remediation_plan TEXT,
  remediation_due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create document management for compliance
CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  document_type VARCHAR(100) NOT NULL, -- 'certificate', 'permit', 'inspection_report', 'training_record', etc.
  document_name VARCHAR(255) NOT NULL,
  document_number VARCHAR(100),
  issuing_authority VARCHAR(255),
  issue_date DATE,
  expiration_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending_renewal')),
  file_path TEXT, -- Path to stored document
  file_hash VARCHAR(256), -- For integrity verification
  related_regulation_id UUID,
  related_asset_id UUID, -- Could be truck, facility, etc.
  tags TEXT[],
  access_level VARCHAR(50) DEFAULT 'internal' CHECK (access_level IN ('public', 'internal', 'confidential', 'restricted')),
  uploaded_by UUID,
  reviewed_by UUID,
  review_date TIMESTAMP WITH TIME ZONE,
  next_review_due DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create training and certification tracking
CREATE TABLE IF NOT EXISTS training_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID,
  employee_id UUID,
  training_type VARCHAR(100) NOT NULL, -- 'HAZMAT', 'DOT', 'Safety', 'Compliance', etc.
  training_name VARCHAR(255) NOT NULL,
  training_provider VARCHAR(255),
  completion_date DATE,
  expiration_date DATE,
  certification_number VARCHAR(100),
  score DECIMAL(5,2), -- Training score if applicable
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'expired', 'failed')),
  training_hours DECIMAL(5,2),
  cost DECIMAL(10,2),
  renewal_required BOOLEAN DEFAULT true,
  renewal_notification_sent BOOLEAN DEFAULT false,
  compliance_requirement_id UUID,
  certificate_file_path TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Audit Logs - Read-only for most users, full access for admins
DROP POLICY IF EXISTS "Users can view audit logs from their organization" ON audit_logs;
CREATE POLICY "Users can view audit logs from their organization" ON audit_logs FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Compliance Reports
DROP POLICY IF EXISTS "Users can view compliance reports" ON compliance_reports;
CREATE POLICY "Users can view compliance reports" ON compliance_reports FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Managers can manage compliance reports" ON compliance_reports;
CREATE POLICY "Managers can manage compliance reports" ON compliance_reports FOR ALL TO authenticated USING (
  organization_id IN (
    SELECT p.organization_id FROM profiles p 
    WHERE p.id = auth.uid() AND (
      p.role IN ('admin', 'manager', 'owner') OR
      EXISTS (SELECT 1 FROM roles r WHERE r.id = p.role_id AND r.name IN ('admin', 'manager', 'owner'))
    )
  )
);

-- Privacy Requests
DROP POLICY IF EXISTS "Users can view privacy requests" ON privacy_requests;
CREATE POLICY "Users can view privacy requests" ON privacy_requests FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create privacy requests" ON privacy_requests;
CREATE POLICY "Users can create privacy requests" ON privacy_requests FOR INSERT TO authenticated WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Similar policies for other tables...
DROP POLICY IF EXISTS "Users can view security incidents" ON security_incidents;
CREATE POLICY "Users can view security incidents" ON security_incidents FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view regulatory compliance" ON regulatory_compliance;
CREATE POLICY "Users can view regulatory compliance" ON regulatory_compliance FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view compliance documents" ON compliance_documents;
CREATE POLICY "Users can view compliance documents" ON compliance_documents FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ) AND access_level IN ('public', 'internal')
);

DROP POLICY IF EXISTS "Users can view training records" ON training_records;
CREATE POLICY "Users can view training records" ON training_records FOR SELECT TO authenticated USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_org ON compliance_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports(report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_org ON privacy_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status, due_date);
CREATE INDEX IF NOT EXISTS idx_security_incidents_org ON security_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity, status);
CREATE INDEX IF NOT EXISTS idx_regulatory_compliance_org ON regulatory_compliance(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_org ON compliance_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_records_employee ON training_records(employee_id, expiration_date);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
CREATE TRIGGER update_compliance_reports_updated_at BEFORE UPDATE ON compliance_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_retention_policies_updated_at BEFORE UPDATE ON data_retention_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_requests_updated_at BEFORE UPDATE ON privacy_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_incidents_updated_at BEFORE UPDATE ON security_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regulatory_compliance_updated_at BEFORE UPDATE ON regulatory_compliance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_documents_updated_at BEFORE UPDATE ON compliance_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_records_updated_at BEFORE UPDATE ON training_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  old_values JSONB;
  new_values JSONB;
  changes_summary TEXT;
  user_info RECORD;
BEGIN
  -- Get user information
  SELECT p.organization_id, p.email, p.full_name 
  INTO user_info 
  FROM profiles p 
  WHERE p.id = auth.uid();

  -- Prepare values based on operation
  CASE TG_OP
    WHEN 'INSERT' THEN
      old_values := NULL;
      new_values := to_jsonb(NEW);
      changes_summary := 'Record created';
    WHEN 'UPDATE' THEN
      old_values := to_jsonb(OLD);
      new_values := to_jsonb(NEW);
      changes_summary := 'Record updated';
    WHEN 'DELETE' THEN
      old_values := to_jsonb(OLD);
      new_values := NULL;
      changes_summary := 'Record deleted';
  END CASE;

  -- Insert audit log
  INSERT INTO audit_logs (
    organization_id, user_id, user_email, user_name, action, resource_type, 
    resource_id, old_values, new_values, changes_summary
  ) VALUES (
    user_info.organization_id, auth.uid(), user_info.email, user_info.full_name,
    TG_OP, TG_TABLE_NAME, 
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    old_values, new_values, changes_summary
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create stored procedures for compliance operations
CREATE OR REPLACE FUNCTION generate_compliance_report(
  p_organization_id UUID,
  p_report_type VARCHAR(100),
  p_period_start DATE,
  p_period_end DATE,
  p_generated_by UUID
)
RETURNS UUID AS $$
DECLARE
  report_id UUID;
  report_name VARCHAR(255);
  findings JSONB;
BEGIN
  -- Generate report name
  report_name := p_report_type || ' Report - ' || TO_CHAR(p_period_start, 'YYYY-MM-DD') || ' to ' || TO_CHAR(p_period_end, 'YYYY-MM-DD');
  
  -- Collect findings based on report type
  CASE p_report_type
    WHEN 'AUDIT_TRAIL' THEN
      SELECT jsonb_build_object(
        'total_actions', COUNT(*),
        'high_risk_actions', COUNT(*) FILTER (WHERE risk_level = 'high'),
        'user_activity', jsonb_agg(DISTINCT user_email),
        'resource_types', jsonb_agg(DISTINCT resource_type)
      ) INTO findings
      FROM audit_logs 
      WHERE organization_id = p_organization_id 
      AND created_at BETWEEN p_period_start AND p_period_end;
    WHEN 'PRIVACY_COMPLIANCE' THEN
      SELECT jsonb_build_object(
        'total_requests', COUNT(*),
        'pending_requests', COUNT(*) FILTER (WHERE status = 'pending'),
        'overdue_requests', COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed'),
        'request_types', jsonb_agg(DISTINCT request_type)
      ) INTO findings
      FROM privacy_requests 
      WHERE organization_id = p_organization_id 
      AND created_at BETWEEN p_period_start AND p_period_end;
    ELSE
      findings := jsonb_build_object('message', 'Generic compliance report');
  END CASE;

  -- Create report record
  INSERT INTO compliance_reports (
    organization_id, report_type, report_name, report_period_start, 
    report_period_end, generated_by, findings
  ) VALUES (
    p_organization_id, p_report_type, report_name, p_period_start, 
    p_period_end, p_generated_by, findings
  ) RETURNING id INTO report_id;

  RETURN report_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_organization_id UUID,
  p_retention_days INTEGER DEFAULT 2555 -- 7 years default
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE organization_id = p_organization_id 
  AND created_at < (CURRENT_DATE - INTERVAL '1 day' * p_retention_days);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add foreign key constraints safely
DO $$
BEGIN
  -- Add foreign key constraints if referenced tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE compliance_reports ADD CONSTRAINT fk_compliance_reports_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE data_retention_policies ADD CONSTRAINT fk_data_retention_policies_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE privacy_requests ADD CONSTRAINT fk_privacy_requests_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE security_incidents ADD CONSTRAINT fk_security_incidents_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE regulatory_compliance ADD CONSTRAINT fk_regulatory_compliance_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE compliance_documents ADD CONSTRAINT fk_compliance_documents_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    ALTER TABLE training_records ADD CONSTRAINT fk_training_records_organization 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user 
      FOREIGN KEY (user_id) REFERENCES profiles(id);
    ALTER TABLE compliance_reports ADD CONSTRAINT fk_compliance_reports_generated_by 
      FOREIGN KEY (generated_by) REFERENCES profiles(id);
    ALTER TABLE compliance_reports ADD CONSTRAINT fk_compliance_reports_reviewer 
      FOREIGN KEY (reviewer_id) REFERENCES profiles(id);
    ALTER TABLE data_retention_policies ADD CONSTRAINT fk_data_retention_policies_created_by 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    ALTER TABLE privacy_requests ADD CONSTRAINT fk_privacy_requests_requested_by 
      FOREIGN KEY (requested_by) REFERENCES profiles(id);
    ALTER TABLE security_incidents ADD CONSTRAINT fk_security_incidents_discovered_by 
      FOREIGN KEY (discovered_by) REFERENCES profiles(id);
    ALTER TABLE compliance_documents ADD CONSTRAINT fk_compliance_documents_uploaded_by 
      FOREIGN KEY (uploaded_by) REFERENCES profiles(id);
    ALTER TABLE training_records ADD CONSTRAINT fk_training_records_employee 
      FOREIGN KEY (employee_id) REFERENCES profiles(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE privacy_requests ADD CONSTRAINT fk_privacy_requests_customer 
      FOREIGN KEY (customer_id) REFERENCES customers(id);
  END IF;

  RAISE NOTICE 'Audit and compliance tables created successfully with foreign key constraints.';
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'Some foreign key constraints could not be added. Tables created successfully. Error: %', SQLERRM;
END $$;
