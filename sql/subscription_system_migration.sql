-- Subscription System Migration
-- Creates new subscription-oriented tables to replace legacy rental/lease/billing tables.
-- Old tables (rentals, lease_agreements, customer_pricing, pricing_tiers, organization_rental_classes)
-- are left in place for data reference but will no longer be used by application code.

-- ============================================================
-- 1. subscription_plans — org-level plan templates
-- ============================================================
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  billing_period text not null check (billing_period in ('monthly', 'yearly')),
  base_price numeric(12,2) not null default 0,
  yearly_discount_percent numeric(5,2) default 0,
  is_default boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscription_plans_org on public.subscription_plans(organization_id);

-- ============================================================
-- 2. subscriptions — one active subscription per customer
-- ============================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id text not null,
  plan_id uuid references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'expired')),
  billing_period text not null check (billing_period in ('monthly', 'yearly')),
  start_date date not null,
  current_period_start date,
  current_period_end date,
  next_billing_date date,
  cancellation_policy text default 'end_of_term' check (cancellation_policy in ('end_of_term', 'immediate')),
  cancelled_at timestamptz,
  auto_renew boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscriptions_org on public.subscriptions(organization_id);
create index idx_subscriptions_customer on public.subscriptions(organization_id, customer_id);
create index idx_subscriptions_status on public.subscriptions(organization_id, status);
create index idx_subscriptions_next_billing on public.subscriptions(next_billing_date) where status = 'active';

-- ============================================================
-- 3. subscription_items — line items per subscription
-- ============================================================
create table if not exists public.subscription_items (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_code text,
  category text,
  description text,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'removed')),
  added_at timestamptz default now(),
  removed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscription_items_sub on public.subscription_items(subscription_id);
create index idx_subscription_items_org on public.subscription_items(organization_id);

-- ============================================================
-- 4. asset_type_pricing — org default pricing per asset type
-- ============================================================
create table if not exists public.asset_type_pricing (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_code text,
  category text,
  description text,
  monthly_price numeric(12,2) not null default 0,
  yearly_price numeric(12,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organization_id, product_code)
);

create index idx_asset_type_pricing_org on public.asset_type_pricing(organization_id);

-- ============================================================
-- 5. customer_pricing_overrides — per-customer price overrides
-- ============================================================
create table if not exists public.customer_pricing_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
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

create index idx_cust_pricing_overrides_org on public.customer_pricing_overrides(organization_id);
create index idx_cust_pricing_overrides_cust on public.customer_pricing_overrides(organization_id, customer_id);

-- ============================================================
-- 6. invoices (new version — rename old if conflicts)
-- ============================================================
-- If old invoices table exists, we add columns instead of recreating.
-- For a clean org this creates the full table.

create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id),
  customer_id text not null,
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'void')),
  period_start date,
  period_end date,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  tax_code text default 'GST+PST',
  total_amount numeric(12,2) not null default 0,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_sub_invoices_org on public.subscription_invoices(organization_id);
create index idx_sub_invoices_customer on public.subscription_invoices(organization_id, customer_id);
create index idx_sub_invoices_subscription on public.subscription_invoices(subscription_id);
create index idx_sub_invoices_status on public.subscription_invoices(organization_id, status);

-- ============================================================
-- 7. invoice_line_items
-- ============================================================
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.subscription_invoices(id) on delete cascade,
  subscription_item_id uuid references public.subscription_items(id),
  product_code text,
  description text,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

create index idx_invoice_line_items_invoice on public.invoice_line_items(invoice_id);

-- ============================================================
-- 8. payments
-- ============================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.subscription_invoices(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  payment_method text,
  payment_date date not null default current_date,
  reference_number text,
  notes text,
  created_at timestamptz default now()
);

create index idx_payments_invoice on public.payments(invoice_id);
create index idx_payments_org on public.payments(organization_id);

-- ============================================================
-- 9. tax_regions
-- ============================================================
create table if not exists public.tax_regions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  province text not null default '',
  city text,
  region_name text,
  gst_rate numeric(5,2) not null default 0,
  pst_rate numeric(5,2) not null default 0,
  hst_rate numeric(5,2) not null default 0,
  total_rate numeric(5,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tax_regions_org on public.tax_regions(organization_id);

-- ============================================================
-- RLS Policies — all tables: org-scoped for authenticated users
-- ============================================================

-- Helper: reusable check
-- exists(select 1 from profiles p where p.id = auth.uid() and p.organization_id = <table>.organization_id)

do $$
declare
  t text;
  tables text[] := array[
    'subscription_plans',
    'subscriptions',
    'subscription_items',
    'asset_type_pricing',
    'customer_pricing_overrides',
    'subscription_invoices',
    'invoice_line_items',
    'payments',
    'tax_regions'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    execute format($p$
      create policy "%1$s_select_org" on public.%1$I
      for select to authenticated
      using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = %1$I.organization_id))
    $p$, t);

    execute format($p$
      create policy "%1$s_insert_org" on public.%1$I
      for insert to authenticated
      with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = %1$I.organization_id))
    $p$, t);

    execute format($p$
      create policy "%1$s_update_org" on public.%1$I
      for update to authenticated
      using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = %1$I.organization_id))
      with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = %1$I.organization_id))
    $p$, t);

    execute format($p$
      create policy "%1$s_delete_org" on public.%1$I
      for delete to authenticated
      using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = %1$I.organization_id))
    $p$, t);
  end loop;
end $$;

-- invoice_line_items uses invoice_id join instead of direct organization_id
-- Override: drop the auto-generated policies and use join-based ones
drop policy if exists "invoice_line_items_select_org" on public.invoice_line_items;
drop policy if exists "invoice_line_items_insert_org" on public.invoice_line_items;
drop policy if exists "invoice_line_items_update_org" on public.invoice_line_items;
drop policy if exists "invoice_line_items_delete_org" on public.invoice_line_items;

create policy "invoice_line_items_select_org" on public.invoice_line_items
  for select to authenticated
  using (exists(
    select 1 from public.subscription_invoices i
    join public.profiles p on p.id = auth.uid() and p.organization_id = i.organization_id
    where i.id = invoice_line_items.invoice_id
  ));

create policy "invoice_line_items_insert_org" on public.invoice_line_items
  for insert to authenticated
  with check (exists(
    select 1 from public.subscription_invoices i
    join public.profiles p on p.id = auth.uid() and p.organization_id = i.organization_id
    where i.id = invoice_line_items.invoice_id
  ));

create policy "invoice_line_items_update_org" on public.invoice_line_items
  for update to authenticated
  using (exists(
    select 1 from public.subscription_invoices i
    join public.profiles p on p.id = auth.uid() and p.organization_id = i.organization_id
    where i.id = invoice_line_items.invoice_id
  ))
  with check (exists(
    select 1 from public.subscription_invoices i
    join public.profiles p on p.id = auth.uid() and p.organization_id = i.organization_id
    where i.id = invoice_line_items.invoice_id
  ));

create policy "invoice_line_items_delete_org" on public.invoice_line_items
  for delete to authenticated
  using (exists(
    select 1 from public.subscription_invoices i
    join public.profiles p on p.id = auth.uid() and p.organization_id = i.organization_id
    where i.id = invoice_line_items.invoice_id
  ));
