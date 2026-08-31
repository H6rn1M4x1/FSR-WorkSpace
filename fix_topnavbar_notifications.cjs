const fs = require('fs');
const content = fs.readFileSync('src/components/TopNavbar.tsx', 'utf-8');

if (!content.includes('import { createPortal } from "react-dom";')) {
  fs.writeFileSync('src/components/TopNavbar.tsx', 'import { createPortal } from "react-dom";\n' + content);
}
