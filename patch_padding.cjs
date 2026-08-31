const fs = require('fs');

// 1. Update AnimatedList.css
let css = fs.readFileSync('src/components/AnimatedList.css', 'utf8');
css = css.replace(
  'padding: 8px 8px 68px 8px;',
  'padding: 8px 8px 12px 8px;'
);
fs.writeFileSync('src/components/AnimatedList.css', css, 'utf8');

// 2. Increase max-h of the BP and Meds modules in HealthView.tsx
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
content = content.replaceAll('max-h-[380px]', 'max-h-[400px]');
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');

console.log("Patched padding and max-h");
