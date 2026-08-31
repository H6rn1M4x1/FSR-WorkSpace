const fs = require('fs');
let file = 'src/components/FavoriteTeamWidget.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Next Match Container
content = content.replace(
  /className="bg-zinc-50 dark:bg-zinc-800\/60 border border-zinc-200\/80 dark:border-zinc-700\/60 rounded-2xl p-3 shadow-xs"/g,
  'className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 shadow-xs"'
);

// Last Match Container
content = content.replace(
  /className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800\/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors rounded-xl px-2\.5 py-1\.5 border border-zinc-200\/60 dark:border-zinc-700\/40"/g,
  'className="flex items-center justify-between text-xs bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors rounded-xl px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800"'
);

fs.writeFileSync(file, content);
console.log("Updated FavoriteTeamWidget background classes");
