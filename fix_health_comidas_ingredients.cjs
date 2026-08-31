const fs = require('fs');
const file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className=\{`py-1\.5 px-3 rounded-xl border flex flex-col justify-center \$\{darkMode \? "bg-zinc-950\/50 border-zinc-800\/80" : "bg-slate-50 border-slate-200\/60"\}`\}/g,
  'className={`py-1.5 px-3 rounded-xl border flex flex-col justify-center ${darkMode ? "bg-zinc-900/40 border-zinc-800/60" : "bg-zinc-50 border-zinc-200/60"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated HealthView comidas ingredients");
