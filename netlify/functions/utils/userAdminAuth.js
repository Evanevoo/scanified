/** Accept any standard UUID string (Postgres/Supabase); avoid strict version/variant checks. */
function toRoleUuid(raw) {
  let s = (raw || '').toString().trim();
  if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? s : null;
}

function normalizeRoleKey(name) {
  if (!name) return '';
  return String(name).toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

const ELEVATED_ROLE_KEYS = new Set([
  'admin',
  'administrator',
  'owner',
  'orgowner',
  'organizationowner',
  'manager',
]);

async function allowedByRoleRow(roleRow) {
  if (!roleRow) return false;
  const perms = Array.isArray(roleRow.permissions) ? roleRow.permissions : [];
  if (perms.includes('*') || perms.includes('manage:users')) return true;
  const key = normalizeRoleKey(roleRow.name);
  return ELEVATED_ROLE_KEYS.has(key);
}

/**
 * True if this profile may manage other users' passwords / recovery in the same org.
 */
async function requesterMaySetPasswords(supabase, profileRow) {
  const rawRole = (profileRow?.role || '').toString().trim();
  const rawRoleId = (profileRow?.role_id || '').toString().trim();

  const roleAsUuid = toRoleUuid(rawRole);
  if (roleAsUuid) {
    const { data: roleRow, error } = await supabase
      .from('roles')
      .select('name, permissions')
      .eq('id', roleAsUuid)
      .single();
    if (error) return false;
    return allowedByRoleRow(roleRow);
  }

  const roleIdAsUuid = toRoleUuid(rawRoleId);
  if (roleIdAsUuid) {
    const { data: roleRow, error } = await supabase
      .from('roles')
      .select('name, permissions')
      .eq('id', roleIdAsUuid)
      .single();
    if (error) return false;
    return allowedByRoleRow(roleRow);
  }

  if (!rawRole) return false;
  const key = normalizeRoleKey(rawRole);
  return ELEVATED_ROLE_KEYS.has(key);
}

module.exports = { requesterMaySetPasswords, toRoleUuid, normalizeRoleKey, ELEVATED_ROLE_KEYS };
