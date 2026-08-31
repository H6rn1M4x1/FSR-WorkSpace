const fs = require('fs');

let c = fs.readFileSync('src/components/MealsView.tsx', 'utf8');

const regex = /\{\/\* RENDER ORGANIZACION SEMANAL TAB \*\/\}\n\s*\{activeSubTab === "organizacion_semanal" && \(\n\s*<div id="organizacion-semanal-section" className="space-y-6">\n\s*\{\/\* Action Bar \*\/\}\n\s*<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200\/60 dark:border-zinc-800\/60 shadow-xs">/;

const replacement = `{/* RENDER ORGANIZACION SEMANAL TAB */}
      {activeSubTab === "organizacion_semanal" && (
        <div id="organizacion-semanal-section" className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}>
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span>Organización Semanal</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Planifica qué días vas a cocinar cada plato.
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              <button
                id="add-organizacion-btn"
                onClick={() => {
                  setEditingOrgId(null);
                  setOrgFecha("");
                  setOrgPlatoId("");
                  setShowAddOrg(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Organizar Plato</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">`;

c = c.replace(regex, replacement);

c = c.replace(/<button\n\s*id="add-organizacion-btn"\n\s*onClick=\{\(\) => \{\n\s*setEditingOrgId\(null\);\n\s*setOrgFecha\(""\);\n\s*setOrgPlatoId\(""\);\n\s*setShowAddOrg\(true\);\n\s*\}\}\n\s*className="px-4 py-2 rounded-full bg-primary text-white dark:text-blue-950 text-xs font-bold transition-all hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm animate-fade-in"\n\s*>\n\s*<Plus className="w-4 h-4" \/>\n\s*<span>Organizar Plato<\/span>\n\s*<\/button>/, '');

// Also remove the closing div of "Action Bar" which was the wrapper `flex flex-col sm:flex-row items-stretch...`
c = c.replace(/<div className="relative flex-1 max-w-md">\n\s*<Search className="absolute left-3.5 top-1\/2 -translate-y-1\/2 w-4 h-4 text-slate-400 dark:text-zinc-500" \/>\n\s*<input\n\s*id="search-organizacion-input"[\s\S]*?\/>\n\s*<\/div>\n\s*<\/div>/, `<div className="relative flex-1 max-w-md">\n              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />\n              <input\n                id="search-organizacion-input"\n                type="text"\n                placeholder="Buscar por plato, día o fecha..."\n                value={orgSearchQuery}\n                onChange={(e) => setOrgSearchQuery(e.target.value)}\n                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/30 border border-slate-200/80 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all focus:border-slate-400 dark:focus:border-zinc-700"\n              />\n            </div>\n          </div>`);

// Finally, remove the extra space-y-6 container styling if it's there? Wait, I completely replaced `<div id="organizacion-semanal-section" className="space-y-6">` with the new wrapper.

// And we must ensure the "Table Container" doesn't have its own wrapper if not needed. But let's leave it as `overflow-x-auto rounded-2xl...` like the others.
c = c.replace(/\{\/\* Table Container \*\/\}\n\s*<div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200\/60 dark:border-zinc-800\/60 overflow-hidden shadow-xs">/, `{/* Table Container */}\n          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">`);


fs.writeFileSync('src/components/MealsView.tsx', c);
