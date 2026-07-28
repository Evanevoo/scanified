import logger from '../utils/logger';
    // 2. Query all at once for existing customers (case-insensitive)
    logger.log('Checking existing customers...');
    const { data: existingCustomers, error: fetchError } = await supabase
      .from('customers')
      .select('CustomerListID, name');
    if (fetchError) {
      logger.error('Error fetching existing customers:', fetchError);
      setLoading(false);
      toast.error('Error checking existing customers');
      return;
    }
    
    // Create sets for both exact and case-insensitive matching
    const existingIdsExact = new Set((existingCustomers || []).map(c => c.CustomerListID));
    const existingIdsCaseInsensitive = new Set((existingCustomers || []).map(c => (c.CustomerListID || '').trim().toLowerCase()));
    
    logger.log('Existing customer IDs (exact):', Array.from(existingIdsExact));
    logger.log('Existing customer IDs (case-insensitive):', Array.from(existingIdsCaseInsensitive));
    logger.log('Raw existing customers data:', existingCustomers);

    // 3. Build list of new customers to create (deduplicated)
    const customersToCreate = [];
    const seenInBatch = new Set();
    for (const row of preview) {
      const cid = (row.customer_id || '').trim().toLowerCase();
      const exactCid = row.customer_id;
      logger.log('Processing row:', row.customer_id, '-> cid:', cid, 'exact:', exactCid);
      if (!cid) {
        logger.log('Skipping row with empty customer_id');
        continue;
      }
      
      // Check both exact and case-insensitive matches
      if (existingIdsExact.has(exactCid) || existingIdsCaseInsensitive.has(cid)) {
        logger.log('Customer already exists (exact or case-insensitive):', exactCid);
        skippedCustomers.push({
          CustomerListID: row.customer_id,
          name: row.customer_name,
          reason: 'already exists'
        });
      } else if (seenInBatch.has(cid)) {
        logger.log('Customer duplicate in batch:', cid);
        skippedCustomers.push({
          CustomerListID: row.customer_id,
          name: row.customer_name,
          reason: 'duplicate in file'
        });
      } else {
        logger.log('Adding customer to create list:', cid);
        customersToCreate.push({
          CustomerListID: row.customer_id,
          name: row.customer_name,
          barcode: `*%${(row.customer_id || '').toLowerCase().replace(/\s+/g, '')}*`,
          customer_barcode: `*%${(row.customer_id || '').toLowerCase().replace(/\s+/g, '')}*`
        });
        seenInBatch.add(cid);
      }
    } 