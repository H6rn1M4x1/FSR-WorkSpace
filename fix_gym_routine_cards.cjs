const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className=\{`p-5 rounded-3xl border flex flex-col justify-between transition-all duration-200 hover:border-primary\/50 shadow-xs \$\{\n\s*darkMode\n\s*\? "bg-zinc-900\/40 hover:bg-zinc-800\/50 border-zinc-800\/60 text-white"\n\s*: "bg-slate-50\/60 hover:bg-slate-100\/80 border-slate-200\/60 text-slate-800"\n\s*\}`\}/g,
  'className={`p-5 rounded-3xl border flex flex-col justify-between transition-all hover:scale-[1.01] shadow-sm ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"}`}'
);

content = content.replace(
  /className=\{`p-3 rounded-2xl border space-y-1\.5 \$\{darkMode \? "bg-zinc-950\/50 border-zinc-800\/80" : "bg-slate-50 border-slate-200\/60"\}`\}/g,
  'className={`p-3 rounded-2xl border space-y-1.5 ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated GymRutinaView routine cards");
