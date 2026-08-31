const fs = require('fs');
let file = 'src/components/HomeView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Appointment
content = content.replace(
  /className="p-4 rounded-2xl border border-primary\/20 bg-primary\/10 hover:bg-primary\/10 cursor-pointer transition-all flex items-start justify-between gap-3 group relative overflow-hidden"/g,
  'className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all flex items-start justify-between gap-3 group relative overflow-hidden"'
);

// 2. Turno (currently hardcoded as bg-primary/10)
content = content.replace(
  /className="p-4 rounded-2xl border border-primary\/20 bg-primary\/10 hover:bg-primary\/10 transition-all flex items-start justify-between gap-3 cursor-pointer group relative overflow-hidden"/g,
  'className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer group relative overflow-hidden ${ tc.estatus ? "border-primary/20 bg-primary/10 hover:bg-primary/10" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900" }`}'
);

// 3. Medication
content = content.replace(
  /className="p-4 rounded-2xl border border-primary\/20 bg-primary\/10 hover:bg-primary\/10 cursor-pointer transition-all flex items-start justify-between gap-3 group relative overflow-hidden"/g,
  'className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all flex items-start justify-between gap-3 group relative overflow-hidden"'
);

// 4. Meal (currently has bg-primary-container)
content = content.replace(
  /className="p-4 rounded-2xl border border-primary\/30 bg-primary-container hover:bg-primary-container cursor-pointer transition-all flex items-start justify-between gap-3 group relative overflow-hidden"/g,
  'className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-all flex items-start justify-between gap-3 group relative overflow-hidden"'
);

fs.writeFileSync(file, content);
console.log("Updated HomeView cards");
