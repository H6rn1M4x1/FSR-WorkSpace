const fs = require('fs');

let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

const regex = /\{activeSubTab === "examenes" &&\n\s*\(\(\) => \{\n\s*const filteredExamenes = examenes\.filter\(\(ex\) => \{[\s\S]*?return \(\n\s*<div className="space-y-6">\n\s*<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">/;

const replacement = `{activeSubTab === "examenes" &&
        (() => {
          const filteredExamenes = examenes.filter((ex) => {
            const matchesSearch =
              ex.materia.toLowerCase().includes(exSearchQuery.toLowerCase()) ||
              ex.aula.toLowerCase().includes(exSearchQuery.toLowerCase());
            const matchesEstado =
              exSelectedEstado === "Todos" || ex.estado === exSelectedEstado;
            const matchesMateria =
              exSelectedMateria === "Todos" || ex.materia === exSelectedMateria;
            return matchesSearch && matchesEstado && matchesMateria;
          });

          return (
            <div className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}>
              {/* Header Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-extrabold text-md flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span>Parciales, Finales y Trabajos</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Registra las fechas de tus próximos exámenes y entregas.
                  </p>
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingExamenId(null);
                      setExMateria("");
                      setExFecha("");
                      setExEstado("Parcial");
                      setExInstancia("Primero");
                      setExAula("");
                      setShowExamenModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Examen / Trabajo</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">`;

c = c.replace(regex, replacement);

c = c.replace(/<button\n\s*onClick=\{\(\) => \{\n\s*setEditingExamenId\(null\);\n\s*setExMateria\(""\);\n\s*setExFecha\(""\);\n\s*setExEstado\("Parcial"\);\n\s*setExInstancia\("Primero"\);\n\s*setExAula\(""\);\n\s*setShowExamenModal\(true\);\n\s*\}\}\n\s*className="px-4 py-2 bg-primary hover:bg-primary text-white dark:text-blue-950 rounded-full text-xs font-bold transition-all shadow-sm shadow-primary\/20 cursor-pointer flex items-center gap-1\.5 ml-auto"\n\s*>\n\s*<Plus className="w-4 h-4" \/>\n\s*<span>Nuevo<\/span>\n\s*<\/button>/, '');

fs.writeFileSync('src/components/AcademicView.tsx', c);
