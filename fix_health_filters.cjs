const fs = require('fs');
let file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Fix 5344: Buscar paciente
// <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//   <div className="relative">...</div>
//   <CustomSelect ... />
// </div>
content = content.replace(
    /<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\s*<div className="relative">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">\s*<Search className="w-4 h-4 text-primary dark:text-primary stroke-\[2\.25px\] opacity-100" \/>\s*<\/span>\s*<input\s*type="text"\s*placeholder="Buscar paciente\.\.\."\s*value=\{bpSearchQuery\}\s*onChange=\{\(e\) => setBpSearchQuery\(e\.target\.value\)\}\s*className=\{`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium outline-none transition-all \$\{\s*darkMode\s*\?\s*"bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary\/20"\s*:\s*"bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-700 focus:border-primary focus:ring-2 focus:ring-primary\/20"\s*\}\`\}\s*\/>\s*<\/div>\s*<CustomSelect([\s\S]*?)\]\}\s*\/>\s*<\/div>/,
    `<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">
                        <Search className="w-4 h-4 text-primary dark:text-primary stroke-[2.25px] opacity-100" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={bpSearchQuery}
                        onChange={(e) => setBpSearchQuery(e.target.value)}
                        className={\`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium outline-none transition-all \${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                            : "bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-700 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        }\`}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                      <CustomSelect$1]}
                      />
                    </div>
                  </div>`
);

// Fix 5557: Buscar por información
content = content.replace(
    /<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">\s*<div className="relative">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">\s*<Search className="w-4 h-4 text-primary dark:text-primary stroke-\[2\.25px\] opacity-100" \/>\s*<\/span>\s*<input\s*type="text"\s*placeholder="Buscar por información o informe\.\.\."\s*value=\{estudioSearchQuery\}\s*onChange=\{\(e\) => setEstudioSearchQuery\(e\.target\.value\)\}\s*className=\{`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium outline-none transition-all \$\{\s*darkMode\s*\?\s*"bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary\/20"\s*:\s*"bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-700 focus:border-primary focus:ring-2 focus:ring-primary\/20"\s*\}\`\}\s*\/>\s*<\/div>\s*<CustomSelect([\s\S]*?)\]\}\s*\/>\s*<CustomSelect([\s\S]*?)\]\}\s*\/>\s*<\/div>/,
    `<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">
                        <Search className="w-4 h-4 text-primary dark:text-primary stroke-[2.25px] opacity-100" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por información o informe..."
                        value={estudioSearchQuery}
                        onChange={(e) => setEstudioSearchQuery(e.target.value)}
                        className={\`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium outline-none transition-all \${
                          darkMode
                            ? "bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                            : "bg-slate-50 border-slate-200 text-zinc-800 placeholder:text-zinc-700 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        }\`}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                      <CustomSelect$1]}
                      />
                      <CustomSelect$2]}
                      />
                    </div>
                  </div>`
);

fs.writeFileSync(file, content);
console.log("Updated HealthView grids");
