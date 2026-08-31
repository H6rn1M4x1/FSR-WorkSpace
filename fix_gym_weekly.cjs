const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className=\{`p-4 rounded-3xl border \$\{darkMode \? "bg-zinc-900\/20 border-zinc-800\/60 text-white" : "bg-slate-50\/40 border-slate-200\/50 text-slate-800"\} space-y-3`\}/g,
  'className={`p-4 sm:p-6 rounded-3xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"} space-y-3`}'
);

fs.writeFileSync(file, content);
console.log("Updated GymRutinaView weekly summary");
