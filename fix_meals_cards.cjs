const fs = require('fs');
const file = 'src/components/MealsView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// First card:
content = content.replace(
  /className=\{`rounded-2xl border transition-all flex flex-col justify-between relative cursor-pointer group overflow-hidden \$\{\n\s*isToday\n\s*\? "border-primary dark:border-primary ring-2 ring-primary\/20 dark:ring-primary\/20 bg-primary\/15 dark:bg-primary\/15 hover:border-primary\/30"\n\s*: "border-primary\/25 dark:border-primary\/25 bg-primary\/10 dark:bg-primary\/10 hover:bg-primary\/15 hover:border-primary\/40"\n\s*\}`\}/g,
  'className={`rounded-2xl border transition-all flex flex-col justify-between relative cursor-pointer group overflow-hidden ${darkMode ? "bg-zinc-950 border-zinc-800 shadow-sm" : "bg-white border-zinc-200 shadow-sm"} ${isToday ? "ring-2 ring-primary/40 border-primary dark:border-primary" : "hover:border-primary/40"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated meal cards");
