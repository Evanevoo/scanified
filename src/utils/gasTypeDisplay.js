/** Gas type catalog helpers (aligned with mobile gasTypeDisplay). */

export function getGasCode(gt) {
  return (gt?.product_code || gt?.type || '').trim();
}

export function getGasTypeShortLabel(gt) {
  const code = getGasCode(gt);
  const name = (gt?.type || gt?.description || '').trim();
  if (code && name && code.toLowerCase() !== name.toLowerCase()) {
    return `${code} · ${name}`;
  }
  return code || name || 'Unknown';
}

export function getGasTypeDetailLine(gt) {
  const parts = [
    gt?.type && gt?.product_code && gt.type !== gt.product_code ? gt.type : '',
    gt?.group_name || '',
    gt?.description || '',
    gt?.category || '',
  ].filter(Boolean);
  return [...new Set(parts)].join(' · ');
}

function matchScore(gt, q) {
  const code = (gt.product_code || '').toLowerCase();
  const type = (gt.type || '').toLowerCase();
  const group = (gt.group_name || '').toLowerCase();
  const desc = (gt.description || '').toLowerCase();

  if (code === q || type === q) return 100;
  if (code.startsWith(q) || type.startsWith(q)) return 80;
  if (group.startsWith(q)) return 60;
  if (code.includes(q) || type.includes(q)) return 40;
  if (group.includes(q) || desc.includes(q)) return 20;
  return 0;
}

export function filterGasTypesByCodeOrType(gasTypes, query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return gasTypes
    .map((gt) => ({ gt, score: matchScore(gt, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || getGasCode(a.gt).localeCompare(getGasCode(b.gt)))
    .slice(0, limit)
    .map(({ gt }) => gt);
}

export function gasTypeMatchesQuery(gt, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return matchScore(gt, q) > 0;
}
