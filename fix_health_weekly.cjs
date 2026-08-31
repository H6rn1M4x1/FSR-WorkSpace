const fs = require('fs');
const file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className=\{`p-4 rounded-3xl border \$\{darkMode \? "bg-zinc-900\/20 border-zinc-800\/60 text-white" : "bg-slate-50\/40 border-slate-200\/50 text-slate-800"\} space-y-3`\}/g,
  'className={`p-4 sm:p-6 rounded-3xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"} space-y-3`}'
);

content = content.replace(
  /className="bg-slate-50\/50 dark:bg-zinc-950\/30 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800\/60"/g,
  'className={`p-4 sm:p-6 rounded-3xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}'
);

content = content.replace(
  /\? "bg-zinc-950\/20 border border-zinc-800\/20 text-zinc-500 hover:bg-zinc-900\/50"\n\s*: "bg-white\/40 border border-slate-100 text-slate-400 hover:bg-slate-50"/g,
  '? "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800"\n                              : "bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100"'
);

fs.writeFileSync(file, content);
console.log("Updated HealthView weekly summaries and boxes");
