const fs = require('fs');
let file = 'src/components/HomeView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Containers for selected lists
content = content.replace(
  /className="p-4 rounded-2xl border border-primary\/20 bg-primary\/10 space-y-2 animate-fade-in text-xs"/g,
  'className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2 animate-fade-in text-xs"'
);

content = content.replace(
  /className="p-4 rounded-2xl border border-primary\/30 bg-primary-container space-y-2 animate-fade-in text-xs"/g,
  'className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-2 animate-fade-in text-xs"'
);

// 2. Category selection buttons
content = content.replace(
  /\? "bg-primary\/10 border-primary\/20 text-primary"/g,
  '? "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-primary shadow-sm"'
);

content = content.replace(
  /\? "bg-primary-container border-primary\/30 text-primary"/g,
  '? "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-primary shadow-sm"'
);

fs.writeFileSync(file, content);
console.log("Updated share modal styles");
