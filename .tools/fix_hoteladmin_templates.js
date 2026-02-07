const fs = require('fs');
const file = 'frontend/src/components/HotelAdmin/HoteladminDashboard.jsx';
const p = require('path').join(__dirname, '..', file);
let txt = fs.readFileSync(p, 'utf8');

// Remove lines that are just HEAD or git refs like 18a7cad...
txt = txt.split(/\r?\n/).filter(line => {
  if (line.trim() === 'HEAD') return false;
  if (/^[0-9a-f]{7,}\w*$/.test(line.trim())) return false; // simple git hash lines
  return true;
}).join('\n');

// Replace incorrect template marker 'NPR {' -> '${'
txt = txt.replace(/NPR \{/g, '${');

// Fix specific known bad patterns
txt = txt.replace(/window.location.hash = `#\$\{sectionId\}`;/g, "window.location.hash = `#${sectionId}`;");
// Ensure console logs use proper template
txt = txt.replace(/console.log\(`\$\{action\} clicked for room \$\{roomId\}`\);/g, "console.log(`${action} clicked for room ${roomId}`);");

fs.writeFileSync(p, txt, 'utf8');
console.log('Patched', file);
