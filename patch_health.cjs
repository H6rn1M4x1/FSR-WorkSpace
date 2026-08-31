const fs = require('fs');
let file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const inputClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';

function processGrid(startStr, endStr) {
    let startIndex = content.indexOf(startStr);
    if (startIndex === -1) return false;
    
    // We want to replace the whole block starting from startStr until the end of the CustomSelects.
    // Instead of doing it blindly, let's just do regex replacements in the whole file:
    // Any `<div className="grid grid-cols-1 sm:grid-cols-[1-4] gap-3...` that contains a Search input.
}

// Actually, regex replacement for the grid:
content = content.replace(/<div className="grid grid-cols-1 sm:grid-cols-(?:2|3|4) gap-3( mb-6)?">(\s*)<div className="relative(?: sm:col-span-1| sm:col-span-2)?">(\s*)<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">(\s*)<Search className="w-4 h-4 text-primary dark:text-primary stroke-\[2\.25px\] opacity-100" \/>(\s*)<\/span>(\s*)<input([^>]+)className="[^"]+"([^>]*)>/g, (match, optMb6, space1, space2, space3, space4, space5, space6, inputStart, inputEnd) => {
    
    // We want to replace the grid with flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full
    let mb6Class = optMb6 ? optMb6 : ' mb-6';
    
    return `<div className="flex flex-col sm:flex-row gap-3${mb6Class} items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input${inputStart}className="${inputClass}"${inputEnd}>`;
});

// For any CustomSelect inside these flex containers, we want to add sm:w-auto min-w-[200px]
// This is tricky via regex. Let's just rely on the existing w-full and change it if needed.
// Actually `w-full` on CustomSelect in a `flex-row` with `w-full` on input might not squish correctly unless it has `sm:w-auto`.
// Let's replace `className="w-full"` with `className="w-full sm:w-auto min-w-[160px]"` ONLY for CustomSelects inside HealthView that have `size="sm"`.
// Wait, HealthView has lots of forms. We only want to do this for the filter ones.

fs.writeFileSync(file, content);
console.log("Updated HealthView search inputs");
