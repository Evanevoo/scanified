import { filterActiveLeaseAgreements, fetchBillingWorkspaceData } from './billingWorkspaceService';
import {
  computeEffectiveMonthlyRate,
  computeRentalRateDisplayMeta,
} from '../utils/organizationRentalClassUtils';

/**
 * Same merge as /rentals: open rental rows + synthetic rows from assigned bottles,
 * lease mapping, ghost-row filter. Used so Home "Active rentals" matches Rentals counts.
 */
export function processBillingWorkspaceToFilteredRentals(data) {
  const {
    rentalsData,
    assignedBottles,
    allBottles,
    locationsData,
    customerPricing,
    leaseAgreements,
    customersData,
    organizationRentalClasses = [],
  } = data;

  const leaseAgreementsActive = filterActiveLeaseAgreements(leaseAgreements);

  // Create a map of bottles for quick lookup by barcode AND by bottle_id
  const bottlesMap = (allBottles || []).reduce((map, bottle) => {
    const barcode = bottle.barcode_number || bottle.barcode;
    if (barcode) {
      map[barcode] = bottle;
    }
    // Also map by bottle_id for rentals that reference bottles by ID
    if (bottle.id) {
      map[`id:${bottle.id}`] = bottle;
    }
    return map;
  }, {});

  const totalBottles = allBottles?.length || 0;
  const assignedBottlesCount = assignedBottles?.length || 0;
  const unassignedBottles = totalBottles - assignedBottlesCount;
  
  const allRentalData = [];
  const locationTaxMap = (locationsData || []).reduce((map, location) => {
    map[location.name.toUpperCase()] = location.total_tax_rate / 100; // Convert percentage to decimal
    return map;
  }, {});

  // Add rentals that have matching bottles in this organization
  // Also include DNS rentals (is_dns = true) even if they don't have matching bottles
  let rentalsIncluded = 0;
  let rentalsExcluded = 0;
  
  for (const rental of rentalsData || []) {
    // Try to find bottle by barcode first
    let bottle = bottlesMap[rental.bottle_barcode];
    
    // If not found by barcode, try by bottle_id (for rentals with placeholder barcodes)
    if (!bottle && rental.bottle_id) {
      bottle = bottlesMap[`id:${rental.bottle_id}`];
    }
    
    const isDNS = rental.is_dns === true;
    
    // Include rental if:
    // 1. It has a matching bottle (by barcode OR by bottle_id), OR
    // 2. It's a DNS rental, OR
    // 3. It has a bottle_id (bottle exists but barcode might be placeholder)
    if (bottle || isDNS || rental.bottle_id) {
      rentalsIncluded++;
      // For DNS rentals, use rental location or default
      const rentalLocation = bottle 
        ? (rental.location || bottle.location || 'SASKATOON').toUpperCase()
        : (rental.location || 'SASKATOON').toUpperCase();
      const locationTaxRate = locationTaxMap[rentalLocation] || rental.tax_rate || 0.11;
      
      allRentalData.push({
        ...rental,
        source: 'rental',
        bottles: bottle || null, // null for DNS rentals without bottles
        tax_rate: locationTaxRate,
        location: rentalLocation,
        is_dns: isDNS
      });
    } else {
      rentalsExcluded++;
    }
  }

  // Helper to detect placeholder barcodes (used in multiple places)
  const isPlaceholderBarcode = (barcode) => {
    if (!barcode || typeof barcode !== 'string') return false;
    const normalized = barcode.trim().toLowerCase();
    return normalized === 'delivered not-scanned' || 
           normalized === 'delivered not scanned' ||
           normalized === 'returned not-scanned' ||
           normalized === 'returned not scanned' ||
           normalized === 'not scanned' ||
           normalized === 'dns';
  };
  
  const rentalsByBottleId = (rentalsData || []).filter(r => r.bottle_id);
  if (rentalsByBottleId.length > 0) {
    let rentalsByBottleIdAdded = 0;
    // Add rentals that weren't already included (by bottle_id lookup)
    for (const rental of rentalsByBottleId) {
      const bottle = bottlesMap[`id:${rental.bottle_id}`] || bottlesMap[rental.bottle_barcode];
      const isDNS = rental.is_dns === true;
      
      // Check if this rental is already in allRentalData
      const alreadyIncluded = allRentalData.some(r => r.id === rental.id);
      
      // Include rental if:
      // 1. It has a matching bottle, OR
      // 2. It's a DNS rental, OR
      // 3. It has a bottle_id (even if bottle not found in bottlesMap - bottle might exist in assignedBottles)
      // We should include ALL rentals with bottle_id because those bottles exist (they're in assignedBottles)
      if (!alreadyIncluded && (bottle || isDNS || rental.bottle_id)) {
        const rentalLocation = bottle 
          ? (rental.location || bottle.location || 'SASKATOON').toUpperCase()
          : (rental.location || 'SASKATOON').toUpperCase();
        const locationTaxRate = locationTaxMap[rentalLocation] || rental.tax_rate || 0.11;
        
        allRentalData.push({
          ...rental,
          source: 'rental',
          bottles: bottle || null,
          tax_rate: locationTaxRate,
          location: rentalLocation,
          is_dns: isDNS
        });
        rentalsByBottleIdAdded++;
      }
    }
  }

  // Open rental row still points at old customer but bottle.assigned_customer was updated
  // (e.g. transfer path did not close/reopen rentals). filteredRentals drops those rows,
  // and the bottle_id was already "claimed" here so we never synthesize a row for the
  // real assignee — the asset disappears from Rentals. Prune stale rows first; DB cleanup
  // can still be done separately.
  const isStaleOpenRental = (r) => {
    if (r.source !== 'rental' || r.is_dns === true) return false;
    const bottle = r.bottles;
    if (!bottle) return false;
    const assigned = bottle.assigned_customer;
    if (assigned == null || assigned === '') return false;
    return String(assigned) !== String(r.customer_id);
  };
  const keptRentals = allRentalData.filter((r) => !isStaleOpenRental(r));
  allRentalData.length = 0;
  allRentalData.push(...keptRentals);

  // Add bottles that are assigned but don't have rental records
  // Track both barcodes AND bottle_ids to catch all cases
  const existingBottleBarcodes = new Set();
  const existingBottleIds = new Set();
  
  allRentalData.forEach(r => {
    // Only track real barcodes (not placeholders) to avoid false matches
    if (r.bottle_barcode && !isPlaceholderBarcode(r.bottle_barcode)) {
      existingBottleBarcodes.add(r.bottle_barcode);
    }
    if (r.bottle_id) existingBottleIds.add(r.bottle_id);
    if (r.bottles?.id) existingBottleIds.add(r.bottles.id);
  });
  
  const pricingMap = (customerPricing || []).reduce((map, pricing) => {
    map[pricing.customer_id] = pricing;
    return map;
  }, {});
  
  let bottlesAdded = 0;
  let bottlesSkipped = 0;
  
  for (const bottle of assignedBottles || []) {
    const barcode = bottle.barcode_number || bottle.barcode;
    const bottleId = bottle.id;
    const isPlaceholder = isPlaceholderBarcode(barcode);
    
    // Check if this bottle is already in rentals
    // For placeholder barcodes, only check by bottle_id (not barcode)
    // For real barcodes, check by both barcode AND bottle_id
    const alreadyInRentals = isPlaceholder
      ? (bottleId && existingBottleIds.has(bottleId))
      : ((barcode && existingBottleBarcodes.has(barcode)) || 
         (bottleId && existingBottleIds.has(bottleId)));
    
    if (!alreadyInRentals) {
      // New/extra bottle: default to monthly until admin switches to yearly (one lease per bottle)
      const customerPricing = pricingMap[bottle.assigned_customer];
      const rentalAmount = computeEffectiveMonthlyRate(
        customerPricing || null,
        bottle,
        organizationRentalClasses
      );
      const rentalType = 'monthly';
      
      // Get location-specific tax rate
      const bottleLocation = (bottle.location || 'SASKATOON').toUpperCase();
      const locationTaxRate = locationTaxMap[bottleLocation] || 0.11; // Default to 11% if location not found
      
      allRentalData.push({
        id: `bottle_${bottle.id}`,
        source: 'bottle_assignment',
        customer_id: bottle.assigned_customer,
        bottle_barcode: barcode || null, // Can be null for bottles without barcodes
        bottle_id: bottle.id,
        bottles: bottle,
        rental_start_date: bottle.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        rental_end_date: null,
        rental_amount: rentalAmount,
        rental_type: rentalType,
        tax_code: 'GST+PST',
        tax_rate: locationTaxRate,
        location: bottleLocation
      });
      
      // Track this bottle so we don't add it again
      // Only track real barcodes (not placeholders) in the barcode set to avoid false matches
      if (barcode && !isPlaceholder) {
        existingBottleBarcodes.add(barcode);
      }
      if (bottleId) {
        existingBottleIds.add(bottleId);
      }
      bottlesAdded++;
    } else {
      bottlesSkipped++;
    }
  }

  // Remove duplicates based on bottle_barcode OR bottle_id (keep rental records over bottle assignments)
  // For placeholder barcodes, use bottle_id as the unique identifier
  const deduplicatedData = [];
  const seenBarcodes = new Set();
  const seenBottleIds = new Set(); // Track bottle_ids for bottles without barcodes or with placeholder barcodes
  const duplicateBarcodes = new Map(); // Track which barcodes have duplicates
  
  // First pass: Add all rental records (priority over bottle assignments)
  let dnsRentalsIncluded = 0;
  for (const item of allRentalData) {
    if (item.source === 'rental') {
      const barcode = item.bottle_barcode;
      const bottleId = item.bottle_id || item.bottles?.id;
      const isDNS = item.is_dns === true;
      const isPlaceholder = isPlaceholderBarcode(barcode);
      
      // For placeholder barcodes or DNS, use bottle_id as unique identifier
      if (isDNS || isPlaceholder || !barcode || (typeof barcode === 'string' && barcode.trim() === '')) {
        // DNS rentals, placeholder barcodes, or rentals without barcode - use bottle_id
        if (bottleId && seenBottleIds.has(bottleId)) {
          // Duplicate bottle_id found
          duplicateBarcodes.set(barcode || 'no_barcode', (duplicateBarcodes.get(barcode || 'no_barcode') || 1) + 1);
      } else {
          deduplicatedData.push(item);
          if (isDNS) dnsRentalsIncluded++;
          if (bottleId) seenBottleIds.add(bottleId);
        }
      } else if (!seenBarcodes.has(barcode)) {
        // Real barcode - use barcode as unique identifier
        deduplicatedData.push(item);
        seenBarcodes.add(barcode);
        if (bottleId) seenBottleIds.add(bottleId);
      } else {
        duplicateBarcodes.set(barcode, (duplicateBarcodes.get(barcode) || 1) + 1);
      }
    }
  }
  
  // Second pass: Add bottle assignments only if no rental record exists
  let bottlesWithoutBarcode = 0;
  let placeholderBottlesAdded = 0;
  let placeholderBottlesSkipped = 0;
  
  for (const item of allRentalData) {
    if (item.source === 'bottle_assignment') {
      const barcode = item.bottle_barcode;
      const bottleId = item.bottle_id || item.bottles?.id;
      const isPlaceholder = isPlaceholderBarcode(barcode);
      
      // For placeholder barcodes, check by bottle_id only (barcode is not unique)
      // For real barcodes, check by both barcode AND bottle_id
      const alreadyIncluded = isPlaceholder
        ? (bottleId && seenBottleIds.has(bottleId))
        : ((barcode && seenBarcodes.has(barcode)) || (bottleId && seenBottleIds.has(bottleId)));
      
      if (alreadyIncluded) {
        // This is expected - rental record already exists for this barcode/bottle_id
        if (barcode && !isPlaceholder) {
          duplicateBarcodes.set(barcode, (duplicateBarcodes.get(barcode) || 1) + 1);
        }
        if (isPlaceholder) {
          placeholderBottlesSkipped++;
        }
      } else {
        // Include this bottle assignment
        deduplicatedData.push(item);
        // Only track real barcodes (not placeholders) in seenBarcodes
        // Always track bottle_id for both placeholders and real barcodes
        if (barcode && !isPlaceholder) {
          seenBarcodes.add(barcode);
        }
        if (bottleId) {
          seenBottleIds.add(bottleId);
        }
        if (isPlaceholder) {
          placeholderBottlesAdded++;
        }
        if (!barcode || (typeof barcode === 'string' && barcode.trim() === '')) {
          bottlesWithoutBarcode++;
        }
      }
    }
  }
  
  // Drive displayed billing from org classes + customer_pricing (not stale rentals.rental_amount).
  // Yearly / lease rows are adjusted in the lease pass below.
  const pricingMapForPatch = pricingMap;
  const patchedDeduped = deduplicatedData.map((rental) => {
    if (rental.source !== 'rental' || rental.is_dns) return rental;
    // Respect explicit per-rental overrides saved from the Rentals edit dialog.
    // Without this, the computed class/pricing default would overwrite the user's saved rate.
    if (rental.rental_amount_manual === true) return rental;
    const bottle = rental.bottles;
    if (!bottle) return rental;
    if ((rental.rental_type || 'monthly') === 'yearly') return rental;
    const computed = computeEffectiveMonthlyRate(
      pricingMapForPatch[rental.customer_id] || null,
      bottle,
      organizationRentalClasses
    );
    return { ...rental, rental_amount: computed };
  });

  // Per-bottle lease map: bottle_id -> agreement (one lease per bottle)
  const leaseByBottleId = (leaseAgreementsActive || [])
    .filter(a => a.bottle_id)
    .reduce((map, a) => { map[a.bottle_id] = a; return map; }, {});
  // Customer-level lease map: customer_id -> agreement (fallback when no per-bottle lease is linked)
  const leaseByCustomerId = (leaseAgreementsActive || [])
    .filter(a => !a.bottle_id && a.customer_id)
    .reduce((map, a) => {
      // Keep latest by end_date when multiple active customer-level agreements exist.
      const existing = map[a.customer_id];
      if (!existing) {
        map[a.customer_id] = a;
        return map;
      }
      const existingEnd = existing.end_date ? new Date(existing.end_date).getTime() : 0;
      const currentEnd = a.end_date ? new Date(a.end_date).getTime() : 0;
      if (currentEnd >= existingEnd) map[a.customer_id] = a;
      return map;
    }, {});

  // Use customers from initial batch (no extra round trips)
  const allCustomers = customersData || [];

  const customersMap = allCustomers.reduce((map, c) => {
    map[c.CustomerListID] = c;
    return map;
  }, {});

  const customerTypesMap = allCustomers.reduce((map, c) => {
    map[c.CustomerListID] = c.customer_type || 'CUSTOMER';
    return map;
  }, {});

  // Apply lease mapping:
  // 1) per-bottle lease (highest priority),
  // 2) explicit lease_agreement_id on rental,
  // 3) active customer-level lease (covers all that customer's open rentals when not tied to 1–2).
  //
  // Customer-level annual leases must apply even when rental rows still say monthly (default).
  // Otherwise the Yearly tab only shows rows with per-bottle lease links (~few) while Lease
  // Agreements lists many customer-level contracts.
  for (const rental of patchedDeduped) {
    const bottleId = rental.bottle_id || rental.bottles?.id;
    const agreementFromBottle = bottleId ? leaseByBottleId[bottleId] : null;
    const agreementFromRental = rental.lease_agreement_id && (leaseAgreements || []).find(a => a.id === rental.lease_agreement_id);
    const customerLease = !agreementFromBottle && !agreementFromRental
      ? leaseByCustomerId[rental.customer_id]
      : null;
    const agreement = agreementFromBottle || agreementFromRental || customerLease;
    if (agreement) {
      const billingFreq = (agreement.billing_frequency || '').toLowerCase();
      const isYearly = billingFreq === 'annual' || billingFreq === 'yearly' || billingFreq === 'annually' || billingFreq === 'semi-annual';
      if (isYearly) {
        rental.rental_type = 'yearly';
        rental.lease_agreement_id = agreement.id;
        rental.lease_agreement = agreement;
        // For per-bottle linked leases, use agreement annual amount to derive monthly equivalent.
        // For customer-level leases, keep existing rental_amount (agreement amount may cover many assets).
        if ((agreement.annual_amount || 0) > 0 && (agreementFromBottle || agreementFromRental)) {
          rental.rental_amount = agreement.annual_amount / 12;
        }
      }
    }
    // If rental came from DB without lease_agreement_id and bottle has no per-bottle lease, keep rental_type as-is (default monthly for new bottles)
  }

  // 7. Attach customer info to each rental (use patched list so zero amounts and lease edits apply)
  const rentalsWithCustomer = patchedDeduped.map((r) => ({
    ...r,
    customer: customersMap[r.customer_id] || null,
  }));

  // Drop ghost rows: customer was deleted but open rentals remain, or rental.customer_id
  // no longer matches who actually has the bottle (stale after transfer without closing rental).
  // Without this, customersWithRentals synthesizes a fake customer from rental.customer_name.
  const filteredRentals = rentalsWithCustomer.filter((r) => {
    if (!r.customer_id) return false;
    if (!customersMap[r.customer_id]) return false;

    const bottle = r.bottles;
    const assigned = bottle?.assigned_customer;
    if (bottle && assigned != null && assigned !== '' && String(assigned) !== String(r.customer_id)) {
      return false;
    }
    return true;
  });

  const filteredRentalsWithMeta = filteredRentals.map((r) => ({
    ...r,
    rental_rate_meta: computeRentalRateDisplayMeta(
      r,
      pricingMap[r.customer_id],
      organizationRentalClasses
    ),
  }));

  // Calculate statistics based on bottle status and customer assignment
  // IMPORTANT: Bottles at locations WITHOUT customers should be "in-house" (available), not "rented"
  
  // Count bottles by status and customer type (customerTypesMap from initial batch)
  // Bottles assigned to vendors are "with vendors" (in-house, no charge)
  const bottlesWithVendors = (assignedBottles || []).filter(bottle => {
    const customerType = customerTypesMap[bottle.assigned_customer] || 'CUSTOMER';
    return customerType === 'VENDOR';
  }).length;
  
  // Available/In-House = unassigned bottles + vendor bottles + assigned bottles with status "available" OR customer-owned bottles
  // Also includes bottles at locations without customer assignment (they're in-house)
  const assignedBottlesAvailable = (assignedBottles || []).filter(bottle => {
    const customerType = customerTypesMap[bottle.assigned_customer] || 'CUSTOMER';
    const ownershipValue = String(bottle.ownership || '').trim().toLowerCase();
    const isCustomerOwned = ownershipValue.includes('customer') || 
                           ownershipValue.includes('owned') || 
                           ownershipValue === 'customer owned';
    
    // Count as available if:
    // 1. Status is "available", OR
    // 2. Customer-owned (even if status is "rented", customer-owned should show as available)
    // 3. Assigned to vendor (vendors are in-house, no charge)
    return (bottle.status === 'available' || bottle.status === 'AVAILABLE') ||
           (isCustomerOwned && customerType !== 'VENDOR') ||
           customerType === 'VENDOR';
  }).length;
  
  // In-house total includes:
  // - Unassigned bottles (no customer, may have location)
  // - Vendor bottles (assigned to vendors)
  // - Assigned bottles with status "available" or customer-owned
  const inHouseTotal = unassignedBottles + bottlesWithVendors + assignedBottlesAvailable;
  
  return {
    filteredRentals: filteredRentalsWithMeta,
    allCustomers,
    locationsData: locationsData || [],
    customerTypesMap,
    bottlesWithVendors,
    inHouseTotal,
    unassignedBottles,
    assignedBottlesCount,
    totalBottles,
  };
}

export async function fetchWorkspaceFilteredRentals(organizationId) {
  const data = await fetchBillingWorkspaceData(organizationId);
  return processBillingWorkspaceToFilteredRentals(data);
}
