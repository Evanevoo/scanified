/*
  Phase 0 schema baseline — column-level reconstruction from live public schema
  Project: jtfucttzaswmqqhmmhfb (Scanified)
  Captured: 2026-07-28

  This file is the starting migration for supabase/migrations.
  It uses CREATE TABLE IF NOT EXISTS so it is safer than a blind CREATE,
  but it still omits indexes, FKs, triggers, RLS policies, grants, and views.

  Production already has this schema. Do not re-apply as a destructive reset.
  Subsequent schema changes must be new timestamped migrations only.

  Full pg_dump (preferred when Docker is available):
    npx supabase db dump --linked -f supabase/schema/remote_pg_dump.sql
*/

-- Table: public.app_versions
CREATE TABLE IF NOT EXISTS public.app_versions (
  id uuid not null default gen_random_uuid(),
  platform text not null,
  version text not null,
  build_number text,
  is_required boolean default false,
  release_notes text,
  app_store_url text,
  play_store_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.asset_classification_nodes
CREATE TABLE IF NOT EXISTS public.asset_classification_nodes (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  parent_id uuid,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  default_monthly_price numeric(12,2),
  default_yearly_price numeric(12,2)
);

-- Table: public.asset_customer_relationships
CREATE TABLE IF NOT EXISTS public.asset_customer_relationships (
  id integer not null default nextval('asset_customer_relationships_id_seq'::regclass),
  asset_identifier text,
  customer_identifier text,
  raw_customer text,
  raw_asset text,
  relationship_type text,
  start_date text,
  end_date text,
  extra jsonb
);

-- Table: public.asset_exceptions
CREATE TABLE IF NOT EXISTS public.asset_exceptions (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  asset_id uuid,
  asset_barcode text,
  customer_id text,
  customer_name text,
  exception_type text not null,
  resolution_status text not null default 'PENDING'::text,
  resolution_note text,
  transaction_id uuid,
  transaction_type text,
  order_number text,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  metadata jsonb
);

-- Table: public.asset_records
CREATE TABLE IF NOT EXISTS public.asset_records (
  id bigint not null,
  asset_id uuid,
  event_type text not null,
  event_date timestamptz not null default now(),
  details jsonb,
  performed_by uuid,
  customer_id text,
  notes text,
  created_at timestamptz not null default now(),
  deleted boolean default false,
  deleted_at timestamptz,
  deleted_by uuid,
  organization_id uuid,
  customer_uuid uuid
);

-- Table: public.asset_type_pricing
CREATE TABLE IF NOT EXISTS public.asset_type_pricing (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  product_code text,
  category text,
  description text,
  monthly_price numeric(12,2) not null default 0,
  yearly_price numeric(12,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  classification_node_id uuid
);

-- Table: public.assets
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid not null default gen_random_uuid(),
  product_code text,
  category text,
  group_name text,
  type text,
  description text,
  in_house_total integer,
  with_customer_total integer,
  lost_total integer,
  total integer,
  dock_stock text,
  created_at timestamp default now()
);

-- Table: public.audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid not null default gen_random_uuid(),
  action text not null,
  import_id uuid,
  user_id uuid,
  "timestamp" timestamp default now(),
  details jsonb,
  old_value jsonb,
  new_value jsonb,
  warning text,
  organization_id uuid not null
);

-- Table: public.automation_logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid not null default gen_random_uuid(),
  rule_id uuid not null,
  context jsonb not null default '{}'::jsonb,
  results jsonb not null default '[]'::jsonb,
  executed_at timestamptz not null default now()
);

-- Table: public.automation_rules
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  trigger text not null,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table: public.backup_logs
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id uuid not null default gen_random_uuid(),
  backup_type text not null default 'daily'::text,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'in_progress'::text,
  tables_count integer,
  records_backed_up integer,
  backup_size bigint,
  errors jsonb,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.backup_schedules
CREATE TABLE IF NOT EXISTS public.backup_schedules (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  schedule_type text not null default 'daily'::text,
  schedule_time time without time zone default '02:00:00'::time without time zone,
  is_active boolean default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz default now()
);

-- Table: public.billing_automation_log
CREATE TABLE IF NOT EXISTS public.billing_automation_log (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  run_type text not null,
  run_date timestamptz default now(),
  status text not null default 'running'::text,
  items_processed integer default 0,
  items_successful integer default 0,
  items_failed integer default 0,
  total_amount numeric(10,2) default 0.00,
  details jsonb default '{}'::jsonb,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  duration_seconds integer,
  created_at timestamptz default now()
);

