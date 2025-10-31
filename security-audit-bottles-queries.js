import fs from 'fs';
import path from 'path';

const filesToCheck = [
  'src/pages/AssetDetail.jsx',
  'src/components/MainLayout.jsx',
  'src/pages/ImportApprovals.jsx',
  'src/pages/CustomerDetail.jsx',
  'src/pages/Assets.jsx',
  'src/pages/WebScanning.jsx',
  'src/pages/CustomerSelfService.jsx'
];

console.log('🔐 SECURITY AUDIT: Checking bottles table queries\n');
console.log('='.repeat(70));

filesToCheck.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Find all .from('bottles') queries
    const bottleQueries = [];
    lines.forEach((line, index) => {
      if (line.includes(".from('bottles')") || line.includes('.from("bottles")')) {
        bottleQueries.push({ lineNum: index + 1, line: line.trim() });
      }
    });
    
    if (bottleQueries.length > 0) {
      console.log(`\n📄 ${filePath}`);
      console.log(`   Found ${bottleQueries.length} bottle queries`);
      
      bottleQueries.forEach(query => {
        // Check next 10 lines for organization_id filter
        let hasOrgFilter = false;
        for (let i = query.lineNum; i < Math.min(query.lineNum + 10, lines.length); i++) {
          if (lines[i].includes('organization_id')) {
            hasOrgFilter = true;
            break;
          }
        }
        
        if (!hasOrgFilter) {
          console.log(`   ⚠️  Line ${query.lineNum}: MISSING organization_id filter!`);
          console.log(`       ${query.line}`);
        } else {
          console.log(`   ✅ Line ${query.lineNum}: Has organization_id filter`);
        }
      });
    }
  } catch (error) {
    console.log(`   ❌ Error reading ${filePath}:`, error.message);
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n💡 RECOMMENDATION:');
console.log('   All .from("bottles") queries MUST include .eq("organization_id", organization.id)');
console.log('   This prevents data leakage between organizations.\n');

