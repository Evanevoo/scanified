// Emergency localStorage cleanup script
// Run this in browser console if you still get quota errors

console.log('Cleaning up localStorage...');

// Clear all editAssetDraft entries
let cleaned = 0;
for (let i = localStorage.length - 1; i >= 0; i--) {
  const key = localStorage.key(i);
  if (key && key.startsWith('editAssetDraft_')) {
    localStorage.removeItem(key);
    cleaned++;
  }
}

console.log(`Cleaned ${cleaned} editAssetDraft entries`);

// Clear any other large entries that might be causing issues
const largeKeys = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    const value = localStorage.getItem(key);
    if (value && value.length > 100000) { // > 100KB
      largeKeys.push({ key, size: value.length });
    }
  }
}

console.log('Large localStorage entries found:', largeKeys);

// Optionally clear all localStorage (uncomment if needed)
// localStorage.clear();
// console.log('All localStorage cleared');

console.log('Cleanup complete!');
