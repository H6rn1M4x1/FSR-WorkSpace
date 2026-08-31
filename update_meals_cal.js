const fs = require('fs');
const file = 'src/components/MealsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /(\{\/\* Day of Week Headers \*\/\}[\s\S]*?\{\/\* Days Grid \*\/\}[\s\S]*?<\/div>\n\s*)(<\/div>\n\s*\{\/\* Calendar Footer Info \*\/)/;

if (regex.test(content)) {
  content = content.replace(regex, `<div className={\`p-4 rounded-3xl \${darkMode ? "bg-zinc-950 shadow-sm" : "bg-white shadow-sm border border-slate-100"}\`}>\n$1</div>\n$2`);
  fs.writeFileSync(file, content);
  console.log("Updated MealsView calendar background.");
} else {
  console.log("Regex not found in MealsView.");
}
