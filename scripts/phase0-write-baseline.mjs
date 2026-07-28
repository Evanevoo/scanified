import fs from 'node:fs';
import path from 'node:path';

const ddlPath =
  'C:/Users/Shane/.cursor/projects/c-Users-Shane-Projects-scanified/agent-tools/6659d720-8aa4-4bd7-9ecc-1f3149c670ef.txt';
const colsPath =
  'C:/Users/Shane/.cursor/projects/c-Users-Shane-Projects-scanified/agent-tools/a5ba0e63-f345-4a79-a55c-781d917e50b9.txt';

function extractJsonArray(raw) {
  let text = raw;
  try {
    const outer = JSON.parse(raw);
    if (typeof outer.result === 'string') text = outer.result;
    else if (Array.isArray(outer)) return outer;
  } catch {
    // fall through — raw may already be the MCP wrapper string
  }
  const start = text.indexOf('[{');
  const end = text.lastIndexOf('}]');
  if (start < 0 || end < 0) {
    throw new Error('Could not find JSON array in MCP payload');
  }
  return JSON.parse(text.slice(start, end + 2));
}

const root = process.cwd();
fs.mkdirSync(path.join(root, 'supabase/migrations'), { recursive: true });
fs.mkdirSync(path.join(root, 'supabase/schema'), { recursive: true });

const ddlRows = extractJsonArray(fs.readFileSync(ddlPath, 'utf8'));
const colRows = extractJsonArray(fs.readFileSync(colsPath, 'utf8'));

fs.writeFileSync(
  path.join(root, 'supabase/schema/columns_inventory.json'),
  JSON.stringify(colRows, null, 2)
);

const header = `/*
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

`;

const body = ddlRows.map((r) => r.ddl).join('\n\n');
const migrationPath = path.join(
  root,
  'supabase/migrations/20260728120000_remote_schema_baseline.sql'
);
fs.writeFileSync(migrationPath, `${header}${body}\n`);

console.log(
  JSON.stringify(
    {
      migrationPath,
      tables: ddlRows.length,
      columns: colRows.length,
      bytes: fs.statSync(migrationPath).size,
    },
    null,
    2
  )
);
