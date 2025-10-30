import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directories to process
const DIRECTORIES = [
  path.join(__dirname, '..', 'src'),
  path.join(__dirname, '..', 'gas-cylinder-mobile'),
  path.join(__dirname, '..', 'gas-cylinder-android')
];

// File extensions to process
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Files to skip
const SKIP_FILES = [
  'logger.js',
  'logger.ts',
  'remove-console-logs.js',
  'test',
  'spec',
  '__tests__',
  'node_modules'
];

let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;

function shouldSkipFile(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return;
  }

  const ext = path.extname(filePath);
  if (!EXTENSIONS.includes(ext)) {
    return;
  }

  totalFiles++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Check if file already imports logger
    const hasLoggerImport = content.includes('import logger') || content.includes('from \'./utils/logger\'') || content.includes('from \'../utils/logger\'');
    
    // Replace console.log statements
    let replacements = 0;
    
    // Replace console.log with logger.log
    content = content.replace(/console\.log\(/g, (match) => {
      replacements++;
      return 'logger.log(';
    });
    
    // Replace console.error with logger.error
    content = content.replace(/console\.error\(/g, (match) => {
      replacements++;
      return 'logger.error(';
    });
    
    // Replace console.warn with logger.warn
    content = content.replace(/console\.warn\(/g, (match) => {
      replacements++;
      return 'logger.warn(';
    });
    
    // Replace console.debug with logger.debug
    content = content.replace(/console\.debug\(/g, (match) => {
      replacements++;
      return 'logger.debug(';
    });
    
    // Replace console.info with logger.info
    content = content.replace(/console\.info\(/g, (match) => {
      replacements++;
      return 'logger.info(';
    });
    
    if (replacements > 0 && content !== originalContent) {
      // Add logger import if not present
      if (!hasLoggerImport) {
        const relativeDir = path.relative(path.dirname(filePath), __dirname).replace(/\\/g, '/');
        const srcDir = filePath.includes('src') ? 'src' : filePath.includes('gas-cylinder-mobile') ? 'gas-cylinder-mobile' : 'gas-cylinder-android';
        
        let importPath = '';
        if (srcDir === 'src') {
          const depth = filePath.split(path.sep).filter(p => p).indexOf('src') + 1;
          const fileDepth = filePath.split(path.sep).filter(p => p).length - depth - 1;
          importPath = fileDepth === 0 ? './utils/logger' : '../'.repeat(fileDepth) + 'utils/logger';
        } else {
          const depth = filePath.split(path.sep).filter(p => p).indexOf(srcDir) + 1;
          const fileDepth = filePath.split(path.sep).filter(p => p).length - depth - 1;
          importPath = fileDepth === 0 ? './utils/logger' : '../'.repeat(fileDepth) + 'utils/logger';
        }
        
        // Add import at the beginning of the file
        if (ext === '.ts' || ext === '.tsx') {
          content = `import logger from '${importPath}';\n` + content;
        } else {
          content = `import logger from '${importPath}';\n` + content;
        }
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      modifiedFiles++;
      totalReplacements += replacements;
      console.log(`✓ Modified ${filePath} (${replacements} replacements)`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory not found: ${dirPath}`);
    return;
  }

  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory() && !shouldSkipFile(itemPath)) {
      processDirectory(itemPath);
    } else if (stat.isFile()) {
      processFile(itemPath);
    }
  }
}

console.log('Starting console.log removal process...\n');

for (const dir of DIRECTORIES) {
  console.log(`Processing directory: ${dir}`);
  processDirectory(dir);
}

console.log('\n=== Summary ===');
console.log(`Total files scanned: ${totalFiles}`);
console.log(`Files modified: ${modifiedFiles}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('\nDone! Remember to test your application thoroughly.');
