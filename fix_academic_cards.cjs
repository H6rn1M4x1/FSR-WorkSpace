const fs = require('fs');

const file = 'src/components/AcademicView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Update subjects list items
content = content.replace(
  /className="flex items-center justify-between p-3 rounded-2xl border border-primary\/25 dark:border-primary\/25 bg-primary\/10 dark:bg-primary\/10 hover:bg-primary\/15 transition-all duration-200 cursor-pointer hover:border-primary\/40 dark:hover:border-primary\/40 group relative overflow-hidden"/g,
  'className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 cursor-pointer group relative overflow-hidden"'
);

content = content.replace(
  /className="flex items-center justify-between p-3 rounded-2xl border border-primary\/25 dark:border-primary\/25 bg-primary\/10 dark:bg-primary\/10 hover:bg-primary\/15 hover:border-primary\/40 transition-all duration-200 cursor-pointer group relative overflow-hidden"/g,
  'className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 cursor-pointer group relative overflow-hidden"'
);

// Update progress cards
content = content.replace(
  /className={`p-5 rounded-2xl border transition-all hover:scale-\[1\.01\] \${\n\s*darkMode\n\s*\? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md"\n\s*: "bg-white border-zinc-200 text-zinc-800"\n\s*} shadow-sm`}/g,
  'className="p-5 rounded-2xl border transition-all hover:scale-[1.01] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm"'
);

fs.writeFileSync(file, content);
console.log("Updated AcademicView");
