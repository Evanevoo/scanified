import fs from 'node:fs';

const keyRe =
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZnVjdHR6YXN3bXFxaG1taGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5NDQ4NzMsImV4cCI6MjA2MTUyMDg3M30\.[A-Za-z0-9_-]+/g;

const urlRe = /https:\/\/jtfucttzaswmqqhmmhfb\.supabase\.co/g;

function patchJs(file, kind) {
  let s = fs.readFileSync(file, 'utf8');
  if (kind === 'anon') {
    s = s.replace(
      /const supabaseUrl = ['"]https:\/\/jtfucttzaswmqqhmmhfb\.supabase\.co['"];?/,
      "const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;\nif (!supabaseUrl) throw new Error('Missing VITE_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_URL');"
    );
    s = s.replace(
      /const supabaseAnonKey = ['"]eyJ[^'"]+['"];?/,
      "const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;\nif (!supabaseAnonKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY');"
    );
    s = s.replace(
      /const supabaseKey = ['"]eyJ[^'"]+['"];?/,
      "const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;\nif (!supabaseKey) throw new Error('Missing VITE_SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY');"
    );
  }
  s = s.replace(keyRe, 'REDACTED_USE_ENV');
  fs.writeFileSync(file, s);
  console.log('patched', file);
}

for (const f of [
  'gas-cylinder-mobile/test-app-functionality.js',
  'gas-cylinder-mobile/supabase.js',
  'gas-cylinder-mobile/fix-organization.js',
]) {
  patchJs(f, 'anon');
}

for (const f of [
  'gas-cylinder-mobile/app-ios.json',
  'gas-cylinder-mobile/app-ios-fixed.json',
]) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (j.expo?.extra) {
    delete j.expo.extra.EXPO_PUBLIC_SUPABASE_URL;
    delete j.expo.extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  }
  fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
  console.log('scrubbed', f);
}

// Final sweep: any remaining anon JWTs in tracked mobile configs
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const p = `${dir}/${ent.name}`;
    if (ent.isDirectory()) walk(p);
    else if (/\.(js|ts|tsx|json)$/.test(ent.name)) {
      const s = fs.readFileSync(p, 'utf8');
      if (keyRe.test(s)) {
        fs.writeFileSync(p, s.replace(keyRe, 'REDACTED_USE_ENV'));
        console.log('redacted leftover', p);
      }
    }
  }
}

walk('gas-cylinder-mobile');
walk('gas-cylinder-android');
