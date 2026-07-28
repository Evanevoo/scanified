-- Billing mode (rental vs lease) + lease contract tables
-- Run in Supabase SQL Editor after reviewing.
-- Rental: invoice quantities come from live bottle assignments (see app: subscriptionService.generateInvoice).
-- Lease: invoice quantities/prices come from lease_contract_items only.

-- ---------------------------------------------------------------------------
-- 1. customers.billing_mode
-- ---------------------------------------------------------------------------
alter table public.customers
  add column if not exists billing_mode text not null default 'rental';

alter table public.customers
  drop constraint if exists customers_billing_mode_check;

alter table public.customers
  add constraint customers_billing_mode_check
  check (billing_mode in ('rental', 'lease'));

comment on column public.customers.billing_mode is 'rental = bill from assigned bottles; lease = bill from lease_contract_items';

-- ---------------------------------------------------------------------------
-- 2. lease_contracts
-- ---------------------------------------------------------------------------
create table if not exists public.lease_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id text not null,
  billing_cycle text not null default 'yearly' check (billing_cycle = 'yearly'),
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_lease_contracts_org on public.lease_contracts(organization_id);
create index if not exists idx_lease_contracts_customer on public.lease_contracts(organization_id, customer_id);
create index if not exists idx_lease_contracts_dates on public.lease_contracts(organization_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- 3. lease_contract_items
-- ---------------------------------------------------------------------------
create table if not exists public.lease_contract_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_id uuid not null references public.lease_contracts(id) on delete cascade,
  asset_type_id uuid references public.asset_type_pricing(id) on delete set null,
  product_code text,
  contracted_quantity integer not null default 1 check (contracted_quantity >= 0),
  unit_price numeric(12,2),
  yearly_price numeric(12,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint lease_contract_items_price_present check (
    unit_price is not null or yearly_price is not null
  )
);

create index if not exists idx_lease_contract_items_contract on public.lease_contract_items(contract_id);
create index if not exists idx_lease_contract_items_org on public.lease_contract_items(organization_id);

-- ---------------------------------------------------------------------------
-- 4. invoice_line_items — link lease lines (subscription_item_id optional)
-- ---------------------------------------------------------------------------
alter table public.invoice_line_items
  add column if not exists lease_contract_item_id uuid references public.lease_contract_items(id) on delete set null;

create index if not exists idx_invoice_line_items_lease_item
  on public.invoice_line_items(lease_contract_item_id)
  where lease_contract_item_id is not null;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.lease_contracts enable row level security;

drop policy if exists "lease_contracts_select_org" on public.lease_contracts;
drop policy if exists "lease_contracts_insert_org" on public.lease_contracts;
drop policy if exists "lease_contracts_update_org" on public.lease_contracts;
drop policy if exists "lease_contracts_delete_org" on public.lease_contracts;

create policy "lease_contracts_select_org" on public.lease_contracts
  for select to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contracts.organization_id));

create policy "lease_contracts_insert_org" on public.lease_contracts
  for insert to authenticated
  with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contracts.organization_id));

create policy "lease_contracts_update_org" on public.lease_contracts
  for update to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contracts.organization_id))
  with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contracts.organization_id));

create policy "lease_contracts_delete_org" on public.lease_contracts
  for delete to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contracts.organization_id));

alter table public.lease_contract_items enable row level security;

drop policy if exists "lease_contract_items_select_org" on public.lease_contract_items;
drop policy if exists "lease_contract_items_insert_org" on public.lease_contract_items;
drop policy if exists "lease_contract_items_update_org" on public.lease_contract_items;
drop policy if exists "lease_contract_items_delete_org" on public.lease_contract_items;

create policy "lease_contract_items_select_org" on public.lease_contract_items
  for select to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contract_items.organization_id));

create policy "lease_contract_items_insert_org" on public.lease_contract_items
  for insert to authenticated
  with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contract_items.organization_id));

create policy "lease_contract_items_update_org" on public.lease_contract_items
  for update to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contract_items.organization_id))
  with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contract_items.organization_id));

create policy "lease_contract_items_delete_org" on public.lease_contract_items
  for delete to authenticated
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.organization_id = lease_contract_items.organization_id));
