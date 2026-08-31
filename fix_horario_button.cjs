const fs = require('fs');
let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

c = c.replace(/onClick=\{\(\) => \{\n\s*setHFormMateria\(""\);\n\s*setHFormDia\("Lunes"\);\n\s*setHFormHorario\(""\);\n\s*setHFormProfesores\(""\);\n\s*setHFormAulas\(""\);\n\s*setHFormIsEditing\(null\);\n\s*setHFormShowModal\(true\);\n\s*\}\}/, `onClick={() => {
                      setEditingHorarioId(null);
                      setHDia("Lunes");
                      setHHoraInicio("");
                      setHHoraFin("");
                      setHMateria("");
                      setHAulas("");
                      setHProfesores("");
                      setShowHorarioModal(true);
                    }}`);

c = c.replace(/<span>Agregar Clase<\/span>/, '<span>Nuevo Horario</span>');

// remove old button
c = c.replace(/<button\n\s*onClick=\{\(\) => \{\n\s*setEditingHorarioId\(null\);\n\s*setHDia\("Lunes"\);\n\s*setHHoraInicio\(""\);\n\s*setHHoraFin\(""\);\n\s*setHMateria\(""\);\n\s*setHAulas\(""\);\n\s*setHProfesores\(""\);\n\s*setShowHorarioModal\(true\);\n\s*\}\}\n\s*className="px-4 py-2 bg-primary hover:bg-primary text-white dark:text-blue-950 rounded-full text-xs font-bold transition-all shadow-sm shadow-primary\/20 cursor-pointer flex items-center gap-1.5 ml-auto"\n\s*>\n\s*<Plus className="w-4 h-4" \/>\n\s*<span>Nuevo Horario<\/span>\n\s*<\/button>/, '');

fs.writeFileSync('src/components/AcademicView.tsx', c);
