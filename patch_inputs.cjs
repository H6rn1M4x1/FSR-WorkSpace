const fs = require('fs');
let file = 'src/components/MealsView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// The class we want to replace it WITH:
const newClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';

// The class we are replacing:
const oldClassRegex = /className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950\/30 border border-slate-200\/80 dark:border-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none transition-all focus:border-slate-400 dark:focus:border-zinc-700"/g;

content = content.replace(oldClassRegex, `className="${newClass}"`);

// Fix the Search icon position
content = content.replace(
  /<Search className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-primary" \/>/g,
  '<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />'
);

fs.writeFileSync(file, content);
