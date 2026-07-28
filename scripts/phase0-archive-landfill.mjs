/**
 * Phase 0 landfill cleanup: move root one-off docs/scripts into archive/.
 * Keeps README.md, package manifests, app source, and curated docs/.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const archiveRoot = path.join(root, 'archive', 'phase0-landfill');
fs.mkdirSync(archiveRoot, { recursive: true });

const keepExact = new Set([
  'README.md',
  'package.json',
  'package-lock.json',
  'components.json',
  'vite.config.js',
  'tailwind.config.js',
  'postcss.config.cjs',
  'babel.config.cjs',
  'jest.config.cjs',
  'jest.setup.js',
  'tsconfig.json',
  'tsconfig.node.json',
  'index.html',
  'netlify.toml',
  'vercel.json',
  'render.yaml',
  'app.json',
  '.env',
  '.env.example',
  '.env.development',
  '.env.production',
  '.gitignore',
  '.eslintignore',
  '.eslintrc.json',
  '.nvmrc',
  '.vercelignore',
]);

const keepDirs = new Set([
  '.git',
  '.cursor',
  '.github',
  'src',
  'public',
  'netlify',
  'docs',
  'sql',
  'supabase',
  'scripts',
  'shared',
  'gas-cylinder-mobile',
  'gas-cylinder-android',
  'qbwc-server',
  'backend',
  'backup-system',
  'legal-documents',
  'archive',
  'node_modules',
  'dist',
  'coverage',
]);

/** Root file patterns that are landfill (moved, not deleted). */
function shouldArchiveFile(name) {
  if (keepExact.has(name)) return false;
  if (name.startsWith('.')) return false;

  const lower = name.toLowerCase();
  if (lower.endsWith('.md')) return true;
  if (lower.endsWith('.sql')) return true;
  if (lower.endsWith('.html')) return true;
  if (lower.endsWith('.ps1')) return true;
  if (lower.endsWith('.sh') && lower.includes('build-and-submit')) return true;
  if (/^temp_/i.test(name)) return true;
  if (/^check[-_]/i.test(name)) return true;
  if (/^fix[-_]/i.test(name)) return true;
  if (/^debug/i.test(name)) return true;
  if (/^test[-_].*\.(js|html|jsx)$/i.test(name)) return true;
  if (/backup/i.test(name) && /\.(js|ps1|html)$/i.test(name)) return true;
  if (
    [
      'add-join-codes.js',
      'cleanup-duplicate-customers-safe.js',
      'cleanup-duplicate-customers-page.html',
      'bottle-import-template.csv',
      'bottle-import-instructions.md',
    ].includes(name)
  ) {
    return true;
  }
  return false;
}

const moved = [];
const skipped = [];

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  const name = entry.name;
  if (entry.isDirectory()) {
    if (name === 'backups' || name === 'src') {
      // handle below / skip keep dirs
    }
    continue;
  }
  if (!shouldArchiveFile(name)) {
    skipped.push(name);
    continue;
  }
  const from = path.join(root, name);
  const to = path.join(archiveRoot, name);
  fs.renameSync(from, to);
  moved.push(name);
}

// Dead source trees
const deadPaths = [
  'src/pages_backup',
  'src/pupages',
  'backups',
  'temp_home_old.jsx',
  'temp_bottle_management.jsx',
];

for (const rel of deadPaths) {
  const from = path.join(root, rel);
  if (!fs.existsSync(from)) continue;
  const to = path.join(archiveRoot, rel.replaceAll('/', '__'));
  fs.renameSync(from, to);
  moved.push(rel);
}

// Move curated-but-ad-hoc sql/ into supabase/legacy-sql (keep as reference)
const sqlDir = path.join(root, 'sql');
const legacySql = path.join(root, 'supabase', 'legacy-sql');
if (fs.existsSync(sqlDir) && !fs.existsSync(legacySql)) {
  fs.mkdirSync(path.dirname(legacySql), { recursive: true });
  fs.renameSync(sqlDir, legacySql);
  moved.push('sql -> supabase/legacy-sql');
}

fs.writeFileSync(
  path.join(archiveRoot, 'MANIFEST.json'),
  JSON.stringify(
    {
      archivedAt: new Date().toISOString(),
      count: moved.length,
      moved,
    },
    null,
    2
  )
);

console.log(
  JSON.stringify(
    {
      archived: moved.length,
      archiveRoot,
      sample: moved.slice(0, 15),
    },
    null,
    2
  )
);
