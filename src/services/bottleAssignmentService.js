/**
 * Shared bottle assignment service.
 * Wraps the database RPC for transactional bottle assignment during verification.
 * This consolidates the two divergent assignment implementations
 * (ImportApprovalDetail.jsx and ImportApprovals.jsx) into one consistent path.
 */
import { supabase } from '../supabase/client';
import logger from '../utils/logger';
import { finalizeVerifiedReturnBarcodes } from './finalizeVerifiedReturnBarcodes';
import {
  isTemporaryCustomerIdentity,
  resolveCustomerListId,
  isCustomerRowUuid,
} from '../utils/resolveCustomerListId';
import { findBottleRowByScanIdentifier } from '../utils/findBottleByScanIdentifier';
import { isCustomerOwnedOwnership, CUSTOMER_OWNED_STORED_STATUS } from '../utils/bottleOwnership';

/** Full customer row for RPC (`customers.id`) and direct ship updates. */
async function resolveCustomerForAssignment(organizationId, customerId, customerName) {
  const name = String(customerName || '').trim();
  const idHint = customerId != null && String(customerId).trim() !== '' ? String(customerId).trim() : '';
  let resolved = null;
  if (idHint && isCustomerRowUuid(idHint)) {
    resolved = await resolveCustomerListId(supabase, organizationId, idHint);
  } else if (idHint) {
    resolved = await resolveCustomerListId(supabase, organizationId, idHint);
  }
  if ((!resolved?.customerListId && !resolved?.id) && name) {
    resolved = await resolveCustomerListId(supabase, organizationId, name);
  }
  return resolved;
}

function isBottlesAssignedCustomerFkError(err) {
  const code = err?.code;
  const msg = String(err?.message || err || '');
  if (code === '23503' && msg.toLowerCase().includes('assigned_customer')) return true;
  return (
    msg.includes('bottles_assigned_customer_fkey') ||
    msg.includes('assigned_customer_fkey') ||
    (msg.includes('foreign key') && msg.includes('assigned_customer'))
  );
}

/**
 * Value for `bottles.assigned_customer`: this codebase (and fix-location-bottles-assignment.sql) treats it as
 * `customers."CustomerListID"`. Some DBs may FK to `customers.id` instead — callers try both when needed.
 */
async function resolveBottleAssignedCustomerKey(supabase, organizationId, customerRowId, customerListId) {
  const list = String(customerListId || '').trim();
  if (list) return list;
  const row = String(customerRowId || '').trim();
  if (!row) return null;
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('CustomerListID')
      .eq('organization_id', organizationId)
      .eq('id', row)
      .maybeSingle();
    if (error) {
      logger.warn('resolveBottleAssignedCustomerKey:', error.message);
      return null;
    }
    const cid = data?.CustomerListID != null ? String(data.CustomerListID).trim() : '';
    return cid || null;
  } catch (e) {
    logger.warn('resolveBottleAssignedCustomerKey:', e?.message || e);
    return null;
  }
}

/**
 * Ship-only assignment: writes `customers."CustomerListID"` to `bottles.assigned_customer` (standard in this app).
 * `rentals.customer_id` prefers CustomerListID for Customer Detail / reports.
 */
