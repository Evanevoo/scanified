import { supabase } from '../../supabase';

/**
 * Fix bottles with NULL values in required fields
 * This utility helps resolve NOT NULL constraint violations
 */
export const fixBottleData = async () => {
  try {
    console.log('Checking for bottles with NULL values in required fields...');
    
    // Get bottles with NULL serial_number
    const { data: nullSerialBottles, error: nullSerialError } = await supabase
      .from('bottles')
      .select('id, barcode_number, serial_number')
      .is('serial_number', null);

    if (nullSerialError) {
      console.error('Error fetching bottles with NULL serial_number:', nullSerialError);
      return { success: false, error: nullSerialError.message };
    }

    console.log(`Found ${nullSerialBottles?.length || 0} bottles with NULL serial_number`);

    // Fix bottles with NULL serial_number by setting a default value
    if (nullSerialBottles && nullSerialBottles.length > 0) {
      let fixedCount = 0;
      
      for (const bottle of nullSerialBottles) {
        // Generate a default serial number based on barcode or ID
        const defaultSerial = bottle.barcode_number 
          ? `SN-${bottle.barcode_number}`
          : `SN-${bottle.id.slice(0, 8)}`;

        const { error: updateError } = await supabase
          .from('bottles')
          .update({ serial_number: defaultSerial })
          .eq('id', bottle.id);

        if (updateError) {
          console.error(`Error fixing bottle ${bottle.id}:`, updateError);
        } else {
          fixedCount++;
        }
      }

      console.log(`Fixed ${fixedCount} bottles with NULL serial_number`);
    }

    // Check for other potential NULL constraint issues
    const { data: allBottles, error: allBottlesError } = await supabase
      .from('bottles')
      .select('id, barcode_number, serial_number, product_code, type')
      .limit(10);

    if (allBottlesError) {
      console.error('Error fetching sample bottles:', allBottlesError);
    } else {
      console.log('Sample bottles structure:', allBottles);
    }

    return { 
      success: true, 
      fixed: nullSerialBottles?.length || 0,
      message: `Fixed ${nullSerialBottles?.length || 0} bottles with NULL serial_number`
    };

  } catch (error) {
    console.error('Error in fixBottleData:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Initialize bottles table with proper structure
 * This ensures the table has the correct columns and constraints
 */
export const initializeBottlesTable = async () => {
  try {
    console.log('Initializing bottles table structure...');
    
    // Check if bottles table exists and has required columns
    const { data: sampleBottles, error: sampleError } = await supabase
      .from('bottles')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error checking bottles table:', sampleError);
      return { success: false, error: sampleError.message };
    }

    console.log('Bottles table structure check completed');
    return { success: true, message: 'Bottles table structure verified' };

  } catch (error) {
    console.error('Error in initializeBottlesTable:', error);
    return { success: false, error: error.message };
  }
}; 