const fs = require('fs');
const file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className=\{`p-5 rounded-3xl border transition-all \$\{\n\s*darkMode\n\s*\? "bg-zinc-900\/40 hover:bg-zinc-800\/50 border-zinc-700\/50 text-white"\n\s*: "bg-slate-50\/60 hover:bg-slate-100\/80 border-slate-200\/60 text-slate-800"\n\s*\} space-y-3 shadow-xs`\}/g,
  'className={`p-5 rounded-3xl border transition-all ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"} space-y-3`}'
);

fs.writeFileSync(file, content);
console.log("Updated HealthView comidas cards");
