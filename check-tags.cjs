const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');
let divCount = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // naive tag counter
  const opens = (line.match(/<div\b[^>]*>/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  divCount += opens - closes;
  if (divCount < 0) {
    console.log(`Negative div count at line ${i+1}: ${line}`);
    break;
  }
}
console.log("Final div count:", divCount);
