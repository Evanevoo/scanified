/**
 * Shared app navigation metadata for the command palette and sidebar shortcuts.
 * Paths must match Sidebar menu items (see Sidebar.jsx menuSections).
 */

/** Role → up to 5 primary paths shown when “All pages” is collapsed. */
export const PRIMARY_SHORTCUTS_BY_ROLE = {
  user: ['/home', '/customers', '/assets', '/subscriptions', '/scanned-orders'],
  manager: ['/home', '/customers', '/assets', '/subscriptions', '/import-approvals'],
  admin: ['/home', '/customers', '/assets', '/subscriptions', '/settings'],
  orgowner: ['/home', '/customers', '/assets', '/subscriptions', '/settings'],
};

/** First visit: show full sectioned menu expanded by default only for these roles. */
export function getDefaultFullMenuExpanded(role) {
  const r = (role || '').toLowerCase();
  return r === 'admin' || r === 'orgowner';
}

function normPath(p) {
  if (!p) return '';
  const q = p.indexOf('?');
  return q >= 0 ? p.slice(0, q) : p;
}

/**
 * Flat list for command palette search (pages).
 * keywords: extra strings to match besides title/subtitle.
 */
export const APP_NAV_ROUTE_ENTRIES = [
  { path: '/home', title: 'Overview', subtitle: 'Home dashboard', keywords: ['dashboard', 'start'] },
  { path: '/industry-analytics', title: 'Industry Analytics', subtitle: 'Benchmarks and trends', keywords: ['analytics'] },
  { path: '/import', title: 'Import Data', subtitle: 'Bring data into the app', keywords: ['csv', 'upload'] },
  { path: '/bottles-for-day', title: 'Bottles for Day', subtitle: "Today's route planning", keywords: ['route', 'day'] },
  { path: '/scanned-orders', title: 'Scanned Orders', subtitle: 'Orders from scanning', keywords: ['scan'] },
  { path: '/import-approvals', title: 'Order Verification', subtitle: 'Approve pending imports', keywords: ['verify', 'approval'] },
  { path: '/verified-orders', title: 'Verified Orders', subtitle: 'Completed verifications', keywords: [] },
  { path: '/customers', title: 'Customer List', subtitle: 'Search accounts', keywords: ['accounts'] },
  { path: '/import-customer-info', title: 'Import Customer Info', subtitle: 'Upload customer updates', keywords: ['customer', 'import', 'upload', 'xlsx', 'csv'] },
  { path: '/locations', title: 'Locations', subtitle: 'Branches / sites list', keywords: ['branches', 'sites'] },
  { path: '/subscriptions', title: 'Rentals', subtitle: 'Active rentals & billing', keywords: ['rental', 'lease', 'plan'] },
  { path: '/organization-join-codes', title: 'Join Codes', subtitle: 'Invite users to the org', keywords: ['qr', 'invite'] },
  { path: '/bottle-management', title: 'Bottle Management', subtitle: 'Bottles and assignments', keywords: [] },
  { path: '/ownership-management', title: 'Ownership Management', subtitle: 'Who owns which assets', keywords: [] },
  { path: '/assets', title: 'Assets', subtitle: 'Full list and filters', keywords: ['inventory', 'cylinders'] },
  { path: '/bottle-locations', title: 'Where bottles are', subtitle: 'By warehouse or customer', keywords: ['locations', 'where'] },
  { path: '/asset-history-lookup', title: 'Asset History Lookup', subtitle: 'Trace a cylinder', keywords: ['history'] },
  { path: '/bottle-activity', title: 'Bottle Activity', subtitle: 'All bottle edit events', keywords: ['activity', 'audit', 'history', 'ownership', 'gas type'] },
  { path: '/recent-cylinders', title: 'Recently Added Cylinders', subtitle: 'New inventory', keywords: [] },
  { path: '/pricing/asset-types', title: 'Asset Type Pricing', subtitle: 'Default rates per product type', keywords: ['pricing', 'rates', 'monthly', 'yearly'] },
  { path: '/pricing/customers', title: 'Customer Pricing', subtitle: 'Overrides & discounts per customer', keywords: ['pricing', 'discount', 'override', 'bulk'] },
  { path: '/pricing/tax-regions', title: 'Tax Regions', subtitle: 'Location tax rates', keywords: ['tax', 'gst', 'pst', 'hst'] },
  { path: '/invoices/export', title: 'QuickBooks Export', subtitle: 'Export CSV for QuickBooks', keywords: ['quickbooks', 'qb', 'export', 'csv'] },
  { path: '/custom-reports', title: 'Custom Reports', subtitle: 'Build your own', keywords: [] },
  { path: '/settings?tab=team', title: 'Team', subtitle: 'Users and invites', keywords: ['users'] },
  { path: '/organization-tools', title: 'Organization Tools', subtitle: 'Org utilities', keywords: [] },
  { path: '/role-management', title: 'Roles & Permissions', subtitle: 'Access control', keywords: ['permissions'] },
  { path: '/settings', title: 'Settings', subtitle: 'Company preferences', keywords: ['preferences'] },
  { path: '/support', title: 'Support Center', subtitle: 'Org support tickets (signed-in)', keywords: ['help', 'tickets'] },
];

export function filterNavRoutesByQuery(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return APP_NAV_ROUTE_ENTRIES.filter((e) => {
    const blob = [e.title, e.subtitle, e.path, ...(e.keywords || [])].join(' ').toLowerCase();
    return blob.includes(q);
  });
}

export function getPrimaryPathsForRole(role) {
  const r = (role || '').toLowerCase();
  return PRIMARY_SHORTCUTS_BY_ROLE[r] || PRIMARY_SHORTCUTS_BY_ROLE.user;
}

/** Match a menu item from Sidebar flat list by path (ignores query on primary list). */
export function resolveShortcutItem(path, flatMenuItems) {
  const target = normPath(path);
  const exact = flatMenuItems.find((it) => normPath(it.path) === target);
  if (exact) return exact;
  return flatMenuItems.find((it) => it.path === path);
}
