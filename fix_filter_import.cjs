const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.match(/\bFilter\b/g)?.some((match, idx, arr) => arr.indexOf(match) === idx)) {
  console.log("Filter might not be in imports");
}
content = content.replace(
  /ChevronDown,/g,
  'ChevronDown,\n  Filter,'
);
fs.writeFileSync(file, content);
console.log("Added Filter import forcefully.");
