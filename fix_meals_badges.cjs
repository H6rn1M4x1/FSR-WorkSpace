const fs = require('fs');
const file = 'src/components/MealsView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-900\/40 text-slate-700 dark:text-zinc-300 px-2\.5 py-1\.5 rounded-lg border border-slate-200\/60 dark:border-zinc-800\/60 text-xs shadow-sm"/g,
  'className={`flex items-center justify-between gap-3 text-slate-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-lg border text-xs shadow-sm ${darkMode ? "bg-zinc-900 border-zinc-800/60" : "bg-slate-50 border-slate-200/60"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated meal ingredient badges");
