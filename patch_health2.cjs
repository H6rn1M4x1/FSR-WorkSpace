const fs = require('fs');
let file = 'src/components/HealthView.tsx';
let content = fs.readFileSync(file, 'utf-8');

const inputClass = 'w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700';

// Replace doctor search
const docRegex = /<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">\s*<div className="relative">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">\s*<Search className="w-4 h-4 text-primary dark:text-primary stroke-\[2\.25px\] opacity-100" \/>\s*<\/span>\s*<input\s*type="text"\s*placeholder="Buscar doctor..."\s*value=\{docSearchQuery\}\s*onChange=\{\(e\) => setDocSearchQuery\(e\.target\.value\)\}\s*className=\{`[^`]+`\}\s*\/>\s*<\/div>/;
const docReplacement = `<div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        type="text"
                        placeholder="Buscar doctor..."
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="${inputClass}"
                      />
                    </div>`;
content = content.replace(docRegex, docReplacement);

// Replace droga search
const drogaRegex = /<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">\s*\{\/\* Search query \*\/\}\s*<div className="relative sm:col-span-1">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">\s*<Search className="w-4 h-4 text-primary dark:text-primary stroke-\[2\.25px\] opacity-100" \/>\s*<\/span>\s*<input\s*type="text"\s*placeholder="Buscar por marca o droga..."\s*value=\{searchQuery\}\s*onChange=\{\(e\) => setSearchQuery\(e\.target\.value\)\}\s*className="[^"]+"\s*\/>\s*<\/div>/;
const drogaReplacement = `<div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                    {/* Search query */}
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        type="text"
                        placeholder="Buscar por marca o droga..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="${inputClass}"
                      />
                    </div>`;
content = content.replace(drogaRegex, drogaReplacement);

// Replace dispSearchQuery
const dispRegex = /<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">\s*<div className="relative">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">\s*<Search className="w-4 h-4 text-primary dark:text-primary stroke-\[2\.25px\] opacity-100" \/>\s*<\/span>\s*<input\s*type="text"\s*placeholder="Buscar por marca o droga..."\s*value=\{dispSearchQuery\}\s*onChange=\{\(e\) => setDispSearchQuery\(e\.target\.value\)\}\s*className="[^"]+"\s*\/>\s*<\/div>/;
const dispReplacement = `<div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        type="text"
                        placeholder="Buscar por marca o droga..."
                        value={dispSearchQuery}
                        onChange={(e) => setDispSearchQuery(e.target.value)}
                        className="${inputClass}"
                      />
                    </div>`;
content = content.replace(dispRegex, dispReplacement);

// Replace paciente search
const pacRegex = /<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\s*<div className="relative">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">\s*<Search className="w-4 h-4 text-primary dark:text-primary stroke-\[2\.25px\] opacity-100" \/>\s*<\/span>\s*<input\s*type="text"\s*placeholder="Buscar paciente..."\s*value=\{patSearchQuery\}\s*onChange=\{\(e\) => setPatSearchQuery\(e\.target\.value\)\}\s*className="[^"]+"\s*\/>\s*<\/div>/;
const pacReplacement = `<div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={patSearchQuery}
                        onChange={(e) => setPatSearchQuery(e.target.value)}
                        className="${inputClass}"
                      />
                    </div>`;
content = content.replace(pacRegex, pacReplacement);

// Replace info search
const infoRegex = /<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">\s*<div className="relative sm:col-span-2">\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary pointer-events-none z-10">\s*<Search className="w-4 h-4 text-primary dark:text-primary stroke-\[2\.25px\] opacity-100" \/>\s*<\/span>\s*<input\s*type="text"\s*placeholder="Buscar por información o informe..."\s*value=\{histSearchQuery\}\s*onChange=\{\(e\) => setHistSearchQuery\(e\.target\.value\)\}\s*className="[^"]+"\s*\/>\s*<\/div>/;
const infoReplacement = `<div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <input
                        type="text"
                        placeholder="Buscar por información o informe..."
                        value={histSearchQuery}
                        onChange={(e) => setHistSearchQuery(e.target.value)}
                        className="${inputClass}"
                      />
                    </div>`;
content = content.replace(infoRegex, infoReplacement);

// Now fix the CustomSelect classes inside HealthView (add sm:w-auto min-w-[200px] to make them look good next to flex-1 inputs)
// We will replace `className="w-full"` with `className="w-full sm:w-auto min-w-[200px]"` if they are inside these sections.
// Easiest is just replace all `<CustomSelect\n                      value={...}\n                      onChange={...}\n                      size="sm"\n                      darkMode={darkMode}\n                      icon={<Filter className="w-3.5 h-3.5" />}\n                      className="w-full"`
// with the new className
content = content.replace(/className="w-full"(\s*)options=/g, 'className="w-full sm:w-auto min-w-[180px]"$1options=');

fs.writeFileSync(file, content);
console.log("Updated HealthView correctly.");