async function assignShippedBottlesWithCustomerListId({
  organizationId,
  shipBarcodes,
  customerRowId,
  customerListId,
  customerName,
  orderNumber,
  defaultRentalAmount = 10,
  defaultTaxRate = 0.11,
}) {
  const rowId = String(customerRowId || '').trim();
  const listId = String(customerListId || '').trim();
  const name = String(customerName || '').trim() || 'Customer';
  const listKey = await resolveBottleAssignedCustomerKey(
    supabase,
    organizationId,
    rowId,
    listId
  );
  const assignKeysOrdered = [];
  if (listKey) assignKeysOrdered.push(listKey);
  if (rowId && rowId !== listKey) assignKeysOrdered.push(rowId);

  if (assignKeysOrdered.length === 0) {
    return {
      success: false,
      error:
        'This customer has no CustomerListID in Customers. Add a list ID to the profile (or fix the import customer link), then retry.',
    };
  }
  const order = orderNumber != null ? String(orderNumber).trim() : '';
  let shipped = 0;
  const errors = [];

  for (const rawBc of shipBarcodes || []) {
    const barcode = String(rawBc || '').trim();
    if (!barcode) continue;

    const bottle = await findBottleRowByScanIdentifier(supabase, organizationId, barcode);
    if (!bottle) {
      errors.push(`${barcode}: bottle not found`);
      continue;
    }
    const canonicalBarcode = String(bottle.barcode_number || '').trim() || barcode;

    const current = String(bottle.assigned_customer || bottle.customer_name || '').trim();
    const isAtHome = !current;
    if (!isAtHome) {
      continue;
    }

    const today = new Date().toISOString().split('T')[0];
    const patchBase = {
      previous_assigned_customer: bottle.assigned_customer,
      previous_status: bottle.status,
      customer_name: name,
      status: isCustomerOwnedOwnership(bottle.ownership) ? CUSTOMER_OWNED_STORED_STATUS : 'rented',
      rental_start_date: today,
      last_verified_order: order || null,
      updated_at: new Date().toISOString(),
    };

    let upErr = null;
    for (const ac of assignKeysOrdered) {
      const { error } = await supabase
        .from('bottles')
        .update({ ...patchBase, assigned_customer: ac })
        .eq('id', bottle.id)
        .eq('organization_id', organizationId);
      upErr = error;
      if (!upErr) break;
      if (!isBottlesAssignedCustomerFkError(upErr)) break;
    }

    if (upErr) {
      errors.push(`${barcode}: ${upErr.message}`);
      continue;
    }
    shipped += 1;

    const { data: existingRental } = await supabase
      .from('rentals')
      .select('id')
      .eq('bottle_barcode', canonicalBarcode)
      .eq('organization_id', organizationId)
      .is('rental_end_date', null)
      .limit(1);

    if (!existingRental?.length) {
      const rentalCustomerId = listKey || listId || rowId;
      await supabase.from('rentals').insert({
        bottle_id: bottle.id,
        bottle_barcode: canonicalBarcode,
        customer_id: rentalCustomerId,
        customer_name: name,
        rental_start_date: today,
        rental_end_date: null,
        organization_id: organizationId,
        rental_amount: defaultRentalAmount,
        rental_type: 'monthly',
        tax_code: 'GST+PST',
        tax_rate: defaultTaxRate,
        location: bottle.location || 'SASKATOON',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (errors.length && shipped === 0) {
    return { success: false, error: errors.join('; ') };
  }
  return {
    success: true,
    data: {
      shipped,
      fallback: 'direct_ship_customer_list_id',
      warnings: errors.length ? errors : undefined,
    },
  };
}

function importRecordIdForRpc(importRecordId) {
  if (importRecordId == null || importRecordId === '') return null;
  const s = String(importRecordId).trim();
  if (!s) return null;
  return isCustomerRowUuid(s) ? s : null;
}

export const bottleAssignmentService = {
  /**
   * Assign bottles to a customer during order verification.
   * Uses the `assign_bottles_to_customer` RPC for transactional safety.
   *
   * @param {Object} params
   * @param {string} params.organizationId
   * @param {string} params.customerId - customers.id (uuid), CustomerListID, or other hint (resolved to uuid for RPC)
   * @param {string} params.customerName
   * @param {string[]} params.shipBarcodes - barcodes being shipped out
   * @param {string[]} params.returnBarcodes - barcodes being returned
   * @param {string} [params.importRecordId] - imported row PK only when it is a uuid (legacy numeric ids are omitted)
   * @param {string} [params.importTable] - 'imported_invoices' or 'imported_sales_receipts'
   * @param {number} [params.defaultRentalAmount=10] - monthly rental rate
   * @param {number} [params.defaultTaxRate=0.11] - tax rate
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async assignBottles({
    organizationId,
    customerId,
    customerName,
    shipBarcodes = [],
    returnBarcodes = [],
    importRecordId = null,
    importTable = 'imported_invoices',
    defaultRentalAmount = 10,
    defaultTaxRate = 0.11,
    orderNumber = null,
    endDate = null,
  }) {
    try {
      if (isTemporaryCustomerIdentity(customerId) || isTemporaryCustomerIdentity(customerName)) {
        return {
          success: false,
          error: 'Cannot assign bottles to temporary customer. Please select a real customer profile.',
        };
      }

      const { data: { user } } = await supabase.auth.getUser();

      const resolved = await resolveCustomerForAssignment(organizationId, customerId, customerName);
      if (!resolved?.customerListId && !resolved?.id) {
        return {
          success: false,
          error:
            'Could not resolve the order customer in Customers. Ensure the name or CustomerListID matches a profile in your organization, then retry.',
        };
      }

      const displayName =
        (resolved.name && String(resolved.name).trim()) || String(customerName || '').trim() || 'Customer';
      const pCustomerUuid = resolved.id ? String(resolved.id).trim() : null;

      const pImportId = importRecordIdForRpc(importRecordId);
      const hasReturns = Array.isArray(returnBarcodes) && returnBarcodes.length > 0;

      // Ship-only: direct bottle updates (skips RPC) when we can resolve CustomerListID (or customers.id fallback).
      if ((resolved.id || resolved.customerListId) && shipBarcodes?.length && !hasReturns) {
        const early = await assignShippedBottlesWithCustomerListId({
          organizationId,
          shipBarcodes,
          customerRowId: resolved.id,
          customerListId: resolved.customerListId,
          customerName: displayName,
          orderNumber,
          defaultRentalAmount,
          defaultTaxRate,
        });
        if (early.success) {
          return {
            success: true,
            data: {
              ...(early.data || {}),
              note: 'Assigned via direct ship path (CustomerListID on bottles; RPC skipped).',
            },
          };
        }
        logger.warn('bottleAssignmentService: direct ship assign failed, falling back to RPC', early.error);
      }

      if (pCustomerUuid) {
        const { data, error } = await supabase.rpc('assign_bottles_to_customer', {
          p_organization_id: organizationId,
          p_customer_id: pCustomerUuid,
          p_customer_name: displayName,
          p_ship_barcodes: shipBarcodes,
          p_return_barcodes: returnBarcodes,
          p_import_record_id: pImportId,
          p_import_table: importTable,
          p_user_id: user?.id || null,
          p_default_rental_amount: defaultRentalAmount,
          p_default_tax_rate: defaultTaxRate,
          p_order_number: orderNumber,
        });

        if (!error && !(data && data.success === false)) {
          logger.log('Bottle assignment result:', data);
          if (hasReturns) {
            await finalizeVerifiedReturnBarcodes(supabase, organizationId, {
              returnBarcodes,
              customerId: resolved.customerListId || resolved.id,
              customerName: displayName,
              orderNumber,
              endDate,
            });
          }
          return { success: true, data };
        }

        if (error && resolved.id && isBottlesAssignedCustomerFkError(error) && shipBarcodes?.length) {
          logger.warn(
            'assign_bottles_to_customer failed bottles FK; using direct ship fallback (CustomerListID / id on bottles)',
            error.message
          );
          const fb = await assignShippedBottlesWithCustomerListId({
            organizationId,
            shipBarcodes,
            customerRowId: resolved.id,
            customerListId: resolved.customerListId,
            customerName: displayName,
            orderNumber,
            defaultRentalAmount,
            defaultTaxRate,
          });
          if (fb.success) {
            if (hasReturns) {
              await finalizeVerifiedReturnBarcodes(supabase, organizationId, {
                returnBarcodes,
                customerId: resolved.customerListId || resolved.id,
                customerName: displayName,
                orderNumber,
                endDate,
              });
            }
            return {
              success: true,
              data: {
                ...(fb.data || {}),
                note:
                  returnBarcodes?.length > 0
                    ? 'Ship barcodes were assigned via direct ship fallback; return barcodes finalized separately (rentals closed / inventory cleared).'
                    : 'Ship barcodes were assigned via direct ship fallback (RPC vs FK mismatch).',
              },
            };
          }
        }

        if (error) {
          logger.error('assign_bottles_to_customer RPC error:', error);
          return { success: false, error: error.message };
        }

        if (data && data.success === false) {
          const derr = String(data.error || '');
          if (resolved.id && shipBarcodes?.length && isBottlesAssignedCustomerFkError({ message: derr })) {
            logger.warn(
              'assign_bottles_to_customer returned failure with bottles FK; using direct ship fallback',
              derr
            );
            const fb = await assignShippedBottlesWithCustomerListId({
              organizationId,
              shipBarcodes,
              customerRowId: resolved.id,
              customerListId: resolved.customerListId,
              customerName: displayName,
              orderNumber,
              defaultRentalAmount,
              defaultTaxRate,
            });
            if (fb.success) {
              if (hasReturns) {
                await finalizeVerifiedReturnBarcodes(supabase, organizationId, {
                  returnBarcodes,
                  customerId: resolved.customerListId || resolved.id,
                  customerName: displayName,
                  orderNumber,
                  endDate,
                });
              }
              return {
                success: true,
                data: {
                  ...(fb.data || {}),
                  note:
                    returnBarcodes?.length > 0
                      ? 'Ship barcodes were assigned via direct ship fallback; return barcodes finalized separately (rentals closed / inventory cleared).'
                      : 'Ship barcodes were assigned via direct ship fallback (RPC vs FK mismatch).',
                },
              };
            }
          }
          return { success: false, error: data.error || 'Assignment failed' };
        }
      }

      if ((resolved.id || resolved.customerListId) && shipBarcodes?.length) {
        return assignShippedBottlesWithCustomerListId({
          organizationId,
          shipBarcodes,
          customerRowId: resolved.id,
          customerListId: resolved.customerListId,
          customerName: displayName,
          orderNumber,
          defaultRentalAmount,
          defaultTaxRate,
        });
      }

      return {
        success: false,
        error:
          resolved.id || resolved.customerListId
            ? 'No ship barcodes to assign.'
            : 'Could not resolve customer; cannot assign bottles.',
      };
    } catch (err) {
      logger.error('bottleAssignmentService.assignBottles error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Unverify an order, reversing bottle assignments and cleaning up DNS records.
   * Uses the `unverify_order` RPC for transactional safety.
   */
  async unverifyOrder({
    importRecordId,
    importTable = 'imported_invoices',
    organizationId,
    orderNumber = null,
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('unverify_order', {
        p_import_record_id: importRecordIdForRpc(importRecordId),
        p_import_table: importTable,
        p_organization_id: organizationId,
        p_user_id: user?.id || null,
        p_order_number: orderNumber,
      });

      if (error) {
        logger.error('unverify_order RPC error:', error);
        return { success: false, error: error.message };
      }

      logger.log('Unverify result:', data);
      return { success: true, data };
    } catch (err) {
      logger.error('bottleAssignmentService.unverifyOrder error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Return bottles to warehouse, closing associated rentals.
   * Uses the `return_bottles_to_warehouse` RPC for transactional safety.
   */
  async returnToWarehouse({ bottleIds, organizationId }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('return_bottles_to_warehouse', {
        p_bottle_ids: bottleIds,
        p_organization_id: organizationId,
        p_user_id: user?.id || null,
      });

      if (error) {
        logger.error('return_bottles_to_warehouse RPC error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      logger.error('bottleAssignmentService.returnToWarehouse error:', err);
      return { success: false, error: err.message };
    }
  },
};

export default bottleAssignmentService;
