// Test script to check InventoryManagement import
import('./src/pages/InventoryManagement.jsx')
  .then(module => {
    console.log('✅ InventoryManagement imported successfully');
    console.log('Default export:', module.default);
  })
  .catch(error => {
    console.error('❌ Error importing InventoryManagement:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  });
