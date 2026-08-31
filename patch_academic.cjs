const fs = require('fs');
let file = 'src/components/AcademicView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const inputClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';

// Replace search blocks in AcademicView
const searchRegex = /<div className="relative w-full sm:w-auto sm:col-span-2 flex-1">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">\s*<Search className="w-4 h-4 text-primary" \/>\s*<\/span>\s*<input([^>]+)className="[^"]+"([^>]*)>\s*<\/div>/g;

content = content.replace(searchRegex, (match, p1, p2) => {
    return `<div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input${p1}className="${inputClass}"${p2}>
            </div>`;
});

// Update CustomSelects inside those filter bars
content = content.replace(/className="w-full"(\s*)\/>/g, 'className="w-full sm:w-auto min-w-[160px]"\n              size="sm"$1/>');

fs.writeFileSync(file, content);
console.log("Updated AcademicView");
