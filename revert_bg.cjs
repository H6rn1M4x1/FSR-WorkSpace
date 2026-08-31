const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Remove import
content = content.replace('import { InteractiveBackground } from "./components/InteractiveBackground";\n', '');

// Remove component
content = content.replace('\n      <InteractiveBackground />', '');

// Revert transparent backgrounds
content = content.replace('bg-transparent text-[#e3e2e6]', 'bg-[#131314] text-[#e3e2e6]');
content = content.replace('bg-transparent text-[#1f1f1f]', 'bg-[#f8f9fa] text-[#1f1f1f]');

fs.writeFileSync('src/App.tsx', content, 'utf8');
