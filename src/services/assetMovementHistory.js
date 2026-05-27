import logger from '../utils/logger';

export const normalizeAuditDetails = (details) => {
  if (!details) return {};
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return normalizeAuditDetails(parsed);
    } catch {
      return {};
    }
  }
  if (typeof details === 'object') {
    if (details.field_changes && typeof details.field_changes === 'object') return details;
    if (details.details) return normalizeAuditDetails(details.details);
  }
  return {};
};

/**
 * After a BOTTLE_UPDATE audit, assignment lives in field_changes — use `.to` so movement UIs
 * show "Customer: …" instead of only branch location ("In-House: SASKATOON").
 */
export function postAssignmentFromAuditFieldChanges(parsedDetails) {
  const fc = parsedDetails?.field_changes;
  if (!fc || typeof fc !== 'object') {
    return { assigned_customer: null, customer_name: null };
  }
  const pickTo = (chg) => {
    if (!chg || typeof chg !== 'object') return null;
    const v = chg.to;
    if (v === undefined || v === null || v === '') return null;
    const s = String(v).trim();
    return s || null;
  };
  const assigned_customer = pickTo(fc.assigned_customer) || pickTo(fc.customer_id);
  const customer_name = pickTo(fc.customer_name);
  return { assigned_customer, customer_name };
}

export const stringifyHistoryDetails = (details) => {
  if (!details) return '';
  if (typeof details === 'string') return details;
  if (details.field_changes && typeof details.field_changes === 'object') {
    const lines = Object.entries(details.field_changes).map(([field, change]) => {
      const from = change?.from == null ? 'empty' : String(change.from);
      const to = change?.to == null ? 'empty' : String(change.to);
      return `${field}: ${from} -> ${to}`;
    });
    if (lines.length > 0) return lines.join(' | ');
  }
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
};

const movementActionFamily = (item) => {
  const ht = String(item?.history_type || '').toLowerCase();
  const mode = String(item?.mode || item?.action || '').toUpperCase();
  if (ht === 'rental_start' || mode === 'SHIP') return 'SHIP';
  if (ht === 'rental_end' || mode === 'RETURN') return 'RETURN';
  if (ht === 'rental_rnb' || mode === 'RNB') return 'RNB';
  if (ht === 'fill' || mode === 'FILL') return 'FILL';
  if (ht === 'transfer') return 'TRANSFER';
  return mode || ht || 'OTHER';
};

const movementEventDay = (item) => String(item?.created_at || '').slice(0, 10);

/** Prefer bottle_scans over rental rows when both describe the same day + action. */
const movementSourcePriority = (item) => {
  const ht = String(item?.history_type || '');
  if (ht === 'bottle_scan' || ht === 'cylinder_scan') return 3;
  if (ht === 'rental_start' || ht === 'rental_end' || ht === 'rental_rnb') return 1;
  if (ht === 'record_update') return 0;
  return 2;
};

/**
 * Collapse duplicate SHIP/RETURN from scans + rentals on the same calendar day.
 */
export function dedupeSemanticMovementHistory(items) {
  const list = Array.isArray(items) ? [...items] : [];
  const groups = new Map();
  for (const item of list) {
    const family = movementActionFamily(item);
    if (!['SHIP', 'RETURN', 'RNB'].includes(family)) continue;
    const day = movementEventDay(item);
    if (!day) continue;
    const key = `${String(item?.barcode_number || '').trim().toUpperCase()}|${day}|${family}`;
    const prev = groups.get(key);
    if (!prev || movementSourcePriority(item) > movementSourcePriority(prev)) {
      groups.set(key, item);
    }
  }
  const dropKeys = new Set(groups.keys());
  const out = [];
  const seenSemantic = new Set();
  for (const item of list) {
    const family = movementActionFamily(item);
    if (!['SHIP', 'RETURN', 'RNB'].includes(family)) {
      out.push(item);
      continue;
    }
    const day = movementEventDay(item);
    const key = `${String(item?.barcode_number || '').trim().toUpperCase()}|${day}|${family}`;
    if (!dropKeys.has(key)) {
      out.push(item);
      continue;
    }
    if (seenSemantic.has(key)) continue;
    seenSemantic.add(key);
    out.push(groups.get(key));
  }
  return out;
}

/** Stable key so distinct sources (scan vs rental) are never collapsed together. */
export function movementHistoryDedupeKey(item) {
  if (item?.id != null && String(item.id).trim() !== '') {
    return String(item.id);
  }
  return [
    item.created_at,
    item.action || item.mode,
    item.history_type || '',
    item.order_number || '',
    item.customer_name || '',
    item.customer_id || '',
  ].join('|');
}

/**
 * Merge scans, rentals (incl. RNB), fills, transfers, exceptions, audits, legacy asset_records, etc.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ organizationId: string, asset: object, perSourceLimit?: number, maxRecords?: number }} params
 * @returns {Promise<object[]>}
 */
