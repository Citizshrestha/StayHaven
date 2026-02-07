const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (['node_modules', '.git', '.conflict-backups'].includes(file)) continue;
      walk(full, fileList);
    } else {
      if (file.endsWith('.orig-conflict.bak')) fileList.push(full);
    }
  }
  return fileList;
}

const root = path.resolve(__dirname, '..');
const backups = walk(root);
const destDir = path.join(root, '.conflict-backups');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);
let moved = 0;
for (const b of backups) {
  const base = path.basename(b);
  const dest = path.join(destDir, base + '_' + Date.now());
  try { fs.renameSync(b, dest); moved++; console.log('Moved', b, '->', dest); } catch(e) { }
}
console.log('Done. Moved', moved, 'backup files.');
