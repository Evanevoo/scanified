// UUID validation fix utility
// This helps identify and fix UUID validation issues in the import process

// Check if a string is a valid UUID
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Check if a string looks like a customer ID (not a UUID)
function isCustomerID(str) {
  // Customer IDs typically contain letters and numbers but don't follow UUID format
  // Examples: "800001FB-1432145987N", "CUST-001", "12345"
  return str && !isValidUUID(str);
}

// Debug the problematic value
const problematicValue = "800001FB-1432145987N";

console.log('🔍 Debugging UUID validation issue:');
console.log('Value:', problematicValue);
console.log('Is valid UUID:', isValidUUID(problematicValue));
console.log('Is customer ID:', isCustomerID(problematicValue));
console.log('Length:', problematicValue.length);
console.log('Contains letters:', /[a-zA-Z]/.test(problematicValue));

// The issue is likely that this customer ID is being inserted into a UUID column
// Solutions:
console.log('\n💡 Solutions:');
console.log('1. Ensure customer IDs are inserted into TEXT columns, not UUID columns');
console.log('2. Check database schema - assigned_customer should be TEXT, not UUID');
console.log('3. Make sure organization_id (which IS a UUID) is handled separately');

// Test what the value should be
console.log('\n🔧 Value handling:');
console.log('As string:', String(problematicValue));
console.log('Trimmed:', problematicValue.trim());

export { isValidUUID, isCustomerID }; 