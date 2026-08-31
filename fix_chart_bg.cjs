const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const regex = /(\{\/\* TÍTULO DINÁMICO DE LA GRÁFICA \*\/\}[\s\S]*?<ResponsiveContainer width="100%" height="100%">[\s\S]*?<\/ResponsiveContainer>\n\s*<\/div>)/;

const replacement = `<div className={\`p-4 sm:p-5 rounded-3xl border \${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}\`}>\n          $1\n          </div>`;

if(regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Updated chart background");
} else {
  console.log("Could not find match");
}
