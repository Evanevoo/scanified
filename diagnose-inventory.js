// Diagnostic script for InventoryManagement.jsx
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'InventoryManagement.jsx');

console.log('🔍 Checking InventoryManagement.jsx file...');

try {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error('❌ File does not exist:', filePath);
    process.exit(1);
  }

  // Read file content
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('✅ File exists and is readable');
  console.log('📏 File size:', content.length, 'characters');
  console.log('📄 Number of lines:', content.split('\n').length);

  // Check for basic syntax issues
  const lines = content.split('\n');
  
  // Check for unclosed brackets/braces
  let bracketCount = 0;
  let braceCount = 0;
  let parenCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    bracketCount += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
    braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    parenCount += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
  }

  console.log('🔍 Bracket balance:', bracketCount);
  console.log('🔍 Brace balance:', braceCount);
  console.log('🔍 Parenthesis balance:', parenCount);

  if (bracketCount !== 0 || braceCount !== 0 || parenCount !== 0) {
    console.error('❌ Syntax error: Unmatched brackets/braces/parentheses');
  } else {
    console.log('✅ Basic syntax check passed');
  }

  // Check for export statement
  if (content.includes('export default')) {
    console.log('✅ Export statement found');
  } else {
    console.error('❌ No export statement found');
  }

  // Check for React import
  if (content.includes('import React')) {
    console.log('✅ React import found');
  } else {
    console.error('❌ React import not found');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
}
