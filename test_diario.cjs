const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');
const lines = content.split('\n');
const match = lines.findIndex(l => l.includes("let filteredDias = dias.filter(diaStr => {"));
if (match !== -1) {
    console.log(lines.slice(match, match + 20).join('\n'));
}
