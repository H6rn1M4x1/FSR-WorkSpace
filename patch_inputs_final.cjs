const fs = require('fs');
let file = 'src/components/MealsView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// The class we want to replace it WITH (small inputs)
const newClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';

// Change any left-3.5 Search icons to left-3
content = content.replace(
  /<Search className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-primary" \/>/g,
  '<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />'
);

// We need to add size="sm" to the Select in the ingredients tab so it matches the height
const customSelectRegex = /<CustomSelect\n\s*size="sm"/g;
content = content.replace(customSelectRegex, '<CustomSelect'); // Reset first if we messed it up
content = content.replace(
  /<CustomSelect\s*value=\{selectedCategory\}/,
  '<CustomSelect\n              size="sm"\n              value={selectedCategory}'
);

fs.writeFileSync(file, content);
