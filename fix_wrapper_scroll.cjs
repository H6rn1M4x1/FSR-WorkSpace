const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

// For Meds wrapper
content = content.replace(
  '<div className="space-y-2.5 flex-1 overflow-y-auto min-h-0">',
  '<div className="space-y-2.5 flex-1 flex flex-col min-h-0">'
);

// For BP list wrapper
content = content.replace(
  '<div className="space-y-1.5 mt-3 flex-1 overflow-y-auto min-h-0">',
  '<div className="mt-3 flex-1 flex flex-col min-h-0">'
);

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Fixed wrapper scroll");
