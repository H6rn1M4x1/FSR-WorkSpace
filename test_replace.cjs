const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\/\* CHIPS DE ACCESO RÁPIDO A EJERCICIOS DESTACADOS CON FLECHAS DE DESPLAZAMIENTO \*\/\}[\s\S]*?\{\/\* TARJETAS RESUMEN DE MÉTRICAS DEL EJERCICIO SELECCIONADO \*\/\}/;

const replacement = `\{/* BARRA INTEGRADA DE BÚSQUEDA Y SELECCIÓN DE EJERCICIO PARA EL GRÁFICO */\}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 pt-4 border-t border-zinc-200/40 dark:border-zinc-800/60 w-full">
            {/* Búsqueda (Izquierda) */}
            <div className="relative w-full sm:flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar ejercicio..."
                value={exerciseDropdownSearch}
                onChange={(e) => setExerciseDropdownSearch(e.target.value)}
                className={\`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none transition-colors \${
                  darkMode
                    ? "bg-zinc-950/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus:border-primary"
                    : "bg-slate-50/70 border-slate-200/80 text-slate-800 placeholder:text-slate-400 focus:border-primary"
                }\`}
              />
            </div>
            
            {/* Selector de Ejercicio (Derecha) */}
            <div className="flex items-center gap-2">
              <CustomSelect
                value={chartExerciseFilter}
                onChange={(val) => setChartExerciseFilter(val as string)}
                options={[
                  { value: "Todos", label: \`Todos los Ejercicios\` },
                  ...availableExerciseNames
                      .filter(ex => ex.toLowerCase().includes(exerciseDropdownSearch.toLowerCase()))
                      .map(ex => ({ value: ex, label: ex }))
                ]}
                icon={<Filter className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto min-w-[200px]"
                size="sm"
              />
            </div>
          </div>

          {/* TARJETAS RESUMEN DE MÉTRICAS DEL EJERCICIO SELECCIONADO */}`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Updated Filtrado Rapido to Search + Dropdown.");
} else {
  console.log("Regex not found.");
}
