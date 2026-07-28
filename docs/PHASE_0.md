# Phase 0 — Stabilize (2026-07-28)

Foundation work so later rebuild phases are safe to ship.

## Done

1. **Supabase migrations**
   - Initialized `supabase/` and linked project `jtfucttzaswmqqhmmhfb`
   - Applied remote marker migration `phase0_baseline_marker`
   - Column-level schema snapshot: `supabase/schema/remote_schema_baseline.sql` (131 tables)
   - Inventory JSON: `supabase/schema/columns_inventory.json`
   - Generated types: `supabase/types/database.ts`
   - Historical ad-hoc SQL: `supabase/legacy-sql/` (moved from `sql/`)

2. **Secret hygiene**
   - Removed hardcoded Supabase anon keys from mobile `app.json` / `app.config.js` and helper scripts
   - Apps now require `VITE_SUPABASE_*` or `EXPO_PUBLIC_SUPABASE_*` from `.env` / EAS secrets
   - Updated `.env.example`

3. **Landfill cleanup**
   - Root one-off markdown/SQL/HTML/PS1/temp files moved to `archive/phase0-landfill/`
   - Dead trees (`src/pages_backup`, `src/pupages`, `backups`) archived when present
   - Curated docs remain in `docs/`

4. **CI**
   - `.github/workflows/ci.yml` — required: schema artifacts + Netlify lint
   - Unit tests run in CI with `continue-on-error` until the suite is cleaned (baseline locally: **102 passed / 58 failed / 28 suites**)

## Not done (needs your machine / decision)

- **Full `pg_dump`**: requires Docker Desktop (`npx supabase db dump --linked`) — see `supabase/schema/README.md`
- **RLS on 20 tables**: advisor found RLS disabled (including `cylinder_fills`, `organization_rental_classes`). Remediation SQL is staged at `supabase/schema/rls_disabled_tables_TODO.sql` — do **not** enable without adding policies first
- **Rotate anon key** (recommended): keys lived in git history; Dashboard → API → regenerate anon key, then update Netlify + EAS + local `.env`
- **EAS secrets**: set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for iOS/Android builds
- **Make tests blocking in CI**: fix or quarantine the 6 failing suites, then remove `continue-on-error` from `web-test`

## Next (Phase 1)

Extract domain services out of god pages (`ImportApprovals`, `CustomerDetail`, `Subscriptions`, `Settings`).
