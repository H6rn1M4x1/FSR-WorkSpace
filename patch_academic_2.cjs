const fs = require('fs');
let file = 'src/components/AcademicView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const inputClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';
const searchIcon = '<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />';

// 1. Horarios
const hSearchRegex = /<Search className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-primary" \/>\s*<input\s*type="text"\s*value=\{hSearchQuery\}\s*onChange=\{\(e\) => setHSearchQuery\(e\.target\.value\)\}\s*placeholder="Buscar por materia, aula o profesor..."\s*className="[^"]+"\s*\/>/;

content = content.replace(hSearchRegex, `${searchIcon}
                  <input
                    type="text"
                    value={hSearchQuery}
                    onChange={(e) => setHSearchQuery(e.target.value)}
                    placeholder="Buscar por materia, aula o profesor..."
                    className="${inputClass}"
                  />`);

// 2. Exámenes
const eSearchRegex = /<Search className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-primary" \/>\s*<input\s*type="text"\s*value=\{eSearchQuery\}\s*onChange=\{\(e\) => setESearchQuery\(e\.target\.value\)\}\s*placeholder="Buscar por materia o aula..."\s*className="[^"]+"\s*\/>/;

content = content.replace(eSearchRegex, `${searchIcon}
                  <input
                    type="text"
                    value={eSearchQuery}
                    onChange={(e) => setESearchQuery(e.target.value)}
                    placeholder="Buscar por materia o aula..."
                    className="${inputClass}"
                  />`);

// Fix containers for selects next to inputs
// Make sure "flex flex-col sm:flex-row flex-wrap gap-2.5 items-stretch sm:items-center w-full md:w-auto" becomes "flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto"
content = content.replace(/<div className="flex flex-col sm:flex-row flex-wrap gap-2\.5 items-stretch sm:items-center w-full md:w-auto">/g, '<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">');

// For the select classes, let's just make sure they have size="sm".
// In AcademicView, some selects inside Horarios/Exámenes might not have size="sm" or the correct className.
// Let's replace the `CustomSelect` calls inside these sections (hSelectedDia, hSelectedMateria, eSelectedEstado, eSelectedMateria).
content = content.replace(/<CustomSelect\s+value=\{hSelectedDia\}/, '<CustomSelect\n                    size="sm"\n                    className="w-full sm:w-auto min-w-[160px]"\n                    value={hSelectedDia}');
content = content.replace(/<CustomSelect\s+value=\{hSelectedMateria\}/, '<CustomSelect\n                    size="sm"\n                    className="w-full sm:w-auto min-w-[160px]"\n                    value={hSelectedMateria}');
content = content.replace(/<CustomSelect\s+value=\{eSelectedEstado\}/, '<CustomSelect\n                    size="sm"\n                    className="w-full sm:w-auto min-w-[160px]"\n                    value={eSelectedEstado}');
content = content.replace(/<CustomSelect\s+value=\{eSelectedMateria\}/, '<CustomSelect\n                    size="sm"\n                    className="w-full sm:w-auto min-w-[160px]"\n                    value={eSelectedMateria}');


fs.writeFileSync(file, content);
console.log("Updated AcademicView (Horarios/Exámenes)");
