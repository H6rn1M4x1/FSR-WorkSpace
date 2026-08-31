const fs = require('fs');

let c = fs.readFileSync('src/components/AcademicView.tsx', 'utf8');

const regex = /return \(\n\s*<div className="space-y-6">\n\s*\{\/\* Bento Grid Stats/;

const replacement = `return (
            <div className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}>
              {/* Header Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-extrabold text-md flex items-center gap-2">
                    <Library className="w-5 h-5 text-primary" />
                    <span>Plan de Estudio</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Visualiza tu avance académico, verifica correlativas y planifica tu cursado.
                  </p>
                </div>
              </div>

              {/* Bento Grid Stats`;

c = c.replace(regex, replacement);

fs.writeFileSync('src/components/AcademicView.tsx', c);
