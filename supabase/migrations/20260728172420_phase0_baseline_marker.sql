-- Phase 0 baseline marker (2026-07-28)
-- Establishes supabase migration history against the existing Scanified production schema.
-- Full column-level snapshot: ../schema/remote_schema_baseline.sql
-- Column inventory JSON: ../schema/columns_inventory.json
-- Generated TypeScript types: ../types/database.ts
-- Ad-hoc historical SQL moved to: ../legacy-sql/
--
-- Subsequent schema changes MUST be new timestamped files in this folder only.
-- Do not edit this marker after it has been applied.

comment on schema public is 'Scanified Phase 0 migration baseline established 2026-07-28';
