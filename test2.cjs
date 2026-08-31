const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 3530; i < 3560; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