-- Table: public.billing_automation_settings
CREATE TABLE IF NOT EXISTS public.billing_automation_settings (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  auto_generate_monthly boolean default false,
  auto_send_emails boolean default false,
  auto_process_payments boolean default false,
  auto_send_reminders boolean default true,
  generation_day integer default 1,
  generation_time time without time zone default '09:00:00'::time without time zone,
  reminder_days int4[] default ARRAY[7, 3, 1],
  invoice_email_template text default 'default'::text,
  reminder_email_template text default 'default'::text,
  overdue_email_template text default 'default'::text,
  payment_processor text default 'stripe'::text,
  payment_terms_days integer default 30,
  late_fee_enabled boolean default false,
  late_fee_amount numeric(10,2) default 0.00,
  late_fee_percentage numeric(5,2) default 0.00,
  notify_on_generation boolean default true,
  notify_on_payment boolean default true,
  notify_on_failure boolean default true,
  notification_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.bottle_scans
CREATE TABLE IF NOT EXISTS public.bottle_scans (
  id integer not null default nextval('bottle_scans_id_seq'::regclass),
  order_number text,
  bottle_barcode text not null,
  mode text,
  customer_id text,
  customer_name text,
  location text,
  user_id text,
  "timestamp" timestamp default now(),
  created_at timestamp default now(),
  read boolean default false,
  verified boolean default false,
  customer_uuid uuid,
  organization_id uuid,
  scan_latitude float8,
  scan_longitude float8,
  scan_accuracy_m float8,
  scan_location_at timestamptz
);

-- Table: public.bottles
CREATE TABLE IF NOT EXISTS public.bottles (
  id uuid not null default gen_random_uuid(),
  serial_number text,
  barcode_number text,
  gas_type text,
  assigned_customer text,
  rental_start_date date,
  created_at timestamp default now(),
  category text,
  group_name text,
  type text,
  product_code text,
  description text,
  in_house_total integer,
  with_customer_total integer,
  lost_total integer,
  total integer,
  dock_stock text,
  location text,
  status text,
  "CustomerListID" text,
  customer_name text,
  ownership text,
  days_at_location integer,
  last_location_update date default CURRENT_DATE,
  organization_id uuid not null,
  customer_uuid uuid,
  owner_type text,
  owner_id uuid,
  owner_name text,
  previous_assigned_customer text,
  previous_status text,
  updated_at timestamptz default now(),
  last_verified_order text,
  classification_node_id uuid
);

-- Table: public.bracket_rate_details
CREATE TABLE IF NOT EXISTS public.bracket_rate_details (
  id uuid not null default gen_random_uuid(),
  bracket_rate_id uuid not null,
  min_days integer not null default 0,
  max_days integer not null default 365,
  rate numeric(10,2) not null default 0,
  rate_type text not null default 'daily'::text,
  order_index integer not null default 0,
  created_at timestamptz default now()
);

-- Table: public.bracket_rates
CREATE TABLE IF NOT EXISTS public.bracket_rates (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  rate_name text not null,
  currency text not null default 'USD'::text,
  effective_date date not null,
  expiry_date date,
  is_active boolean default true,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.bulk_scan_sessions
CREATE TABLE IF NOT EXISTS public.bulk_scan_sessions (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  pallet_id uuid not null,
  operator_id uuid not null,
  session_name text,
  start_time timestamptz default now(),
  end_time timestamptz,
  total_items_scanned integer default 0,
  successful_scans integer default 0,
  failed_scans integer default 0,
  status text not null default 'active'::text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.chain_of_custody_records
CREATE TABLE IF NOT EXISTS public.chain_of_custody_records (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  asset_id uuid not null,
  asset_type text not null default 'cylinder'::text,
  custody_type text not null default 'transfer'::text,
  from_party uuid,
  to_party uuid,
  from_location text,
  to_location text,
  transfer_date timestamptz not null,
  expected_return_date timestamptz,
  actual_return_date timestamptz,
  purpose text,
  condition text not null default 'good'::text,
  notes text,
  requires_signature boolean default true,
  requires_documentation boolean default true,
  status text not null default 'active'::text,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.claims
CREATE TABLE IF NOT EXISTS public.claims (
  id uuid not null default uuid_generate_v4(),
  organization_id uuid not null,
  user_id uuid not null,
  title varchar(255) not null,
  category varchar(50) not null,
  priority varchar(20) not null,
  status varchar(20) not null default 'submitted'::character varying,
  description text not null,
  incident_date date,
  location varchar(255),
  estimated_value numeric(12,2),
  contact_phone varchar(20),
  additional_info text,
  assigned_to uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz default CURRENT_TIMESTAMP,
  updated_at timestamptz default CURRENT_TIMESTAMP
);

-- Table: public.compliance_reports
CREATE TABLE IF NOT EXISTS public.compliance_reports (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  report_type text not null,
  title text not null,
  description text not null,
  incident_date timestamptz,
  location text,
  severity text not null default 'low'::text,
  hazmat_involved boolean default false,
  regulatory_body text,
  corrective_actions text,
  prevention_measures text,
  status text not null default 'open'::text,
  assigned_to uuid,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.compliance_violations
CREATE TABLE IF NOT EXISTS public.compliance_violations (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  manifest_id uuid,
  violation_type text not null,
  description text not null,
  severity text not null default 'low'::text,
  violation_date timestamptz not null,
  regulatory_body text,
  fine_amount numeric(10,2),
  corrective_actions text,
  prevention_measures text,
  status text not null default 'open'::text,
  reported_by uuid not null,
  assigned_to uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.custody_audit_log
CREATE TABLE IF NOT EXISTS public.custody_audit_log (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  custody_id uuid,
  action text not null,
  details text,
  old_values jsonb,
  new_values jsonb,
  user_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

-- Table: public.custody_documents
CREATE TABLE IF NOT EXISTS public.custody_documents (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  custody_id uuid not null,
  document_type text not null,
  title text not null,
  description text,
  file_path text,
  file_size integer,
  mime_type text,
  status text not null default 'active'::text,
  uploaded_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.custody_events
CREATE TABLE IF NOT EXISTS public.custody_events (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  custody_id uuid not null,
  event_type text not null,
  event_date timestamptz not null,
  location text,
  performed_by uuid,
  description text not null,
  condition_notes text,
  photos jsonb default '[]'::jsonb,
  signature_required boolean default false,
  witness_required boolean default false,
  witness_name text,
  witness_signature text,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.custody_notifications
CREATE TABLE IF NOT EXISTS public.custody_notifications (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  custody_id uuid not null,
  notification_type text not null,
  recipient_id uuid not null,
  title text not null,
  message text not null,
  sent_at timestamptz,
  read_at timestamptz,
  status text not null default 'pending'::text,
  delivery_method text,
  created_at timestamptz default now()
);

-- Table: public.custody_signatures
CREATE TABLE IF NOT EXISTS public.custody_signatures (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  custody_id uuid not null,
  signer_id uuid not null,
  signature_type text not null,
  signature_data text not null,
  signed_at timestamptz default now(),
  ip_address inet,
  user_agent text,
  location text,
  verified boolean default false,
  verification_method text,
  created_at timestamptz default now()
);

-- Table: public.custody_templates
CREATE TABLE IF NOT EXISTS public.custody_templates (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  template_name text not null,
  template_type text not null,
  description text,
  fields jsonb default '[]'::jsonb,
  required_fields jsonb default '[]'::jsonb,
  validation_rules jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.custom_pages
CREATE TABLE IF NOT EXISTS public.custom_pages (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  title text not null,
  slug text not null,
  content text not null default ''::text,
  meta_description text,
  meta_keywords text[],
  is_published boolean default false,
  is_homepage boolean default false,
  sort_order integer default 0,
  author_id uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz
);

-- Table: public.customer_departments
CREATE TABLE IF NOT EXISTS public.customer_departments (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  customer_id uuid not null,
  name text not null,
  code text,
  address text,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.customer_holdings
CREATE TABLE IF NOT EXISTS public.customer_holdings (
  id uuid not null default uuid_generate_v4(),
  customer_id uuid,
  cylinder_id uuid,
  quantity integer,
  created_at timestamptz default timezone('utc'::text, now())
);

-- Table: public.customer_imports
CREATE TABLE IF NOT EXISTS public.customer_imports (
  "CustomerListID" text,
  name text,
  contact_details text,
  phone text,
  "AccountNumber" text,
  created_at timestamp default now()
);

-- Table: public.customer_pricing
CREATE TABLE IF NOT EXISTS public.customer_pricing (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  customer_id text,
  customer_type text,
  discount_percent numeric(5,2) default 0.00,
  markup_percent numeric(5,2) default 0.00,
  fixed_rate_override numeric(10,2),
  gas_type text,
  effective_date date default CURRENT_DATE,
  expiry_date date,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  rental_period text default 'monthly'::text,
  rental_class_rates jsonb not null default '{}'::jsonb,
  rental_rates_by_product_code jsonb not null default '{}'::jsonb
);

-- Table: public.customer_pricing_overrides
CREATE TABLE IF NOT EXISTS public.customer_pricing_overrides (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  customer_id text not null,
  product_code text,
  custom_monthly_price numeric(12,2),
  custom_yearly_price numeric(12,2),
  discount_percent numeric(5,2) default 0,
  fixed_rate_override numeric(12,2),
  effective_date date,
  expiry_date date,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.customer_support
CREATE TABLE IF NOT EXISTS public.customer_support (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid,
  email text,
  subject text not null,
  message text not null,
  category text default 'general'::text,
  status text default 'open'::text,
  priority text default 'medium'::text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.customers
CREATE TABLE IF NOT EXISTS public.customers (
  "CustomerListID" text not null,
  customer_number text,
  name text,
  contact_details text,
  bill_city text,
  bill_state text,
  bill_postal_code text,
  phone text,
  barcode text,
  created_at timestamptz default timezone('utc'::text, now()),
  customer_barcode text,
  address2 text,
  address3 text,
  address4 text,
  address5 text,
  city text,
  postal_code text,
  location_id uuid,
  rental_rate numeric,
  "AccountNumber" text,
  billing_address_1 text,
  billing_address_2 text,
  billing_city text,
  billing_state text,
  billing_zip text,
  billing_country text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_address_line3 text,
  shipping_city text,
  shipping_state text,
  shipping_zip text,
  shipping_country text,
  parent_customer_id text,
  servicing_location text,
  billing_name text,
  payment_terms text,
  tax_region text,
  fax text,
  rental_bill_email_to text,
  salesman text,
  barcode_number text,
  organization_id uuid not null,
  id uuid not null default gen_random_uuid(),
  location text default 'SASKATOON'::text,
  customer_type varchar(20) default 'CUSTOMER'::character varying,
  auto_pay_enabled boolean default false,
  payment_method_id text,
  billing_email text,
  is_main_account boolean default false,
  account_type text default 'main'::text,
  branch_location text,
  display_name text,
  email text,
  department text,
  billing_mode text not null default 'rental'::text,
  purchase_order text
);

-- Table: public.cylinder_fills
CREATE TABLE IF NOT EXISTS public.cylinder_fills (
  id uuid not null default gen_random_uuid(),
  cylinder_id uuid,
  barcode_number text,
  fill_date timestamptz not null,
  filled_by text,
  notes text,
  organization_id uuid,
  fill_type text,
  previous_status text,
  previous_location text,
  created_at timestamptz default now(),
  fill_timezone text
);

-- Table: public.cylinder_movements
CREATE TABLE IF NOT EXISTS public.cylinder_movements (
  id uuid not null default gen_random_uuid(),
  cylinder_id uuid,
  from_location text,
  to_location text,
  date timestamptz default now(),
  notes text
);

-- Table: public.cylinder_scans
CREATE TABLE IF NOT EXISTS public.cylinder_scans (
  id uuid not null default gen_random_uuid(),
  created_at timestamptz default timezone('utc'::text, now()),
  customer_number text not null,
  order_number text not null,
  ship_cylinders jsonb not null,
  return_cylinders jsonb not null,
  deleted boolean default false,
  deleted_at timestamptz,
  deleted_by uuid,
  organization_id uuid
);

-- Table: public.cylinder_tests
CREATE TABLE IF NOT EXISTS public.cylinder_tests (
  id uuid not null default uuid_generate_v4(),
  cylinder_id uuid,
  test_date date,
  result text,
  certificate_url text,
  created_at timestamptz default timezone('utc'::text, now())
);

-- Table: public.cylinders
CREATE TABLE IF NOT EXISTS public.cylinders (
  barcode text not null,
  serial_number text,
  gas_type text,
  category text,
  type text,
  item text,
  item_description text,
  ownership text
);

-- Table: public.deliveries
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid not null default gen_random_uuid(),
  customer_id text,
  driver_id uuid,
  delivery_date date not null,
  delivery_time time without time zone,
  status varchar(20) default 'scheduled'::character varying,
  notes text,
  departure_time timestamp,
  delivery_time_actual timestamp,
  estimated_time varchar(50),
  current_latitude numeric(10,8),
  current_longitude numeric(11,8),
  location_updated_at timestamp,
  assigned_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  organization_id uuid not null,
  customer_uuid uuid
);

-- Table: public.delivery_challans
CREATE TABLE IF NOT EXISTS public.delivery_challans (
  id uuid not null default uuid_generate_v4(),
  customer_id uuid,
  cylinder_id uuid,
  type text,
  date date,
  created_at timestamptz default timezone('utc'::text, now())
);

-- Table: public.delivery_items
CREATE TABLE IF NOT EXISTS public.delivery_items (
  id uuid not null default gen_random_uuid(),
  delivery_id uuid,
  bottle_id uuid,
  quantity integer default 1,
  notes text,
  created_at timestamp default now()
);

-- Table: public.delivery_routes
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id uuid not null default gen_random_uuid(),
  delivery_id uuid,
  sequence integer not null,
  latitude numeric(10,8),
  longitude numeric(11,8),
  address text,
  estimated_arrival_time timestamp,
  actual_arrival_time timestamp,
  created_at timestamp default now()
);

-- Table: public.delivery_signatures
CREATE TABLE IF NOT EXISTS public.delivery_signatures (
  id uuid not null default uuid_generate_v4(),
  manifest_item_id uuid not null,
  customer_name varchar(255),
  signature_data text not null,
  signed_at timestamptz default now(),
  device_info jsonb,
  gps_latitude numeric(10,8),
  gps_longitude numeric(11,8)
);

-- Table: public.demurrage_rates
CREATE TABLE IF NOT EXISTS public.demurrage_rates (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  rate_name text not null,
  base_rate numeric(10,2) not null default 0,
  currency text not null default 'USD'::text,
  grace_period integer default 0,
  escalation_rate numeric(5,2) default 0,
  maximum_rate numeric(10,2),
  calculation_method text not null default 'daily'::text,
  effective_date date not null,
  expiry_date date,
  is_active boolean default true,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.demurrage_rules
CREATE TABLE IF NOT EXISTS public.demurrage_rules (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  gas_type text not null,
  grace_period_days integer not null default 0,
  daily_penalty_rate numeric(10,2) not null default 0.00,
  max_penalty_days integer,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.discounts
CREATE TABLE IF NOT EXISTS public.discounts (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  name text not null,
  type text not null,
  value numeric(10,2) not null,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Table: public.documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid not null default gen_random_uuid(),
  cylinder_id uuid,
  file_url text,
  type text,
  uploaded_at timestamptz default now()
);

-- Table: public.emergency_procedures
CREATE TABLE IF NOT EXISTS public.emergency_procedures (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  procedure_name text not null,
  description text not null,
  hazmat_class text not null,
  emergency_type text not null,
  severity_level text not null,
  response_steps jsonb not null default '[]'::jsonb,
  required_equipment jsonb default '[]'::jsonb,
  emergency_contacts jsonb default '[]'::jsonb,
  evacuation_procedures text,
  containment_procedures text,
  cleanup_procedures text,
  reporting_requirements text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.file_format_templates
CREATE TABLE IF NOT EXISTS public.file_format_templates (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  name varchar(255) not null,
  description text,
  category varchar(100),
  file_types jsonb default '[]'::jsonb,
  delimiter varchar(10) default ','::character varying,
  has_header boolean default true,
  encoding varchar(50) default 'utf-8'::character varying,
  column_mappings jsonb default '[]'::jsonb,
  validation_rules jsonb default '[]'::jsonb,
  transformations jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_by uuid,
  created_at timestamptz default CURRENT_TIMESTAMP,
  updated_at timestamptz default CURRENT_TIMESTAMP
);

-- Table: public.file_formats
CREATE TABLE IF NOT EXISTS public.file_formats (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  created_by uuid,
  name varchar(255) not null,
  description text,
  category varchar(100) not null,
  file_types jsonb default '[]'::jsonb,
  delimiter varchar(10) default ','::character varying,
  has_header boolean default true,
  encoding varchar(50) default 'utf-8'::character varying,
  column_mappings jsonb default '[]'::jsonb,
  validation_rules jsonb default '[]'::jsonb,
  transformations jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default CURRENT_TIMESTAMP,
  updated_at timestamptz default CURRENT_TIMESTAMP
);

-- Table: public.gas_types
CREATE TABLE IF NOT EXISTS public.gas_types (
  id integer not null default nextval('gas_types_id_seq'::regclass),
  name text,
  category text,
  group_name text,
  type text,
  product_code text,
  description text,
  in_house_total integer,
  with_customer_total integer,
  lost_total integer,
  total integer,
  dock_stock text
);

-- Table: public.hazmat_certifications
CREATE TABLE IF NOT EXISTS public.hazmat_certifications (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  certification_type text not null,
  certification_number text,
  issuing_authority text not null,
  issue_date date not null,
  expiry_date date not null,
  status text not null default 'active'::text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.hazmat_items
CREATE TABLE IF NOT EXISTS public.hazmat_items (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  manifest_id uuid,
  item_name text not null,
  hazmat_class text not null,
  un_number text not null,
  proper_shipping_name text not null,
  hazard_class text,
  packing_group text,
  quantity numeric(10,3) not null,
  unit_of_measure text not null,
  special_provisions text,
  limited_quantity boolean default false,
  marine_pollutant boolean default false,
  temperature_controlled boolean default false,
  additional_handling text,
  storage_requirements text,
  disposal_requirements text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.hazmat_manifest_items
CREATE TABLE IF NOT EXISTS public.hazmat_manifest_items (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  manifest_id uuid not null,
  item_name text not null,
  hazmat_class text not null,
  un_number text not null,
  proper_shipping_name text not null,
  hazard_class text,
  packing_group text,
  quantity numeric(10,3) not null,
  unit_of_measure text not null,
  special_provisions text,
  limited_quantity boolean default false,
  marine_pollutant boolean default false,
  temperature_controlled boolean default false,
  additional_handling text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.hazmat_manifests
CREATE TABLE IF NOT EXISTS public.hazmat_manifests (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  manifest_number text not null,
  shipper_name text not null,
  shipper_address text not null,
  consignee_name text not null,
  consignee_address text not null,
  carrier_name text,
  carrier_address text,
  emergency_contact text not null,
  emergency_phone text not null,
  hazmat_class text not null,
  un_number text not null,
  proper_shipping_name text not null,
  hazard_class text,
  packing_group text,
  quantity numeric(10,3) not null,
  unit_of_measure text not null,
  special_provisions text,
  limited_quantity boolean default false,
  marine_pollutant boolean default false,
  temperature_controlled boolean default false,
  additional_handling text,
  certification_statement text,
  signature text,
  date_signed timestamptz,
  status text not null default 'draft'::text,
  regulatory_body text,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.import_addendums
CREATE TABLE IF NOT EXISTS public.import_addendums (
  id uuid not null default gen_random_uuid(),
  record_id text not null,
  type varchar(50) not null,
  message text,
  user_id text,
  created_at timestamptz default now(),
  organization_id uuid
);

-- Table: public.import_audit_log
CREATE TABLE IF NOT EXISTS public.import_audit_log (
  id uuid not null default gen_random_uuid(),
  record_id text not null,
  action varchar(50) not null,
  message text,
  user_id text,
  "timestamp" timestamptz default now(),
  created_at timestamptz default now(),
  organization_id uuid
);

-- Table: public.import_exceptions
CREATE TABLE IF NOT EXISTS public.import_exceptions (
  id uuid not null default gen_random_uuid(),
  record_id text not null,
  asset_id text,
  message text not null,
  severity varchar(20) default 'medium'::character varying,
  resolved boolean default false,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  organization_id uuid
);

-- Table: public.import_history
CREATE TABLE IF NOT EXISTS public.import_history (
  id uuid not null default gen_random_uuid(),
  file_name text,
  import_type text,
  user_id uuid,
  user_email text,
  started_at timestamp default now(),
  finished_at timestamp,
  status text,
  summary jsonb,
  error_message text,
  organization_id uuid
);

-- Table: public.imported_invoices
CREATE TABLE IF NOT EXISTS public.imported_invoices (
  id integer not null default nextval('imported_invoices_id_seq'::regclass),
  data jsonb not null,
  status text default 'pending'::text,
  uploaded_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid,
  error_message text,
  uploaded_by uuid,
  notes text,
  organization_id uuid,
  location text,
  verified_at timestamptz,
  verified_by text,
  investigation_reason text,
  investigation_marked_at timestamptz,
  order_number text,
  po_number text,
  customer_id text,
  customer_name text,
  date timestamptz,
  rejected_at timestamptz,
  rejected_by uuid,
  investigation_started_at timestamptz,
  investigation_started_by uuid,
  auto_approved boolean default false,
  auto_approval_reason text,
  locked_by uuid,
  locked_at timestamptz
);

-- Table: public.imported_sales_receipts
CREATE TABLE IF NOT EXISTS public.imported_sales_receipts (
  id integer not null default nextval('imported_sales_receipts_id_seq'::regclass),
  data jsonb not null,
  status text default 'pending'::text,
  uploaded_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid,
  error_message text,
  uploaded_by uuid,
  notes text,
  organization_id uuid,
  location text,
  verified_at timestamptz,
  verified_by text,
  investigation_reason text,
  investigation_marked_at timestamptz,
  order_number text,
  po_number text,
  customer_id text,
  customer_name text,
  date timestamptz,
  locked_by uuid,
  locked_at timestamptz
);

-- Table: public.integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  type text not null,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_sync timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table: public.invoice_counters
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  id text not null,
  last_invoice_number integer not null,
  last_invoice_month text not null
);

-- Table: public.invoice_email_sends
CREATE TABLE IF NOT EXISTS public.invoice_email_sends (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  subscription_id uuid,
  subscription_invoice_id uuid,
  customer_id text,
  invoice_number text not null,
  period_start date,
  period_end date,
  emailed_to text[] not null default '{}'::text[],
  email_from text,
  subject text,
  sent_at timestamptz not null default now(),
  sent_by_user_id uuid,
  message_id text,
  pdf_storage_path text,
  created_at timestamptz default now()
);

-- Table: public.invoice_line_items
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid not null default gen_random_uuid(),
  invoice_id uuid,
  product_code text,
  qty_out integer,
  qty_in integer,
  created_at timestamp default now(),
  description text,
  rate numeric,
  amount numeric,
  serial_number text
);

-- Table: public.invoice_reminders
CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  invoice_id uuid,
  reminder_type text not null,
  days_before_due integer,
  sent_date timestamptz default now(),
  email_address text not null,
  delivery_status text default 'sent'::text,
  opened boolean default false,
  clicked boolean default false,
  subject text,
  template_used text,
  created_at timestamptz default now()
);

-- Table: public.invoice_settings
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id uuid not null default uuid_generate_v4(),
  organization_id uuid not null,
  company_name text,
  company_address text,
  company_phone text,
  company_email text,
  company_logo_url text,
  invoice_prefix text default 'INV'::text,
  next_invoice_number integer default 1,
  primary_color text default '#1976d2'::text,
  secondary_color text default '#424242'::text,
  invoice_notes text,
  invoice_footer text,
  tax_rate numeric(5,4) default 0.11,
  payment_terms text default 'Net 30'::text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  default_template_id uuid,
  agreement_prefix text default 'LA'::text,
  next_agreement_number integer default 1,
  remit_name text,
  remit_address_line1 text,
  remit_address_line2 text,
  remit_address_line3 text,
  gst_number text
);

-- Table: public.invoice_templates
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id uuid not null default uuid_generate_v4(),
  organization_id uuid not null,
  name text not null,
  description text,
  layout_json jsonb not null default '{}'::jsonb,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid
);

-- Table: public.invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  customer_id text not null,
  invoice_date date,
  details text,
  amount numeric(10,2) default 0,
  total_amount numeric(10,2) default 0,
  status text default 'pending'::text,
  created_at timestamptz default now(),
  invoice_number text,
  billing_period_start date,
  billing_period_end date,
  line_items jsonb default '[]'::jsonb,
  subtotal numeric(10,2) default 0.00,
  tax_amount numeric(10,2) default 0.00,
  payment_status text default 'unpaid'::text,
  paid_date timestamptz,
  payment_method text,
  payment_reference text,
  generated_automatically boolean default false,
  generation_date timestamptz,
  email_sent boolean default false,
  email_sent_date timestamptz,
  rental_id uuid,
  rental_type text,
  due_date date,
  issue_date date,
  customer_email text,
  customer_name text,
  period_start date,
  period_end date,
  rental_days integer,
  cylinders_count integer,
  pdf_url text,
  email_sent_at timestamptz,
  amount_paid numeric(10,2) default 0,
  updated_at timestamptz default now()
);

-- Table: public.lease_agreement_items
CREATE TABLE IF NOT EXISTS public.lease_agreement_items (
  id uuid not null default gen_random_uuid(),
  lease_agreement_id uuid not null,
  organization_id uuid not null,
  item_type text not null,
  description text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  product_code text,
  gas_type text,
  size text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.lease_agreements
CREATE TABLE IF NOT EXISTS public.lease_agreements (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  customer_id text not null,
  customer_name text not null,
  agreement_number text not null,
  title text not null default 'Annual Lease Agreement'::text,
  start_date date not null,
  end_date date not null,
  status text not null default 'active'::text,
  annual_amount numeric(10,2) not null,
  billing_frequency text not null default 'monthly'::text,
  payment_terms text default 'Net 30'::text,
  tax_rate numeric(5,4) default 0.0000,
  terms_and_conditions text,
  special_provisions text,
  auto_renewal boolean default false,
  renewal_notice_days integer default 30,
  asset_types text[],
  asset_locations text[],
  max_asset_count integer,
  next_billing_date date,
  last_billing_date date,
  billing_contact_email text,
  billing_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid,
  updated_by uuid,
  bottle_id uuid
);

-- Table: public.lease_billing_history
CREATE TABLE IF NOT EXISTS public.lease_billing_history (
  id uuid not null default gen_random_uuid(),
  lease_agreement_id uuid not null,
  organization_id uuid not null,
  billing_period_start date not null,
  billing_period_end date not null,
  billing_date date not null,
  due_date date not null,
  subtotal numeric(10,2) not null,
  tax_amount numeric(10,2) not null default 0.00,
  total_amount numeric(10,2) not null,
  payment_status text not null default 'pending'::text,
  payment_date date,
  payment_method text,
  payment_reference text,
  invoice_number text,
  invoice_sent_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.liquid_stock
CREATE TABLE IF NOT EXISTS public.liquid_stock (
  id uuid not null default uuid_generate_v4(),
  tank_id uuid,
  product text,
  quantity numeric,
  date date,
  created_at timestamptz default timezone('utc'::text, now())
);

-- Table: public.locations
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid not null default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamp default now(),
  tax_rate numeric,
  charge_gst boolean default true,
  charge_pst boolean default false,
  gst_rate numeric(5,2) default 5.0,
  pst_rate numeric(5,2) default 0.0,
  total_tax_rate numeric(5,2) default 5.0,
  province text,
  updated_at timestamptz default now(),
  organization_id uuid not null
);

-- Table: public.maintenance
CREATE TABLE IF NOT EXISTS public.maintenance (
  id uuid not null default gen_random_uuid(),
  cylinder_id uuid,
  type text,
  date timestamptz default now(),
  notes text
);

-- Table: public.maintenance_records
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  workflow_id uuid,
  task_id uuid,
  bottle_id uuid,
  performed_by uuid not null,
  maintenance_type text not null,
  description text not null,
  findings text,
  actions_taken text,
  parts_used jsonb default '[]'::jsonb,
  cost numeric(10,2),
  next_maintenance_date timestamptz,
  status text not null default 'completed'::text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.maintenance_schedules
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  workflow_id uuid not null,
  bottle_id uuid,
  scheduled_date timestamptz not null,
  due_date timestamptz not null,
  assigned_to uuid,
  status text not null default 'scheduled'::text,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.maintenance_tasks
CREATE TABLE IF NOT EXISTS public.maintenance_tasks (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  workflow_id uuid,
  assigned_to uuid,
  completed_by uuid,
  name text not null,
  description text,
  status text not null default 'pending'::text,
  priority text not null default 'medium'::text,
  due_date timestamptz,
  completed_at timestamptz,
  estimated_duration integer default 30,
  actual_duration integer,
  notes text,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.maintenance_templates
CREATE TABLE IF NOT EXISTS public.maintenance_templates (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  description text,
  category text not null,
  checklist_template jsonb default '[]'::jsonb,
  parts_template jsonb default '[]'::jsonb,
  safety_template jsonb default '[]'::jsonb,
  estimated_duration integer default 60,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.maintenance_workflows
CREATE TABLE IF NOT EXISTS public.maintenance_workflows (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  template_id uuid,
  created_by uuid not null,
  assigned_to uuid,
  name text not null,
  description text,
  category text not null,
  priority text not null,
  frequency text not null,
  status text not null default 'draft'::text,
  estimated_duration integer default 60,
  actual_duration integer,
  checklist_items jsonb default '[]'::jsonb,
  required_parts jsonb default '[]'::jsonb,
  safety_requirements jsonb default '[]'::jsonb,
  documentation_required boolean default false,
  documentation_completed boolean default false,
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.manifest_items
CREATE TABLE IF NOT EXISTS public.manifest_items (
  id uuid not null default uuid_generate_v4(),
  manifest_id uuid not null,
  bottle_id uuid,
  barcode_number varchar(50) not null,
  customer_id uuid,
  customer_name varchar(255),
  product_type varchar(100),
  delivery_type varchar(20) default 'delivery'::character varying,
  planned_quantity integer default 1,
  actual_quantity integer default 0,
  status varchar(20) default 'planned'::character varying,
  loaded_at timestamptz,
  delivered_at timestamptz,
  delivery_location varchar(255),
  delivery_notes text,
  signature_captured boolean default false,
  signature_data text,
  photo_urls text[],
  exception_reason varchar(255),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  organization_id uuid,
  type text not null,
  title text not null,
  message text not null,
  data jsonb,
  read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Table: public.organization_backups
CREATE TABLE IF NOT EXISTS public.organization_backups (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  backup_date date not null default CURRENT_DATE,
  backup_type text not null default 'daily'::text,
  backup_status text not null default 'pending'::text,
  customers_count integer default 0,
  bottles_count integer default 0,
  backup_size_mb numeric(10,2) default 0,
  backup_data jsonb,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Table: public.organization_invites
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  email text not null,
  role text not null default 'user'::text,
  invite_token uuid not null default gen_random_uuid(),
  invited_by uuid,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null
);

-- Table: public.organization_join_codes
CREATE TABLE IF NOT EXISTS public.organization_join_codes (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  code text not null,
  created_by uuid,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + '24:00:00'::interval),
  used_at timestamptz,
  used_by uuid,
  is_active boolean default true,
  max_uses integer default 1,
  current_uses integer default 0,
  notes text,
  assigned_role text default 'user'::text
);

-- Table: public.organization_rental_classes
CREATE TABLE IF NOT EXISTS public.organization_rental_classes (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  group_name text not null default 'From inventory'::text,
  class_name text not null,
  rental_method text not null default 'monthly'::text,
  default_daily numeric,
  default_weekly numeric,
  default_monthly numeric,
  match_product_code text,
  match_category text,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.organization_verifications
CREATE TABLE IF NOT EXISTS public.organization_verifications (
  id uuid not null default gen_random_uuid(),
  email text not null,
  organization_name text not null,
  user_name text not null,
  verification_token uuid not null default gen_random_uuid(),
  verified_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  organization_id uuid,
  verified boolean default false
);

-- Table: public.organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid not null default gen_random_uuid(),
  name text not null,
  slug text not null,
  domain text,
  subscription_plan text default 'basic'::text,
  subscription_status text default 'trial'::text,
  trial_start_date timestamp default now(),
  trial_end_date timestamp default (now() + '7 days'::interval),
  subscription_start_date timestamp,
  subscription_end_date timestamp,
  payment_method_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  payment_required boolean default true,
  max_users integer default 5,
  max_customers integer default 100,
  max_bottles integer default 1000,
  settings jsonb default '{}'::jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  subscription_plan_id uuid,
  active_discount_id uuid,
  trial_ends_at timestamptz,
  max_cylinders integer default 1000,
  is_active boolean default true,
  logo_url text,
  email_user text,
  email_password text,
  email_from text,
  smtp_host text,
  smtp_port integer,
  smtp_secure boolean,
  asset_type varchar(50) default 'cylinder'::character varying,
  asset_type_plural varchar(50) default 'cylinders'::character varying,
  asset_display_name varchar(100) default 'Gas Cylinder'::character varying,
  asset_display_name_plural varchar(100) default 'Gas Cylinders'::character varying,
  primary_color varchar(7) default '#2563eb'::character varying,
  secondary_color varchar(7) default '#1e40af'::character varying,
  app_name varchar(100) default 'LessAnnoyingScan'::character varying,
  custom_terminology jsonb default '{}'::jsonb,
  feature_toggles jsonb default '{}'::jsonb,
  barcode_format jsonb default '{"pattern": "^[A-Z0-9]{6,12}$", "examples": ["ABC123", "XYZ789012"], "description": "6-12 alphanumeric characters"}'::jsonb,
  order_number_format jsonb default '{"prefix": "ORD", "pattern": "^ORD[0-9]{6}$", "examples": ["ORD123456", "ORD999888"], "description": "ORD followed by 6 digits"}'::jsonb,
  serial_number_format jsonb default '{"pattern": "^[A-Z]{2}[0-9]{8}$", "examples": ["AB12345678", "XY87654321"], "description": "2 letters followed by 8 digits"}'::jsonb,
  subscription_ends_at timestamptz,
  integration_settings jsonb default '{}'::jsonb,
  format_configuration jsonb default '{"barcode_format": {"enabled": true, "pattern": "^[0-9]{9}$", "examples": ["123456789", "987654321"], "description": "9-digit numeric barcode"}, "customer_id_format": {"enabled": true, "pattern": "^[A-Z0-9]{4,12}$", "examples": ["CUST001", "CUSTOMER123"], "description": "4-12 alphanumeric characters"}, "order_number_format": {"enabled": true, "pattern": "^[A-Z]{2,4}[0-9]{4,8}$", "examples": ["ORD123456", "SO2024001"], "description": "2-4 letters followed by 4-8 digits"}}'::jsonb,
  join_code text,
  email text,
  phone text,
  status text default 'active'::text,
  deleted_at timestamptz,
  deleted_by uuid,
  deletion_reason text,
  industry text,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  website text,
  description text,
  invoice_emails jsonb default '[]'::jsonb,
  default_invoice_email text,
  app_icon_url text,
  show_app_icon boolean default true,
  rental_invoice_email_template jsonb
);

-- Table: public.owners
CREATE TABLE IF NOT EXISTS public.owners (
  id uuid not null default gen_random_uuid(),
  name text not null,
  organization_id uuid not null,
  created_at timestamptz not null default now()
);

-- Table: public.ownership_values
CREATE TABLE IF NOT EXISTS public.ownership_values (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  value text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.page_analytics
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id uuid not null default gen_random_uuid(),
  page_id uuid not null,
  organization_id uuid not null,
  visitor_ip inet,
  user_agent text,
  referrer text,
  page_views integer default 1,
  time_on_page integer default 0,
  bounce boolean default true,
  created_at timestamptz default now()
);

-- Table: public.page_templates
CREATE TABLE IF NOT EXISTS public.page_templates (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text,
  template_content text not null,
  category text default 'general'::text,
  is_system boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.pallet_inspections
CREATE TABLE IF NOT EXISTS public.pallet_inspections (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  pallet_id uuid not null,
  inspector_id uuid not null,
  inspection_date timestamptz default now(),
  inspection_type text not null,
  condition text not null,
  safety_compliant boolean default true,
  weight_verified boolean default false,
  items_counted boolean default false,
  damage_description text,
  corrective_actions text,
  next_inspection_date timestamptz,
  photos jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Table: public.pallet_items
CREATE TABLE IF NOT EXISTS public.pallet_items (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  pallet_id uuid not null,
  bottle_id uuid not null,
  quantity integer default 1,
  position_x integer,
  position_y integer,
  position_z integer,
  scanned_at timestamptz default now(),
  scanned_by uuid not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.pallet_movements
CREATE TABLE IF NOT EXISTS public.pallet_movements (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  pallet_id uuid not null,
  from_location text,
  to_location text,
  movement_type text not null,
  moved_by uuid not null,
  moved_at timestamptz default now(),
  expected_arrival timestamptz,
  actual_arrival timestamptz,
  status text not null default 'in_transit'::text,
  notes text,
  created_at timestamptz default now()
);

-- Table: public.pallet_templates
CREATE TABLE IF NOT EXISTS public.pallet_templates (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  description text,
  max_capacity integer not null default 50,
  item_types jsonb default '[]'::jsonb,
  safety_requirements jsonb default '[]'::jsonb,
  handling_instructions jsonb default '[]'::jsonb,
  weight_limit numeric(10,2),
  dimensions jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.pallets
CREATE TABLE IF NOT EXISTS public.pallets (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  template_id uuid,
  name text not null,
  description text,
  location text,
  max_capacity integer not null default 50,
  current_items integer default 0,
  weight numeric(10,2) default 0,
  status text not null default 'active'::text,
  priority text not null default 'medium'::text,
  barcode text,
  qr_code text,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.pricing_calculations
CREATE TABLE IF NOT EXISTS public.pricing_calculations (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  rental_id uuid,
  customer_id text,
  gas_type text not null,
  quantity integer not null,
  rental_days integer not null,
  base_cost numeric(10,2) not null default 0.00,
  tier_applied text,
  customer_discount_percent numeric(5,2) default 0.00,
  customer_discount_amount numeric(10,2) default 0.00,
  demurrage_cost numeric(10,2) default 0.00,
  subtotal numeric(10,2) not null default 0.00,
  tax_amount numeric(10,2) default 0.00,
  total_amount numeric(10,2) not null default 0.00,
  calculation_date timestamptz default now(),
  calculated_by uuid,
  is_estimate boolean default true,
  notes text
);

-- Table: public.pricing_tiers
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  name text not null,
  gas_type text not null default 'propane'::text,
  min_quantity integer not null default 1,
  max_quantity integer,
  daily_rate numeric(10,2) not null default 0.00,
  weekly_rate numeric(10,2) not null default 0.00,
  monthly_rate numeric(10,2) not null default 0.00,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid not null,
  name text,
  role text,
  created_at timestamptz default timezone('utc'::text, now()),
  full_name text,
  email text,
  organization_id uuid,
  role_id uuid,
  is_active boolean default true,
  disabled_at timestamptz,
  disabled_reason text,
  theme_accent text default '#1976d2'::text,
  theme_mode text default 'light'::text,
  preferences jsonb default '{}'::jsonb,
  deleted_at timestamptz
);

-- Table: public.regulatory_requirements
CREATE TABLE IF NOT EXISTS public.regulatory_requirements (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  requirement_name text not null,
  description text not null,
  regulatory_body text not null,
  requirement_type text not null,
  frequency text,
  last_completed timestamptz,
  next_due timestamptz,
  status text not null default 'active'::text,
  compliance_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.rental_calculations
CREATE TABLE IF NOT EXISTS public.rental_calculations (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  asset_id uuid not null,
  customer_id uuid not null,
  start_date date not null,
  end_date date not null,
  rental_days integer not null,
  base_rate numeric(10,2) not null,
  base_amount numeric(10,2) not null,
  demurrage_amount numeric(10,2) default 0,
  bracket_adjustment numeric(10,2) default 0,
  total_amount numeric(10,2) not null,
  currency text not null default 'USD'::text,
  calculation_details jsonb default '{}'::jsonb,
  calculated_by uuid not null,
  calculated_at timestamptz default now()
);

-- Table: public.rental_class_groups
CREATE TABLE IF NOT EXISTS public.rental_class_groups (
  id uuid not null default uuid_generate_v4(),
  organization_id uuid not null,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.rental_history
CREATE TABLE IF NOT EXISTS public.rental_history (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  asset_id uuid not null,
  customer_id uuid not null,
  rental_start_date date not null,
  rental_end_date date,
  expected_return_date date,
  actual_return_date date,
  rental_days integer,
  total_amount numeric(10,2) not null,
  currency text not null default 'USD'::text,
  status text not null default 'active'::text,
  payment_status text default 'pending'::text,
  notes text,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.rental_invoices
CREATE TABLE IF NOT EXISTS public.rental_invoices (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  rental_id uuid not null,
  invoice_number text not null,
  invoice_date date not null,
  due_date date not null,
  subtotal numeric(10,2) not null,
  tax_amount numeric(10,2) default 0,
  total_amount numeric(10,2) not null,
  currency text not null default 'USD'::text,
  status text not null default 'draft'::text,
  payment_terms text,
  notes text,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  customer_id text,
  customer_name text,
  customer_address text,
  customer_email text,
  template_id uuid,
  invoice_period_start date,
  invoice_period_end date
);

-- Table: public.rental_payments
CREATE TABLE IF NOT EXISTS public.rental_payments (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  rental_id uuid not null,
  invoice_id uuid,
  payment_amount numeric(10,2) not null,
  payment_date date not null,
  payment_method text,
  payment_reference text,
  currency text not null default 'USD'::text,
  status text not null default 'completed'::text,
  notes text,
  processed_by uuid not null,
  created_at timestamptz default now()
);

-- Table: public.rental_rates
CREATE TABLE IF NOT EXISTS public.rental_rates (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  rate_name text not null,
  rate_type text not null default 'daily'::text,
  base_rate numeric(10,2) not null default 0,
  currency text not null default 'USD'::text,
  effective_date date not null,
  expiry_date date,
  customer_type text default 'all'::text,
  asset_type text default 'all'::text,
  minimum_rental_period integer default 1,
  maximum_rental_period integer default 365,
  grace_period integer default 0,
  is_active boolean default true,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.rentals
CREATE TABLE IF NOT EXISTS public.rentals (
  id uuid not null default gen_random_uuid(),
  customer_id text,
  cylinder_id uuid,
  rental_type text not null,
  rental_start_date date not null,
  rental_end_date date,
  status text default 'active'::text,
  created_at timestamptz default timezone('utc'::text, now()),
  rental_amount numeric,
  location text,
  bottle_id uuid,
  tax_code text default 'pst+gst'::text,
  tax_rate numeric,
  organization_id uuid not null,
  customer_uuid uuid,
  next_billing_date date,
  last_billed_date date,
  billing_frequency text default 'monthly'::text,
  is_dns boolean default false,
  dns_product_code text,
  dns_description text,
  dns_order_number text,
  lease_agreement_id uuid,
  updated_at timestamptz default now(),
  bottle_barcode text,
  closed_by_order text,
  rental_order_number text,
  import_record_id uuid,
  customer_name text,
  rental_amount_manual boolean not null default false
);

-- Table: public.role_permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid not null default gen_random_uuid(),
  role_name text not null,
  display_name text,
  description text,
  permissions text[] default '{}'::text[],
  organization_id text default 'global'::text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.roles
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid not null default gen_random_uuid(),
  name text not null,
  description text,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.sales_orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid not null default gen_random_uuid(),
  order_number text,
  customer_id text,
  order_date date,
  item text,
  quantity numeric,
  unit_price numeric,
  total numeric,
  address text,
  notes text,
  created_at timestamptz default timezone('utc'::text, now()),
  customer_name text,
  gas_type text,
  sales_order_number text,
  shipped_bottles integer,
  returned_bottles integer,
  scanned_at timestamptz,
  organization_id uuid
);

-- Table: public.sales_track
CREATE TABLE IF NOT EXISTS public.sales_track (
  id integer not null default nextval('sales_track_id_seq'::regclass),
  customer_id text,
  customer_name text,
  transaction_date date,
  product_code text,
  sales_order text,
  quantity_out integer,
  quantity_in integer
);

-- Table: public.scan_errors
CREATE TABLE IF NOT EXISTS public.scan_errors (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  session_id uuid,
  barcode text not null,
  error_type text not null,
  error_message text,
  attempted_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz default now()
);

-- Table: public.scans
CREATE TABLE IF NOT EXISTS public.scans (
  id uuid not null default uuid_generate_v4(),
  organization_id uuid,
  barcode_number varchar(255) not null,
  action varchar(50) not null,
  location text,
  notes text,
  scanned_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  order_number text,
  customer_name text,
  customer_id text,
  status text default 'pending'::text,
  rejected_at timestamptz,
  rejected_by uuid,
  scanned_at timestamptz default now(),
  mode text,
  product_code text,
  verified_at timestamptz,
  verified_by uuid
);

-- Table: public.scheduled_jobs
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  id uuid not null default gen_random_uuid(),
  job_name varchar(100) not null,
  last_run timestamptz,
  next_run timestamptz,
  status varchar(20) default 'active'::character varying,
  run_count integer default 0,
  error_count integer default 0,
  last_error text,
  created_at timestamptz default now()
);

-- Table: public.settings
CREATE TABLE IF NOT EXISTS public.settings (
  id integer not null default nextval('settings_id_seq'::regclass),
  logo_url text
);

-- Table: public.sms_logs
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  phone_number text not null,
  message text not null,
  status text not null,
  external_id text,
  error text,
  sent_at timestamptz not null default now()
);

-- Table: public.subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid not null default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  price_interval text not null,
  features jsonb not null,
  max_cylinders integer not null,
  max_users integer not null,
  stripe_price_id text,
  is_active boolean default true,
  is_most_popular boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  max_customers integer,
  description text
);

-- Table: public.support_ticket_messages
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid not null default gen_random_uuid(),
  ticket_id uuid,
  sender text not null,
  message text not null,
  sender_email text,
  created_at timestamptz default now()
);

-- Table: public.support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid not null default gen_random_uuid(),
  organization_id uuid,
  user_id uuid,
  subject text not null,
  description text not null,
  category text not null,
  priority text not null default 'medium'::text,
  status text not null default 'open'::text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  assigned_to uuid,
  resolution text,
  tags text[] default '{}'::text[],
  attachments jsonb default '[]'::jsonb,
  resolved_at timestamptz,
  closed_at timestamptz
);

-- Table: public.transfer_history
CREATE TABLE IF NOT EXISTS public.transfer_history (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  from_customer_id text not null,
  from_customer_name text not null,
  to_customer_id text,
  to_customer_name text,
  asset_ids jsonb not null,
  asset_count integer not null,
  transfer_type text not null default 'customer_to_customer'::text,
  reason text default ''::text,
  wallet_hazardous boolean default false,
  requires_inspection boolean default false,
  transferred_at timestamptz not null,
  created_at timestamptz default now(),
  created_by_user_id uuid,
  transfer_method text default 'web_interface'::text
);

-- Table: public.truck_maintenance
CREATE TABLE IF NOT EXISTS public.truck_maintenance (
  id uuid not null default uuid_generate_v4(),
  truck_id uuid not null,
  organization_id uuid not null,
  maintenance_type varchar(50) not null,
  description text,
  scheduled_date date,
  completed_date date,
  cost numeric(10,2),
  mileage_at_service integer,
  service_provider varchar(255),
  parts_replaced text[],
  next_service_due date,
  status varchar(20) default 'scheduled'::character varying,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.truck_manifests
CREATE TABLE IF NOT EXISTS public.truck_manifests (
  id uuid not null default uuid_generate_v4(),
  organization_id uuid not null,
  truck_id uuid not null,
  driver_id uuid not null,
  manifest_number varchar(50),
  route_name varchar(100),
  planned_departure timestamptz,
  actual_departure timestamptz,
  estimated_return timestamptz,
  actual_return timestamptz,
  status varchar(20) default 'draft'::character varying,
  total_items integer default 0,
  loaded_items integer default 0,
  delivered_items integer default 0,
  returned_items integer default 0,
  loading_started_at timestamptz,
  loading_completed_at timestamptz,
  delivery_started_at timestamptz,
  delivery_completed_at timestamptz,
  reconciliation_completed_at timestamptz,
  notes text,
  fuel_start numeric(5,2),
  fuel_end numeric(5,2),
  mileage_start integer,
  mileage_end integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.trucks
CREATE TABLE IF NOT EXISTS public.trucks (
  id uuid not null default uuid_generate_v4(),
  organization_id uuid not null,
  license_plate varchar(20) not null,
  model varchar(100),
  make varchar(100),
  year integer,
  vin varchar(50),
  capacity_weight numeric(10,2),
  capacity_volume numeric(10,2),
  fuel_type varchar(20) default 'diesel'::character varying,
  status varchar(20) default 'idle'::character varying,
  current_manifest_id uuid,
  current_driver_id uuid,
  last_maintenance_date date,
  next_maintenance_date date,
  mileage integer default 0,
  fuel_level numeric(5,2) default 100.00,
  gps_latitude numeric(10,8),
  gps_longitude numeric(11,8),
  last_location_update timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.user_devices
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  organization_id uuid not null,
  device_token text not null,
  platform varchar(20) not null,
  device_model varchar(100),
  os_version varchar(50),
  app_version varchar(20),
  is_active boolean not null default true,
  last_seen timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: public.webhook_logs
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid not null default gen_random_uuid(),
  webhook_id uuid not null,
  event text not null,
  status text not null,
  response_code integer,
  response_body text,
  error text,
  sent_at timestamptz not null default now()
);

-- Table: public.webhooks
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  name text not null,
  url text not null,
  events jsonb not null default '["*"]'::jsonb,
  secret text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
