/**
 * Canonical keys for bottle type summaries (customer rental summary, etc.)
 * so product codes and verbose descriptions merge (e.g. BAR300 + "ARGON BOTTLE - SIZE 300").
 */

function extractSizeFromText(text) {
  if (!text || typeof text !== 'string') return null;
  let m = text.match(/\bSIZE\s+(\d+)/i);
  if (m) return m[1];
  m = text.match(/(\d+)\s*cu\.?\s*ft\b/i);
  if (m) return m[1];
  return null;
}

function extractGasFromBottle(description, gasType) {
  const combined = `${gasType || ''} ${description || ''}`.toUpperCase();
  const gases = [
    'CHEMTANE',
    'ACETYLENE',
    'PROPANE',
    'ARGON',
    'OXYGEN',
    'NITROGEN',
    'HELIUM',
    'CO2',
    'HYDROGEN'
  ];
  for (const g of gases) {
    if (combined.includes(g)) return g;
  }
  return null;
}

/** Common 300-series SKU hints when only description + gas are present */
const GAS_SIZE_TO_SKU = {
  'ARGON|300': 'BAR300',
  'OXYGEN|300': 'BOX300',
  'NITROGEN|300': 'BNI300'
};

function looksLikeProductCode(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 3 || !/\d/.test(t)) return false;
  return /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(t);
}

/**
 * @param {Record<string, unknown>} bottle
 * @returns {string} Uppercase group key for counting (usually product code)
 */
export function getBottleSummaryGroupKey(bottle) {
  const pc = (bottle.product_code || '').toString().trim();
  if (pc) return pc.toUpperCase();

  const ty = (bottle.type || '').toString().trim();
  if (ty && looksLikeProductCode(ty)) return ty.toUpperCase();

  const desc = (bottle.description || '').toString();
  const size = extractSizeFromText(desc);
  const gas = extractGasFromBottle(desc, bottle.gas_type);
  if (gas && size) {
    const mapped = GAS_SIZE_TO_SKU[`${gas}|${size}`];
    if (mapped) return mapped;
    return `${gas}-${size}`;
  }

  const legacy = (bottle.type || bottle.description || 'Unknown').toString().trim();
  return legacy ? legacy.toUpperCase() : 'UNKNOWN';
}

/**
 * @param {Array<Record<string, unknown>>} bottles
 * @returns {Record<string, number>}
 */
export function summarizeBottlesByType(bottles) {
  const summary = {};
  (bottles || []).forEach((b) => {
    const k = getBottleSummaryGroupKey(b);
    summary[k] = (summary[k] || 0) + 1;
  });
  return summary;
}
