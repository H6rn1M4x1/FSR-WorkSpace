const fs = require('fs');

let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

const regex = /\{activeSubTab === "horario" &&\n\s*\(\(\) => \{\n\s*const filteredHorarios = horarios\.filter\(\(h\) => \{[\s\S]*?return \(\n\s*<div className="space-y-6">\n\s*<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">/;

const replacement = `{activeSubTab === "horario" &&
        (() => {
          const filteredHorarios = horarios.filter((h) => {
            const matchesSearch =
              h.materia.toLowerCase().includes(hSearchQuery.toLowerCase()) ||
              h.profesores.toLowerCase().includes(hSearchQuery.toLowerCase()) ||
              h.aulas.toLowerCase().includes(hSearchQuery.toLowerCase());
            const matchesDia =
              hSelectedDia === "Todos" || h.dia === hSelectedDia;
            const matchesMateria =
              hSelectedMateria === "Todos" || h.materia === hSelectedMateria;
            return matchesSearch && matchesDia && matchesMateria;
          });

          return (
            <div className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}>
              {/* Header Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-extrabold text-md flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>Horario de Clases</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Consulta tu cronograma semanal de clases, profesores y aulas asignadas.
                  </p>
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setHFormMateria("");
                      setHFormDia("Lunes");
                      setHFormHorario("");
                      setHFormProfesores("");
                      setHFormAulas("");
                      setHFormIsEditing(null);
                      setHFormShowModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Clase</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">`;

c = c.replace(regex, replacement);

fs.writeFileSync('src/components/AcademicView.tsx', c);
