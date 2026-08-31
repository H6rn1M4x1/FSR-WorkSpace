const fs = require('fs');
const file = 'src/components/AppointmentsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex2 = /\{\/\* Status Filter Dropdown \*\/\}\n\s*<div className="w-full sm:w-auto mt-2 sm:mt-0">\n\s*<CustomSelect\n\s*value=\{statusFilter\}\n\s*onChange=\{setStatusFilter\}\n\s*options=\{\[\n\s*\{ value: "Todos", label: "Todos los Estados" \},\n\s*\{ value: "Realizado", label: "Realizado" \},\n\s*\{ value: "Pendiente", label: "Pendiente" \},\n\s*\{ value: "Initinere Diario", label: "Initinere Diario" \},\n\s*\]\}\n\s*icon=\{<Filter className="w-3\.5 h-3\.5" \/>\}\n\s*placeholder="Filtrar por Estado"\n\s*size="sm"\n\s*className="w-full sm:w-40"\n\s*\/>\n\s*<\/div>/;

const replacement2 = `{/* Buscador y Status Filter Dropdown */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Buscar turno o compromiso..."
                    value={listSearchTerm}
                    onChange={(e) => setListSearchTerm(e.target.value)}
                    className={\`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border outline-none transition-colors \${
                      darkMode
                        ? "bg-zinc-950/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus:border-primary"
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-primary"
                    }\`}
                  />
                </div>
                <CustomSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "Todos", label: "Todos los Estados" },
                    { value: "Realizado", label: "Realizado" },
                    { value: "Pendiente", label: "Pendiente" },
                    { value: "Initinere Diario", label: "Initinere Diario" },
                  ]}
                  icon={<Filter className="w-3.5 h-3.5" />}
                  placeholder="Filtrar por Estado"
                  size="sm"
                  className="w-full sm:w-44"
                />
              </div>`;

if (content.match(regex2)) {
  content = content.replace(regex2, replacement2);
  fs.writeFileSync(file, content);
  console.log("Replaced second dropdown");
} else {
  console.log("Second dropdown regex failed");
}
