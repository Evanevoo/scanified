/**
 * Canonical rental classes (defaults mirror common TrackAbout-style brackets).
 * Customer overrides live in customer_pricing.rental_class_rates.
 */

export const RENTAL_CLASS_CATALOG = [
  {
    id: 'cyl_racks',
    group: 'Cylinder Rent',
    name: 'Racks',
    method: 'monthly',
    defaultDaily: null,
    defaultWeekly: null,
    defaultMonthly: 10,
  },
  {
    id: 'cyl_skid_packs',
    group: 'Cylinder Rent',
    name: 'Skid packs',
    method: 'monthly',
    defaultDaily: null,
    defaultWeekly: null,
    defaultMonthly: 175,
  },
  {
    id: 'cyl_skid_packs_6',
    group: 'Cylinder Rent',
    name: 'Skid packs 6',
    method: 'monthly',
    defaultDaily: null,
    defaultWeekly: null,
    defaultMonthly: 65,
  },
  {
    id: 'cyl_industrial',
    group: 'Cylinder Rent',
    name: 'Industrial cylinder',
    method: 'monthly',
    defaultDaily: null,
    defaultWeekly: null,
    defaultMonthly: 10,
  },
  {
    id: 'dep_cylinder',
    group: 'Deposit',
    name: 'Cylinder deposit',
    method: 'starting_balance',
    defaultDaily: null,
    defaultWeekly: null,
    defaultMonthly: 300,
  },
  {
    id: 'mac_300_diesel',
    group: 'Machine Rent',
    name: '300AMP DIESEL',
    method: 'equipment',
    defaultDaily: 165,
    defaultWeekly: 395,
    defaultMonthly: 1050,
  },
  {
    id: 'mac_300_gas',
    group: 'Machine Rent',
    name: '300AMP GAS',
    method: 'equipment',
    defaultDaily: 99,
    defaultWeekly: 275,
    defaultMonthly: 675,
  },
  {
    id: 'mac_400_diesel',
    group: 'Machine Rent',
    name: '400AMP DIESEL',
    method: 'equipment',
    defaultDaily: 225,
    defaultWeekly: 535,
    defaultMonthly: 1325,
  },
  {
    id: 'mac_multi_process',
    group: 'Machine Rent',
    name: 'Multi Process',
    method: 'equipment',
    defaultDaily: 35,
    defaultWeekly: 119,
    defaultMonthly: 355,
  },
];

const CATALOG_BY_ID = RENTAL_CLASS_CATALOG.reduce((m, c) => {
  m[c.id] = c;
  return m;
}, {});

export function getRentalClassById(id) {
  return CATALOG_BY_ID[id] || null;
}

export function formatRentalClassLabel(c) {
  if (!c) return '';
  return `${c.group}::${c.name}`;
}

/**
 * Best-effort mapping from a bottle row to a catalog class id.
 * Assign rental_class_key on the bottle later for explicit mapping.
 */
export function resolveBottleToRentalClassId(bottle) {
  if (!bottle) return null;
  const explicit = (bottle.rental_class_key || bottle.rental_class_id || '').toString().trim();
  if (explicit && CATALOG_BY_ID[explicit]) return explicit;

  const pc = (bottle.product_code || '').toUpperCase();
  const desc = `${bottle.description || ''} ${bottle.type || ''}`.toUpperCase();
  const cat = (bottle.category || '').toUpperCase();
  // Include category so "bulkpacks" / skid-only category rows still match (not just product/description)
  const blob = `${pc} ${desc} ${cat}`;

  if (cat.includes('EQUIPMENT') || desc.includes('WELDER') || desc.includes('AMP')) {
    if (blob.includes('400') && blob.includes('DIESEL')) return 'mac_400_diesel';
    if (blob.includes('300') && blob.includes('DIESEL')) return 'mac_300_diesel';
    if (blob.includes('300') && (blob.includes('GAS') || blob.includes('PROPANE'))) return 'mac_300_gas';
    if (blob.includes('MULTI') || blob.includes('MIG') || blob.includes('TIG')) return 'mac_multi_process';
  }

  // Skid / bulk: spaced "bulk pack", single-word bulkpack, 16pk, skid; category-only bulkpacks works via blob above
  if (/SKID|16\s*-?\s*PK|BULK\s*-?\s*PACKS?|BULKPACKS?|BULKPACK\b/i.test(blob)) {
    if (/\b6\b|6PK|X6|6-PACK|6\s*-?\s*PACK/i.test(blob)) return 'cyl_skid_packs_6';
    return 'cyl_skid_packs';
  }
  if (blob.includes('RACK')) return 'cyl_racks';

  if (cat.includes('INDUSTRIAL') || cat.includes('CYLINDER') || cat.includes('GAS')) {
    return 'cyl_industrial';
  }

  return 'cyl_industrial';
}

/**
 * Monthly-equivalent rate for workspace billing (mostly monthly rentals).
 */
export function getCatalogMonthlyBillable(classDef) {
  if (!classDef) return null;
  if (classDef.method === 'starting_balance') return null;
  if (classDef.defaultMonthly != null && classDef.defaultMonthly !== '') {
    const n = parseFloat(String(classDef.defaultMonthly));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
