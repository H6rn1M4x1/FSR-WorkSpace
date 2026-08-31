const fs = require('fs');

let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

const regex = /\{\/\* Informacion de Materias Submenu Tab \*\/\}\n\s*\{activeSubTab === "informacion_materias" && \(\n\s*<div\n\s*className=\{`p-6 rounded-3xl border \$\{\n\s*darkMode\n\s*\? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"\n\s*: "bg-white border-zinc-200 text-zinc-800 shadow-sm"\n\s*\}`\}\n\s*>\n\s*\{\/\* Header \*\/\}\n\s*<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">/;

const replacement = `{/* Informacion de Materias Submenu Tab */}
      {activeSubTab === "informacion_materias" && (
        <div className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}>
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">`;

c = c.replace(regex, replacement);

c = c.replace(/<div>\n\s*<div className="flex items-center gap-2">\n\s*<GraduationCap className="w-5 h-5 text-primary" \/>\n\s*<h3 className="font-bold text-lg">Información de Materias<\/h3>\n\s*<\/div>\n\s*<p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">\n\s*Administra el estado, correlativas y fechas clave de regularidad\n\s*o aprobación de las materias de tu carrera.\n\s*<\/p>\n\s*<\/div>/, `<div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <span>Información de Materias</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Administra el estado, correlativas y fechas clave de regularidad o aprobación de las materias de tu carrera.
              </p>
            </div>`);

c = c.replace(/<button\n\s*onClick=\{\(\) => \{\n\s*setEditingMateriaId\(null\);\n\s*setMMateria\(""\);\n\s*setMEstado\("Sin empezar"\);\n\s*setMAnoCursado\("Primer Año"\);\n\s*setMCuatrimestre\("Primer Cuatrimestrre"\);\n\s*setMCursadoDebil\("Sin correlativas"\);\n\s*setMCursadoFuerte\("Sin correlativas"\);\n\s*setMRendirFuerte\("Sin correlativas"\);\n\s*setMFechaRegularidad\(""\);\n\s*setMFechaVencimiento\(""\);\n\s*setMFechaAprobado\(""\);\n\s*setShowMateriaModal\(true\);\n\s*\}\}\n\s*className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-xs self-start sm:self-center"\n\s*>\n\s*<Plus className="w-4 h-4" \/>\n\s*<span>Agregar Materia<\/span>\n\s*<\/button>/, `<div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              <button
                onClick={() => {
                  setEditingMateriaId(null);
                  setMMateria("");
                  setMEstado("Sin empezar");
                  setMAnoCursado("Primer Año");
                  setMCuatrimestre("Primer Cuatrimestrre");
                  setMCursadoDebil("Sin correlativas");
                  setMCursadoFuerte("Sin correlativas");
                  setMRendirFuerte("Sin correlativas");
                  setMFechaRegularidad("");
                  setMFechaVencimiento("");
                  setMFechaAprobado("");
                  setShowMateriaModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Materia</span>
              </button>
            </div>`);

// Check the Filters Bar
c = c.replace(/\{\/\* Filters Bar \*\/\}\n\s*<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">/, `{/* Filters Bar */}\n          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">`);

// Replace the inner part of Filters Bar so it looks like the others (or keep the grid, it's fine, but wait `flex-1` is needed for search)
// Actually, changing `grid-cols-4` to `flex` might mess up CustomSelects width. Let's see what it has.
// Search query, and 3 CustomSelects. `flex flex-col sm:flex-row` with `flex-1` for Search and fixed/auto width for selects is better!
c = c.replace(/<div className="relative">\n\s*<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-zinc-500">\n\s*<Search className="w-4 h-4" \/>\n\s*<\/span>\n\s*<input\n\s*type="text"\n\s*placeholder="Buscar materia..."/, `<div className="relative flex-1">\n              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />\n              <input\n                type="text"\n                placeholder="Buscar materia..."`);

c = c.replace(/className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950\/50 border border-slate-200 dark:border-zinc-800 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 transition-all focus:border-primary"/, `className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-xs focus:border-primary"`);

fs.writeFileSync('src/components/AcademicView.tsx', c);
