const fs = require('fs');
const file = 'src/components/MealsView.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  /className="border border-primary\/25 dark:border-primary\/25 bg-primary\/10 dark:bg-primary\/10 rounded-2xl p-3 space-y-2 shadow-xs"/g,
  'className={`border rounded-2xl p-3 space-y-2 shadow-xs ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"}`}'
);

fs.writeFileSync(file, content);
console.log("Updated meal groups");
