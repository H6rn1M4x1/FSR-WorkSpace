const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className=\{`p-3\.5 rounded-2xl border \$\{darkMode \? "bg-zinc-900\/40 border-zinc-800\/60" : "bg-white\/60 border-slate-200\/70"\}`\}/g,
  'className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated GymRutinaView stats cards");
