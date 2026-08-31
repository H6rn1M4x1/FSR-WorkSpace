const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes('            {/* Activities Summary Charts */}'));
for(let i=startIdx-5; i < startIdx + 15; i++) {
  if(lines[i]) console.log(`${i+1}: ${lines[i]}`);
}
