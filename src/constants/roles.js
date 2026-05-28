/**
 * Scanified role model (multi-tenant SaaS)
 *
 * - `owner`     — Scanified platform operator (you). Manages all subscribing tenants
 *                 via /owner-portal. Must have organization_id = NULL.
 *
 * - `orgowner`  — Primary account holder for ONE tenant organization (e.g. WeldCor
 *                 Supplies). Full control inside that org; NOT the Scanified owner.
 *
 * - `admin`     — Organization administrator (delegated), same org as orgowner.
 * - `manager` / `user` — Standard tenant roles with reduced permissions.
 */

export const ROLE_PLATFORM_OWNER = 'owner';
export const ROLE_ORG_OWNER = 'orgowner';
export const ROLE_ADMIN = 'admin';
export const ROLE_MANAGER = 'manager';
export const ROLE_USER = 'user';

export const normalizeRoleKey = (role) => {
  if (!role) return '';
  return String(role).toLowerCase().trim().replace(/\s+/g, '');
};

/** Scanified platform owner (SaaS console), not a tenant subscriber */
export const isPlatformOwnerProfile = (profile) =>
  normalizeRoleKey(profile?.role) === ROLE_PLATFORM_OWNER && !profile?.organization_id;

/** Tenant org primary subscriber (e.g. WeldCor account owner) */
export const isOrgOwnerProfile = (profile) =>
  normalizeRoleKey(profile?.role) === ROLE_ORG_OWNER && !!profile?.organization_id;

/** Tenant-side admin powers: org subscriber or delegated admin */
export const isTenantOrgAdminProfile = (profile) => {
  const r = normalizeRoleKey(profile?.role);
  return r === ROLE_ADMIN || r === ROLE_ORG_OWNER;
};

export const isTenantManagerOrAboveProfile = (profile) => {
  const r = normalizeRoleKey(profile?.role);
  return r === ROLE_MANAGER || isTenantOrgAdminProfile(profile);
};

/** Misconfigured: platform role on a tenant profile */
export const isLegacyOwnerOnTenantProfile = (profile) =>
  normalizeRoleKey(profile?.role) === ROLE_PLATFORM_OWNER && !!profile?.organization_id;

export const roleDisplayName = (role) => {
  switch (normalizeRoleKey(role)) {
    case ROLE_PLATFORM_OWNER:
      return 'Scanified owner';
    case ROLE_ORG_OWNER:
      return 'Account owner';
    case ROLE_ADMIN:
      return 'Administrator';
    case ROLE_MANAGER:
      return 'Manager';
    case ROLE_USER:
      return 'Team member';
    default:
      return role || 'Unknown';
  }
};
