const fs = require('fs');
let c = fs.readFileSync('src/components/MealsView.tsx', 'utf8');

c = c.replace(/className=\{`p-6 rounded-3xl border \$\{\n\s*darkMode\n\s*\? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"\n\s*: "bg-white border-zinc-200 text-zinc-800 shadow-sm"\n\s*\}`\}/g, `className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}`);

c = c.replace(/\{\/\* Header \*\/\}\n\s*<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">/g, `{/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">`);

c = c.replace(/<div className="flex gap-2">/g, `<div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0"><div className="flex flex-wrap items-center gap-2">`);
c = c.replace(/<\/button>\n\s*<\/div>\n\s*<\/div>\n\n\s*\{\/\* Filter & Search \*\/\}/g, `</button>\n            </div>\n            </div>\n          </div>\n\n          {/* Filters Bar */}`);

// We need to also clean up the custom styles inside the buttons: `self-start sm:self-center` and hover backgrounds.
c = c.replace(/className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary(-hover)? text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-xs self-start sm:self-center"/g, `className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"`);


fs.writeFileSync('src/components/MealsView.tsx', c);
