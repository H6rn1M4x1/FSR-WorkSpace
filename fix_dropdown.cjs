const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\/\* SELECTOR DE EJERCICIO \(CUSTOM DROPDOWN\) \*\/\}[\s\S]*?\{\/\* SELECTOR DE MÉTRICA \*\/\}/;

if (regex.test(content)) {
  content = content.replace(regex, '{/* SELECTOR DE MÉTRICA */}');
  fs.writeFileSync(file, content);
  console.log("Removed old custom dropdown.");
} else {
  console.log("Regex not found.");
}
