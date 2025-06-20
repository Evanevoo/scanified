const fs = require('fs');
const path = require('path');

// List of files that need import fixes
const filesToFix = [
  // Web app files with wrong imports
  'src/utils/fixBottleData.js',
  'src/utils/debugUtils.js', 
  'src/utils/daysAtLocationUpdater.js',
  'src/pages/ReviewScreen.jsx',
  'src/pages/Rentals.jsx',
  'src/pages/LoginScreen.jsx',
  'src/pages/Cylinders.jsx',
  'src/pages/CustomerDetail.jsx',
  'src/pages/Bottles.jsx',
  'src/pages/BottleImport.jsx',
  'src/pages/BottleDetail.jsx',
  'src/pages/AssetHistory.jsx',
];

// Files that should use the correct import path
const correctImportPath = '../supabase/client';

function fixImports() {
  console.log('🔧 Fixing import inconsistencies...\n');
  
  let fixedCount = 0;
  
  filesToFix.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // Fix the import statement
        content = content.replace(
          /import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/\.\.\/supabase['"];?/g,
          `import { supabase } from '${correctImportPath}';`
        );
        
        content = content.replace(
          /import\s+\{\s*supabase\s*\}\s+from\s+['"]\.\.\/supabase['"];?/g,
          `import { supabase } from '${correctImportPath}';`
        );
        
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`✅ Fixed: ${filePath}`);
          fixedCount++;
        } else {
          console.log(`⏭️  No changes needed: ${filePath}`);
        }
      } else {
        console.log(`❌ File not found: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
  });
  
  console.log(`\n📊 Fixed ${fixedCount} files`);
}

function checkForDuplicateFiles() {
  console.log('\n🔍 Checking for duplicate files...\n');
  
  const duplicateFiles = [
    'App.tsx',
    'App.jsx',
    'index.html',
    'index.jsx'
  ];
  
  duplicateFiles.forEach(file => {
    const rootPath = path.join(process.cwd(), file);
    const srcPath = path.join(process.cwd(), 'src', file);
    
    if (fs.existsSync(rootPath) && fs.existsSync(srcPath)) {
      console.log(`⚠️  Duplicate file found: ${file} (both in root and src/)`);
    }
  });
}

function checkForMissingFiles() {
  console.log('\n🔍 Checking for missing critical files...\n');
  
  const criticalFiles = [
    'src/supabase/client.js',
    'src/hooks/useAuth.jsx',
    'src/App.jsx',
    'package.json',
    'vite.config.js',
    '.env'
  ];
  
  criticalFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      console.log(`❌ Missing critical file: ${file}`);
    } else {
      console.log(`✅ Found: ${file}`);
    }
  });
}

function checkEnvironmentVariables() {
  console.log('\n🔍 Checking environment variables...\n');
  
  const envFile = '.env';
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        console.log(`✅ Found: ${varName}`);
      } else {
        console.log(`❌ Missing: ${varName}`);
      }
    });
  } else {
    console.log('❌ No .env file found');
  }
}

function removeDuplicateSupabaseFile() {
  console.log('\n🗑️  Removing duplicate Supabase configuration...\n');
  
  const duplicateFile = 'supabase.js';
  if (fs.existsSync(duplicateFile)) {
    try {
      fs.unlinkSync(duplicateFile);
      console.log(`✅ Removed duplicate: ${duplicateFile}`);
    } catch (error) {
      console.error(`❌ Error removing ${duplicateFile}:`, error.message);
    }
  } else {
    console.log(`⏭️  No duplicate file to remove: ${duplicateFile}`);
  }
}

function createEslintConfig() {
  console.log('\n⚙️  Creating ESLint configuration...\n');
  
  const eslintConfig = {
    "env": {
      "browser": true,
      "es2021": true,
      "node": true
    },
    "extends": [
      "eslint:recommended",
      "@typescript-eslint/recommended",
      "plugin:react/recommended",
      "plugin:react-hooks/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
      "ecmaFeatures": {
        "jsx": true
      },
      "ecmaVersion": "latest",
      "sourceType": "module"
    },
    "plugins": [
      "react",
      "@typescript-eslint"
    ],
    "rules": {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off"
    },
    "settings": {
      "react": {
        "version": "detect"
      }
    }
  };
  
  try {
    fs.writeFileSync('.eslintrc.json', JSON.stringify(eslintConfig, null, 2));
    console.log('✅ Created .eslintrc.json');
  } catch (error) {
    console.error('❌ Error creating ESLint config:', error.message);
  }
}

function main() {
  console.log('🚀 Starting comprehensive project error fix...\n');
  
  fixImports();
  checkForDuplicateFiles();
  checkForMissingFiles();
  checkEnvironmentVariables();
  removeDuplicateSupabaseFile();
  createEslintConfig();
  
  console.log('\n🎉 Project error fix completed!');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm run lint');
  console.log('3. Run: npm run dev');
  console.log('4. Check for any remaining errors');
}

main(); 