const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
let lines = content.split('\n');

const activitiesIdx = lines.findIndex(l => l.includes('{/* Activities & Calories Summary Grid */}'));
for (let i = activitiesIdx - 5; i < activitiesIdx; i++) {
  console.log(`${i}: ${lines[i]}`);
}
