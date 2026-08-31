const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const targetTableStart = `                <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
                  <table className="w-full text-left text-sm border-separate border-spacing-y-2">`;

const newTableStart = `                {/* Mini Calendario Semanal - Alimentación */}
                <div className={\`p-4 rounded-3xl border \${darkMode ? "bg-zinc-900/20 border-zinc-800/60 text-white" : "bg-slate-50/40 border-slate-200/50 text-slate-800"} space-y-3\`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                      Resumen de Alimentación Semanal
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {alimWeekData.map((day, dIdx) => {
                      const isToday = new Date().toDateString() === day.dateObj.toDateString();
                      const isSelected = selectedAlimDate && selectedAlimDate.toDateString() === day.dateObj.toDateString();
                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAlimDate(null);
                            } else {
                              setSelectedAlimDate(day.dateObj);
                            }
                          }}
                          className={\`p-3 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 \${
                            isSelected
                              ? "bg-primary text-white shadow-md ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 border-transparent"
                              : day.hasActivity
                              ? darkMode
                                ? "bg-zinc-900/50 border border-primary/50 text-zinc-100 shadow-xs hover:bg-zinc-800/80"
                                : "bg-primary/5 border border-primary/30 text-slate-800 shadow-xs hover:bg-primary/10"
                              : darkMode
                              ? "bg-zinc-950/20 border border-zinc-800/20 text-zinc-500 hover:bg-zinc-900/50"
                              : "bg-white/40 border border-slate-100 text-slate-400 hover:bg-slate-50"
                          } \${isToday && !isSelected ? "ring-2 ring-primary/60 dark:ring-primary/40" : ""}\`}
                        >
                          <span className={\`text-[9px] font-extrabold tracking-wider \${isSelected ? "text-white/80" : isToday ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-500"}\`}>
                            {day.dayLabel}
                          </span>
                          <span className="text-sm font-extrabold mt-0.5">
                            {day.dayNumber}
                          </span>
                          <span className={\`text-[8px] font-mono font-bold mt-1.5 \${isSelected ? "text-white/90" : day.calories > 0 ? "text-primary dark:text-primary-light" : "text-slate-400 dark:text-zinc-600"}\`}>
                            {Math.round(day.calories)} kcal
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Filter Status */}
                {selectedAlimDate && (
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      Mostrando comidas del: <span className="font-extrabold text-slate-800 dark:text-zinc-200">{selectedAlimDate.toLocaleDateString("es-AR", { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </span>
                    <button
                      onClick={() => setSelectedAlimDate(null)}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                    >
                      Limpiar filtro
                    </button>
                  </div>
                )}
                
                {/* List Table */}
                {(() => {
                  const filteredLogs = alimentacionLogs.filter(log => {
                    if (!selectedAlimDate) return true;
                    if (!log.fecha) return false;
                    const d = new Date(log.fecha);
                    return d.toDateString() === selectedAlimDate.toDateString();
                  });

                  if (filteredLogs.length === 0) {
                    return (
                      <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                        <Utensils className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-3" />
                        <p className="text-sm font-bold text-slate-400 dark:text-zinc-500">No hay comidas registradas para este día.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
                      <table className="w-full text-left text-sm border-separate border-spacing-y-2">`;

content = content.replace(targetTableStart, newTableStart);
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Patched alim table start");
