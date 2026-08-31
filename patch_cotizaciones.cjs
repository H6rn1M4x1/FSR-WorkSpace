const fs = require('fs');

const inputClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';

function updateFile(filename) {
    let content = fs.readFileSync(filename, 'utf-8');
    
    // Replace outer container
    content = content.replace(
        /<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">/,
        '<div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">'
    );
    
    // Replace the search wrapper
    content = content.replace(
        /<div className="relative w-full sm:w-72">/g,
        '<div className="relative flex-1 w-full">'
    );
    
    // Replace search icon
    content = content.replace(
        /<Search className="w-4 h-4 absolute left-3\.5 top-1\/2 -translate-y-1\/2 text-primary" \/>/g,
        '<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />'
    );
    
    // Replace input class
    const searchWrapperRegex = /(<div className="relative flex-1 w-full">\s*<Search [^>]+>\s*<input[^>]+className=")([^"]+)(")/g;
    content = content.replace(searchWrapperRegex, (match, p1, p2, p3) => {
        return p1 + inputClass + p3;
    });

    // Replace selects wrapper
    content = content.replace(
        /<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">/,
        '<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">'
    );
    
    fs.writeFileSync(filename, content);
    console.log("Updated", filename);
}

updateFile('src/components/CotizacionesAccionesTable.tsx');
updateFile('src/components/CotizacionesCriptoTable.tsx');

