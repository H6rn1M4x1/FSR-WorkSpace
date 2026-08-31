const fs = require('fs');
const content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

if (!content.includes('import { createPortal } from "react-dom";')) {
  fs.writeFileSync('src/components/Header.tsx', 'import { createPortal } from "react-dom";\n' + content);
}
