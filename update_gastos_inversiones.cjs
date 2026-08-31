const fs = require('fs');

const inputClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';

function updateFile(filename) {
    let content = fs.readFileSync(filename, 'utf-8');
    
    // Replace the outer container
    content = content.replace(
        /<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">/,
        '<div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">'
    );
    
    // Replace the search container
    content = content.replace(
        /<div className="relative w-full sm:w-72">/,
        '<div className="relative flex-1 w-full">'
    );
    
    // Replace the search icon
    content = content.replace(
        /<Search className="w-4 h-4 absolute left-3\.5 top-1\/2 -translate-y-1\/2 text-primary" \/>/,
        '<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />'
    );
    
    // Replace the input classes
    // We will do a generic replacement for the input's className in the search wrapper.
    const searchWrapperRegex = /(<div className="relative flex-1 w-full">\s*<Search [^>]+>\s*<input[^>]+className=")([^"]+)(")/g;
    content = content.replace(searchWrapperRegex, (match, p1, p2, p3) => {
        return p1 + inputClass + p3;
    });

    // Replace the selects container to be gap-3 and w-full sm:w-auto
    content = content.replace(
        /<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">/,
        '<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">'
    );
    
    fs.writeFileSync(filename, content);
    console.log("Updated", filename);
}

updateFile('src/components/GastosVariosTable.tsx');
updateFile('src/components/InversionesTable.tsx');

