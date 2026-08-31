const fs = require('fs');
let file = 'src/components/AcademicView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const regex = /<input\s+type="text"\s+placeholder="Buscar por materia o correlativas\.\.\."\s+value=\{mSearchQuery\}\s+onChange=\{\(e\) => setMSearchQuery\(e\.target\.value\)\}\s+className="[^"]+"/;
content = content.replace(regex, `<input
                type="text"
                placeholder="Buscar por materia o correlativas..."
                value={mSearchQuery}
                onChange={(e) => setMSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />`);

fs.writeFileSync(file, content);