export async function fetchMergedAssetMovementHistory(supabase, {
  organizationId,
  asset: sourceAsset,
  perSourceLimit = 200,
  maxRecords = 500,
}) {
  if (!organizationId || !sourceAsset) return [];

  const barcodeNumber = sourceAsset.barcode_number;
  const serialNumber = sourceAsset.serial_number;
  if (!barcodeNumber && !serialNumber) return [];

  let allHistory = [];
  const nowIso = new Date().toISOString();
  const limit = Math.max(50, Math.min(perSourceLimit, 500));

  const isMissingSourceError = (err) => {
    const msg = String(err?.message || '').toLowerCase();
    return (
      msg.includes('does not exist') ||
      msg.includes('could not find the table') ||
      msg.includes('relation') ||
      msg.includes('schema cache')
    );
  };

  const runOptionalQuery = async (queryFactory, sourceLabel) => {
    try {
      const { data, error } = await queryFactory();
      if (error) {
        if (!isMissingSourceError(error)) {
          logger.warn(`Movement history optional source failed (${sourceLabel}):`, error);
        }
        return [];
      }
      return data || [];
    } catch (err) {
      if (!isMissingSourceError(err)) {
        logger.warn(`Movement history optional source threw (${sourceLabel}):`, err);
      }
      return [];
    }
  };

  const barcodeVariants = (() => {
    const raw = String(barcodeNumber || '').trim();
    if (!raw) return [];
    const stripped = raw.replace(/^0+/, '') || raw;
    return [...new Set([raw, stripped])];
  })();

  const scansBarcodeOrClause = barcodeVariants
    .flatMap((b) => [
      `bottle_barcode.eq.${b}`,
      `barcode_number.eq.${b}`,
      `cylinder_barcode.eq.${b}`,
    ])
    .join(',');

  if (barcodeNumber) {
    const { data: bsData, error: bsError } = await supabase
      .from('bottle_scans')
      .select('*')
      .or(scansBarcodeOrClause)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!bsError && bsData) {
      bsData.forEach((scan) => {
        allHistory.push({
          ...scan,
          history_type: 'bottle_scan',
          barcode_number: scan.barcode_number || scan.bottle_barcode,
          action: scan.mode || 'SCAN',
        });
      });
    }

    if (!bsError && (!bsData || bsData.length === 0)) {
      const legacyScans = await runOptionalQuery(
        () =>
          supabase
            .from('scans')
            .select('*')
            .eq('organization_id', organizationId)
            .or(scansBarcodeOrClause)
            .order('created_at', { ascending: false })
            .limit(limit),
        'scans'
      );
      legacyScans.forEach((scan) => {
        allHistory.push({
          ...scan,
          id: scan.id || `legacy_scan_${scan.created_at}`,
          history_type: 'bottle_scan',
          barcode_number: scan.barcode_number || scan.bottle_barcode || barcodeNumber,
          action: scan.mode || scan.action || 'SCAN',
          mode: scan.mode || scan.action || 'SCAN',
        });
      });
    }
  }

  if (barcodeNumber) {
    const cylinderScanRows = await runOptionalQuery(
      () =>
        supabase
          .from('cylinder_scans')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit),
      'cylinder_scans'
    );
    const matchesCylinderScanBarcode = (scan) => {
      const haystack = JSON.stringify([scan?.ship_cylinders, scan?.return_cylinders]).toLowerCase();
      return barcodeVariants.some((b) => haystack.includes(String(b).toLowerCase()));
    };
    const filteredCylinderRows = cylinderScanRows.filter(matchesCylinderScanBarcode).slice(0, limit);
    filteredCylinderRows.forEach((scan) => {
      allHistory.push({
        ...scan,
        id: scan.id || `${scan.created_at || nowIso}_cylinder_scan`,
        history_type: 'cylinder_scan',
        barcode_number: barcodeNumber,
        customer_id: scan.customer_id || null,
        customer_name: scan.customer_name || null,
        location: scan.location || null,
        created_at: scan.created_at || scan.timestamp || nowIso,
        action: scan.mode || scan.action || 'SCAN',
        mode: scan.mode || scan.action || 'SCAN',
        order_number: scan.order_number || scan.invoice_number || null,
      });
    });
  }

  if (barcodeNumber || sourceAsset.id) {
    const rentalOrParts = [];
    barcodeVariants.forEach((b) => rentalOrParts.push(`bottle_barcode.eq.${b}`));
    if (sourceAsset.id) rentalOrParts.push(`bottle_id.eq.${sourceAsset.id}`);
    const { data: rentalsData, error: rentalsError } = await supabase
      .from('rentals')
      .select('*')
      .or(rentalOrParts.join(','))
      .eq('organization_id', organizationId)
      .order('rental_start_date', { ascending: false })
      .limit(limit);

    if (!rentalsError && rentalsData) {
      rentalsData.forEach((rental) => {
        const isRNB =
          rental.is_dns === true && (rental.dns_description || '').includes('Return not on balance');
        if (rental.rental_start_date) {
          allHistory.push({
            id: `rental_start_${rental.id}`,
            history_type: isRNB ? 'rental_rnb' : 'rental_start',
            barcode_number: rental.bottle_barcode || barcodeNumber,
            customer_id: rental.customer_id,
            customer_name: rental.customer_name,
            location: rental.location,
            created_at: rental.rental_start_date,
            action: isRNB ? 'RNB' : 'SHIP',
            mode: isRNB ? 'RNB' : 'SHIP',
            order_number: rental.dns_order_number || rental.order_number || null,
          });
        }
        if (rental.rental_end_date) {
          allHistory.push({
            id: `rental_end_${rental.id}`,
            history_type: 'rental_end',
            barcode_number: rental.bottle_barcode || barcodeNumber,
            customer_id: rental.customer_id,
            customer_name: rental.customer_name,
            location: rental.location,
            created_at: rental.rental_end_date,
            action: 'RETURN',
            mode: 'RETURN',
            order_number: rental.order_number || null,
          });
        }
      });
    }
  }

  if (sourceAsset.id && organizationId) {
    const exceptionRows = await runOptionalQuery(
      () =>
        supabase
          .from('asset_exceptions')
          .select('*')
          .eq('asset_id', sourceAsset.id)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit),
      'asset_exceptions'
    );
    exceptionRows.forEach((item) => {
      allHistory.push({
        ...item,
        id: `exception_${item.id}`,
        history_type: 'exception',
        barcode_number: barcodeNumber,
        customer_id: item.customer_id || null,
        customer_name: item.customer_name || null,
        location: item.location || sourceAsset.location || null,
        created_at: item.created_at || nowIso,
        action: item.exception_type ? `EXCEPTION: ${item.exception_type}` : 'EXCEPTION',
        mode: item.resolution_status || 'EXCEPTION',
        notes: item.resolution_note || item.notes || null,
        order_number: item.order_number || null,
      });
    });
  }

  if (organizationId && sourceAsset.id) {
    const transferRows = await runOptionalQuery(
      () =>
        supabase
          .from('transfer_history')
          .select('*')
          .eq('organization_id', organizationId)
          .contains('asset_ids', [sourceAsset.id])
          .order('created_at', { ascending: false })
          .limit(limit),
      'transfer_history'
    );
    transferRows.forEach((item) => {
      allHistory.push({
        ...item,
        id: `transfer_${item.id}`,
        history_type: 'transfer',
        barcode_number: barcodeNumber,
        customer_id: item.to_customer_id || item.from_customer_id || null,
        customer_name: item.to_customer_name || item.from_customer_name || null,
        location: null,
        created_at: item.transferred_at || item.created_at || nowIso,
        action: item.action || item.transfer_type || 'TRANSFER',
        mode: 'TRANSFER',
        notes: item.reason || null,
        order_number: item.order_number || null,
      });
    });
  }

  if (organizationId && sourceAsset.id) {
    let auditRows = await runOptionalQuery(
      () =>
        supabase
          .from('audit_logs')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('action', 'BOTTLE_UPDATE')
          .order('timestamp', { ascending: false })
          .limit(limit),
      'audit_logs'
    );
    const barcodeForAudit = String(barcodeNumber || '').trim();
    auditRows = (auditRows || []).filter((row) => {
      const details = row?.details || {};
      const detailBottleId = String(details?.bottle_id || '').trim();
      const detailBarcode = String(details?.barcode_number || '').trim();
      return (
        detailBottleId === String(sourceAsset.id) ||
        (barcodeForAudit && detailBarcode === barcodeForAudit)
      );
    });
    auditRows.forEach((item) => {
      const parsedDetails = normalizeAuditDetails(item.details);
      const postAssign = postAssignmentFromAuditFieldChanges(parsedDetails);
      const assignedAfter = postAssign.assigned_customer || null;
      const nameAfter = postAssign.customer_name || null;
      allHistory.push({
        ...item,
        id: `audit_${item.id}`,
        history_type: 'audit',
        barcode_number: barcodeNumber,
        customer_id: assignedAfter,
        assigned_customer: assignedAfter,
        customer_name: nameAfter,
        location: item.location || sourceAsset.location || null,
        created_at: item.timestamp || item.created_at || nowIso,
        action: item.action ? `AUDIT: ${item.action}` : 'AUDIT UPDATE',
        mode: item.action || 'AUDIT',
        notes: stringifyHistoryDetails(parsedDetails),
        details: parsedDetails,
        order_number: item.order_number || null,
      });
    });

    const auditByRecordId = await runOptionalQuery(
      () =>
        supabase
          .from('audit_logs')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('record_id', sourceAsset.id)
          .order('created_at', { ascending: false })
          .limit(limit),
      'audit_logs_record_id'
    );
    auditByRecordId.forEach((item) => {
      if (item.action === 'BOTTLE_UPDATE') return;
      const parsedDetails = normalizeAuditDetails(item.details);
      allHistory.push({
        ...item,
        id: `audit_rec_${item.id}`,
        history_type: 'audit',
        barcode_number: barcodeNumber,
        customer_id: null,
        customer_name: null,
        location: item.location || sourceAsset.location || null,
        created_at: item.timestamp || item.created_at || nowIso,
        action: item.action ? `AUDIT: ${item.action}` : 'AUDIT',
        mode: item.action || 'AUDIT',
        notes:
          stringifyHistoryDetails(parsedDetails) ||
          (typeof item.details === 'string' ? item.details : JSON.stringify(item.details || {})),
        details: parsedDetails,
        order_number: item.order_number || null,
      });
    });
  }

  if (barcodeNumber || sourceAsset.id) {
    const orClauses = [];
    barcodeVariants.forEach((b) => orClauses.push(`barcode_number.eq.${b}`));
    if (sourceAsset.id) orClauses.push(`cylinder_id.eq.${sourceAsset.id}`);

    let fillsQuery = supabase
      .from('cylinder_fills')
      .select('*')
      .or(orClauses.join(','))
      .order('fill_date', { ascending: false })
      .limit(limit);
    if (organizationId) {
      fillsQuery = fillsQuery.eq('organization_id', organizationId);
    }
    const { data: fillsData, error: fillsError } = await fillsQuery;

    if (!fillsError && fillsData) {
      fillsData.forEach((fill) => {
        allHistory.push({
          id: `fill_${fill.id}`,
          history_type: 'fill',
          barcode_number: fill.barcode_number || barcodeNumber,
          created_at: fill.fill_date || fill.created_at,
          action: 'FILL',
          mode: 'FILL',
          filled_by: fill.filled_by,
          notes: fill.notes,
        });
      });
    }
  }

  if (sourceAsset.id) {
    const legacyRecords = await runOptionalQuery(
      () =>
        supabase
          .from('asset_records')
          .select('*')
          .eq('asset_id', sourceAsset.id)
          .order('created_at', { ascending: false })
          .limit(limit),
      'asset_records'
    );
    legacyRecords.forEach((row) => {
      allHistory.push({
        ...row,
        id: row.id,
        history_type: 'asset_record',
        barcode_number: barcodeNumber,
        created_at: row.created_at || nowIso,
        action: row.type || row.action || 'RECORD',
        mode: row.type || row.mode || 'RECORD',
      });
    });
  }

  if (sourceAsset.created_at) {
    allHistory.push({
      id: 'bottle_created',
      history_type: 'creation',
      barcode_number: barcodeNumber,
      created_at: sourceAsset.created_at,
      action: 'Add New Asset',
      mode: 'CREATE',
      location: sourceAsset.location,
    });
  }
  if (
    sourceAsset.updated_at &&
    sourceAsset.created_at &&
    new Date(sourceAsset.updated_at).getTime() !== new Date(sourceAsset.created_at).getTime()
  ) {
    allHistory.push({
      id: 'bottle_last_updated',
      history_type: 'record_update',
      barcode_number: barcodeNumber,
      created_at: sourceAsset.updated_at,
      // Not a scan workflow — omit `mode` so UIs use `action` (otherwise "UPDATE" masks the real meaning).
      action: 'Asset record updated',
      location: sourceAsset.location,
      // bottles.location is often branch (e.g. SASKATOON) even when assigned_customer is set — include assignment so UI does not show “In-House” incorrectly.
      customer_name: sourceAsset.customer_name || null,
      customer_id: sourceAsset.customer_uuid || sourceAsset.customer_id || null,
      assigned_customer: sourceAsset.assigned_customer || null,
    });
  }

  const semanticDeduped = dedupeSemanticMovementHistory(allHistory);

  const seen = new Set();
  const uniqueHistory = [];
  for (const item of semanticDeduped) {
    const k = movementHistoryDedupeKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    uniqueHistory.push(item);
  }

  const sortKeyMs = (item) => {
    const t = new Date(item?.created_at ?? 0).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  uniqueHistory.sort((a, b) => {
    const diff = sortKeyMs(b) - sortKeyMs(a);
    if (diff !== 0) return diff;
    return String(movementHistoryDedupeKey(b)).localeCompare(String(movementHistoryDedupeKey(a)));
  });
  return uniqueHistory.slice(0, Math.max(50, Math.min(maxRecords, 1000)));
}
