const fs = require('fs');
let file = 'src/components/AcademicView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const inputClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';
const searchIcon = '<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />';

// 2. Exámenes
const exSearchRegex = /<Search className="absolute left-3\.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-primary" \/>\s*<input\s*type="text"\s*value=\{exSearchQuery\}\s*onChange=\{\(e\) => setExSearchQuery\(e\.target\.value\)\}\s*placeholder="Buscar por materia o aula..."\s*className="[^"]+"\s*\/>/;

content = content.replace(exSearchRegex, `${searchIcon}
                  <input
                    type="text"
                    value={exSearchQuery}
                    onChange={(e) => setExSearchQuery(e.target.value)}
                    placeholder="Buscar por materia o aula..."
                    className="${inputClass}"
                  />`);

// Select classes for Exámenes (it's exSelectedEstado, exSelectedMateria)
content = content.replace(/<CustomSelect\s+value=\{exSelectedEstado\}/, '<CustomSelect\n                    size="sm"\n                    className="w-full sm:w-auto min-w-[160px]"\n                    value={exSelectedEstado}');
content = content.replace(/<CustomSelect\s+value=\{exSelectedMateria\}/, '<CustomSelect\n                    size="sm"\n                    className="w-full sm:w-auto min-w-[160px]"\n                    value={exSelectedMateria}');

fs.writeFileSync(file, content);
console.log("Updated AcademicView (Exámenes fix)");
