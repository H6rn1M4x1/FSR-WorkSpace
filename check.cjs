const fs = require('fs');
const content = fs.readFileSync('src/components/GymRutinaView.tsx', 'utf-8');
const lines = content.split('\n');

console.log("Lines around 1630:");
for(let i = 1625; i < 1635; i++) {
  if(lines[i]) console.log(`${i+1}: ${lines[i]}`);
}

console.log("\nLines around 3656:");
for(let i = 3650; i < 3662; i++) {
  if(lines[i]) console.log(`${i+1}: ${lines[i]}`);
}
