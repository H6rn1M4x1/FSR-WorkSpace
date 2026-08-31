const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

content = content.replace(
  '          {/* Top Grid: Medication Trackers & BP Stats */}\n          <div className="space-y-6">',
  '          {/* Top Grid: Medication Trackers & BP Stats */}\n          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">'
);

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Updated top grid layout");
