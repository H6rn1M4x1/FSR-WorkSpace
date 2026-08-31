const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

// For Meds
content = content.replace(
  'className="flex-1 overflow-y-auto min-h-0 max-h-52 pr-1"',
  'className="flex-1 min-h-0 pr-1"'
);

// For BP Trend
content = content.replace(
  'className="flex-1 overflow-y-auto min-h-0 pr-1"',
  'className="flex-1 min-h-0 pr-1"'
);

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Fixed AnimatedList classes");
