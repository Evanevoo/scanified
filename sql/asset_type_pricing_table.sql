-- Create public.asset_type_pricing only (org default rates per product code / SKU).
--
-- Use this when sql/asset_type_pricing_classification_node.sql fails because the table
-- does not exist yet, and you do not want to run the full sql/subscription_system_migration.sql.
--
-- PREREQUISITE: public.organizations(id) must exist (standard app schema).
--
-- After this succeeds, run (in order):
--   1. sql/asset_classification_nodes.sql (if you have not already)
--   2. sql/asset_type_pricing_classification_node.sql

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

create index if not exists idx_asset_type_pricing_org on public.asset_type_pricing(organization_id);

-- Org-scoped RLS for authenticated users (same pattern as subscription_system_migration.sql).
alter table public.asset_type_pricing enable row level security;

drop policy if exists "asset_type_pricing_select_org" on public.asset_type_pricing;
drop policy if exists "asset_type_pricing_insert_org" on public.asset_type_pricing;
drop policy if exists "asset_type_pricing_update_org" on public.asset_type_pricing;
drop policy if exists "asset_type_pricing_delete_org" on public.asset_type_pricing;

create policy "asset_type_pricing_select_org" on public.asset_type_pricing
  for select to authenticated
  using (exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.organization_id = asset_type_pricing.organization_id
  ));

create policy "asset_type_pricing_insert_org" on public.asset_type_pricing
  for insert to authenticated
  with check (exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.organization_id = asset_type_pricing.organization_id
  ));

create policy "asset_type_pricing_update_org" on public.asset_type_pricing
  for update to authenticated
  using (exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.organization_id = asset_type_pricing.organization_id
  ))
  with check (exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.organization_id = asset_type_pricing.organization_id
  ));

create policy "asset_type_pricing_delete_org" on public.asset_type_pricing
  for delete to authenticated
  using (exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.organization_id = asset_type_pricing.organization_id
  ));
