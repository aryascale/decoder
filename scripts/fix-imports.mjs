import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist-server');

/**
 * Recursively scan dist-server directory and add .js extension to relative imports
 */
function fixImports(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // regex to match relative imports: from './lib/db' or import './lib/db'
      // but avoid absolute or package imports
      const updatedContent = content.replace(
        /(import|export)([\s\S]*?from\s+['"]|[\s\S]+?['"])(\.\.?\/[^'"]+)(['"])/g,
        (match, p1, p2, p3, p4) => {
          // If it doesn't have an extension and is relative, add .js
          if (!path.extname(p3) && p3.startsWith('.')) {
            return `${p1}${p2}${p3}.js${p4}`;
          }
          return match;
        }
      );

      if (content !== updatedContent) {
        fs.writeFileSync(fullPath, updatedContent);
      }
    }
  }
}

console.log('Fixing ESM imports in dist-server...');
fixImports(distDir);
console.log('Done.');
