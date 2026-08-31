const fs = require('fs');
let file = 'src/components/CotizacionesAccionesTable.tsx';
let content = fs.readFileSync(file, 'utf-8');

let regex = /<span className="text-\[10px\] font-bold px-2\.5 py-1 sm:py-0\.5 rounded-full bg-emerald-500\/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500\/20 uppercase tracking-widest flex items-center justify-center gap-1\.5 mb-2 sm:mb-0 w-full sm:w-max">/;

content = content.replace(regex, '<span className="text-[10px] font-bold px-2.5 py-1 sm:py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-2 sm:mb-0 w-full sm:w-max whitespace-nowrap">');

content = content.replace(/<span className="w-1\.5 h-1\.5 rounded-full bg-emerald-500 animate-pulse" \/>/g, '<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />');

fs.writeFileSync(file, content);
