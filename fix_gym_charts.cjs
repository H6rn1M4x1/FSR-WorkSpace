const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Container
content = content.replace(
  /className=\{`p-6 rounded-3xl border \$\{darkMode \? "bg-zinc-900\/40 border-zinc-800\/60 text-white" : "bg-slate-50\/60 border-slate-200\/60 text-slate-800"\} space-y-6 shadow-xs`\}/g,
  'className="space-y-6 text-slate-800 dark:text-zinc-100"'
);

// Inner metric cards
content = content.replace(
  /className=\{`p-3\.5 rounded-2xl border \$\{darkMode \? "bg-zinc-950\/60 border-zinc-800" : "bg-slate-50 border-slate-200"\}`\}/g,
  'className={`p-3.5 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated gym charts container and cards");
