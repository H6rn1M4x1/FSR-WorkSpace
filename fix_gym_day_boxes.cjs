const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /\? "bg-zinc-950\/20 border border-zinc-800\/20 text-zinc-500 hover:bg-zinc-900\/50"\n\s*: "bg-white\/40 border border-slate-100 text-slate-400 hover:bg-slate-50"/g,
  '? "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800"\n                        : "bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100"'
);

fs.writeFileSync(file, content);
console.log("Updated Gym day boxes");
