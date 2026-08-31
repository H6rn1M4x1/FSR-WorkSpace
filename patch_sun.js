import fs from 'fs';

let code = fs.readFileSync('src/components/HomeView.tsx', 'utf8');

code = code.replace(
  /ChevronUp,/,
  `ChevronUp,\n  Sun,\n  Cloud,`
);

fs.writeFileSync('src/components/HomeView.tsx', code);
