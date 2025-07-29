// Simple test to debug import issues
// Open browser console and run this to test import functionality

console.log('🔍 Testing Import Debug');

// Test 1: Check if user is authenticated
console.log('Current URL:', window.location.href);

// Test 2: Check if the import button exists
const importButton = document.querySelector('button[disabled]');
console.log('Import button found:', !!importButton);
console.log('Import button text:', importButton?.textContent);

// Test 3: Check if there are any console errors
console.log('Check the Network tab in DevTools for any failed requests');

// Test 4: Check if the file input exists
const fileInput = document.querySelector('input[type="file"]');
console.log('File input found:', !!fileInput);

// Test 5: Check local storage for any issues
console.log('Local storage keys:', Object.keys(localStorage));

// Instructions
console.log(`
🔧 Debugging Steps:
1. Check if you see "Importing..." text on the button
2. Look for any red errors in the Console tab
3. Check the Network tab for failed requests
4. Try refreshing the page and importing again
5. Check if the file you're importing has the correct format

📋 Next Steps:
- If you see "Importing..." but nothing happens, check the Network tab
- If there are console errors, share them with support
- If the button doesn't change to "Importing...", the click handler might not be working
`);

// Test the file upload trigger
function testFileUpload() {
  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.click();
    console.log('File input clicked - select a file to test');
  } else {
    console.log('No file input found');
  }
}

// Make the test function available globally
window.testFileUpload = testFileUpload;
console.log('Run testFileUpload() to test file selection'); 