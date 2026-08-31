const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');
const match = content.match(/const filteredLogs = alimentacionLogs\.filter\([\s\S]*?\}\);/);
console.log(match ? match[0] : "Not found");
