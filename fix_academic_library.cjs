const fs = require('fs');

let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

if(!c.includes("Library,")) {
  c = c.replace(/import \{/i, 'import {\n  Library,');
  fs.writeFileSync('src/components/AcademicView.tsx', c);
}
