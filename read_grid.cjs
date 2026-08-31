const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(2357, 2485).join('\n'));
