const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

// 1. Fix Alimentacion List Filter
const alimListRegex = /const filteredLogs = alimentacionLogs\.filter\([\s\S]*?\}\);/;
const fixedAlimList = `let filteredLogs = alimentacionLogs.filter(log => {
                      if (!selectedAlimDate) return true;
                      if (!log.fecha) return false;
                      const [y, m, d] = log.fecha.split('-').map(Number);
                      const dObj = new Date(y, m - 1, d);
                      return dObj.toDateString() === selectedAlimDate.toDateString();
                    });
                    
                    filteredLogs.sort(
                          (a, b) =>
                            new Date(b.fecha).getTime() -
                            new Date(a.fecha).getTime()
                    );
                    
                    if (!selectedAlimDate) {
                        filteredLogs = filteredLogs.slice(0, 5);
                    }`;
                    
content = content.replace(alimListRegex, fixedAlimList);

// Remove the inline sort from the return statement
content = content.replace(/return filteredLogs\s*\.sort\(\s*\(\s*a,\s*b\s*\)\s*=>\s*new Date\(b\.fecha\)\.getTime\(\)\s*-\s*new Date\(a\.fecha\)\.getTime\(\),\s*\)\s*\.map/g, "return filteredLogs.map");

// 2. Fix Diario List Filter
const diarioListRegex = /const filteredDias = dias\.filter\([\s\S]*?\}\);/;
const fixedDiarioList = `let filteredDias = dias.filter(diaStr => {
                          if (selectedDiarioDate) {
                              const [y, m, d] = diaStr.split('-').map(Number);
                              const dateObj = new Date(y, m - 1, d);
                              return dateObj.toDateString() === selectedDiarioDate.toDateString();
                          }
                          
                          const comidaDia = (alimentacionLogs || []).filter(l => l.fecha === diaStr).reduce((acc, curr) => acc + (curr.calorias || 0), 0);
                          const deporteDia = (deportesActividades || []).filter(a => a.fechaDesde.startsWith(diaStr)).reduce((acc, curr) => acc + (curr.calorias || 0), 0);
                          const gymDia = (registrosEntrenamiento || []).filter(r => r.fecha === diaStr).reduce((acc, curr) => acc + (curr.caloriasTotalesSesion || 0), 0);
                          
                          return comidaDia > 0 || deporteDia > 0 || gymDia > 0;
                        });
                        
                        if (!selectedDiarioDate) {
                            filteredDias = filteredDias.slice(0, 5);
                        }`;
                        
content = content.replace(diarioListRegex, fixedDiarioList);

// 3. Add Mini Calendar to Historial Diario
const diarioHeaderRegex = /<h3 className="text-lg font-black text-slate-800 dark:text-zinc-100">\s*Historial Diario\s*<\/h3>\s*<\/div>\s*<p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">\s*Resumen metabólico día a día.\s*<\/p>\s*<\/div>\s*<\/div>/;

const miniCalendarDiario = `<h3 className="text-lg font-black text-slate-800 dark:text-zinc-100">
                        Historial Diario
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      Resumen metabólico día a día.
                    </p>
                  </div>
                </div>

                {/* Resumen Semanal Mini Calendario */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Resumen Semanal de Actividad
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {diarioWeekData.map((day, dIdx) => {
                      const isToday = new Date().toDateString() === day.dateObj.toDateString();
                      const isSelected = selectedDiarioDate && selectedDiarioDate.toDateString() === day.dateObj.toDateString();
                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDiarioDate(null);
                            } else {
                              setSelectedDiarioDate(day.dateObj);
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
                          <span className={\`text-[8px] font-mono font-bold mt-1.5 \${isSelected ? "text-white/90" : day.balance > 0 ? "text-amber-500 dark:text-amber-400" : day.balance < 0 ? "text-green-500 dark:text-green-400" : "text-slate-400 dark:text-zinc-600"}\`}>
                            {Math.round(day.balance)} kcal
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>`;

content = content.replace(diarioHeaderRegex, miniCalendarDiario);

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
console.log("Filters and calendar updated.");

