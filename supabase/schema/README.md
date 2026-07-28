# Dump remote schema (full pg_dump)

Phase 0 captured a **column-level** baseline without Docker:

- `supabase/schema/remote_schema_baseline.sql`
- `supabase/schema/columns_inventory.json`
- `supabase/types/database.ts`

For a full dump (indexes, FKs, RLS, grants, views), use one of:

## Option A — Supabase CLI + Docker Desktop

```bash
npx supabase link --project-ref jtfucttzaswmqqhmmhfb
npx supabase db dump --linked -f supabase/schema/remote_pg_dump.sql
```

## Option B — pg_dump with database password

Get the DB password from Supabase Dashboard → Project Settings → Database, then:

```bash
pg_dump "postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres" ^
  --schema-only --no-owner --no-privileges ^
  -f supabase/schema/remote_pg_dump.sql
```

Do **not** commit database passwords. Prefer Option A with CLI login.
