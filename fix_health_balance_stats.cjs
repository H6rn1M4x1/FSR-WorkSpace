const fs = require('fs');
const file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className=\{`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 \$\{darkMode \? "bg-zinc-950\/50 border-zinc-800\/80" : "bg-slate-50 border-slate-200\/60"\}`\}/g,
  'className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated HealthView balance stats cards");
