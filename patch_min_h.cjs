const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
content = content.replace(
  '<div className="mt-3 flex-1 flex flex-col min-h-0">',
  '<div className="mt-3 flex-1 flex flex-col min-h-[160px]">'
);
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
