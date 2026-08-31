const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
let lines = content.split('\n');
lines.splice(3555, 2); // Remove lines 3556 and 3557 (index 3555, 3556)
fs.writeFileSync('src/components/HealthView.tsx', lines.join('\n'), 'utf8');
