const fs = require('fs');

let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

const tableRegex = /<div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800\/80">\s*<table className="w-full text-left text-sm border-separate border-spacing-y-2">[\s\S]*?<\/tbody>\s*<\/table>\s*<\/div>/;

const replacement = `
                <div className="space-y-3">
                  {(() => {
                        const dias = [];
                        const hoy = new Date();
                        for (let i = 0; i < 14; i++) {
                          const d = new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000);
                          const fechaStr = d.toISOString().substring(0, 10);
                          dias.push(fechaStr);
                        }
                        
                        const filteredDias = dias.filter(diaStr => {
                          if (!selectedDiarioDate) return true;
                          const dateObj = new Date(diaStr + "T12:00:00");
                          return dateObj.toDateString() === selectedDiarioDate.toDateString();
                        });

                        if (filteredDias.length === 0) {
                          return (
                            <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                              <Activity className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-3" />
                              <p className="text-sm font-bold text-slate-400 dark:text-zinc-500">No hay historial registrado para este día.</p>
                            </div>
                          );
                        }

                        return filteredDias.map((diaStr) => {
                          const dateObj = new Date(diaStr + "T12:00:00");
                          const medidaDia = medidasHistory.find(m => m.fecha === diaStr);
                          const pesoDia = medidaDia ? \`\${medidaDia.peso} kg\` : "-";

                          const comidaDia = (alimentacionLogs || [])
                            .filter(l => l.fecha === diaStr)
                            .reduce((acc, curr) => acc + (curr.calorias || 0), 0);
                            
                          const deporteDia = (deportesActividades || [])
                            .filter(a => a.fechaDesde.startsWith(diaStr))
                            .reduce((acc, curr) => acc + (curr.calorias || 0), 0);
                            
                          const gymDia = (registrosEntrenamiento || [])
                            .filter(r => r.fecha === diaStr)
                            .reduce((acc, curr) => acc + (curr.caloriasTotalesSesion || 0), 0);
                            
                          const gastadasTotal = deporteDia + gymDia;
                          const balanceNeto = comidaDia - gastadasTotal;

                          const currentWeight = medidaDia?.peso || metabolicProfile.pesoActual;
                          const bmr = metabolicProfile.genero === "Masculino"
                            ? 10 * currentWeight + 6.25 * metabolicProfile.altura - 5 * metabolicProfile.edad + 5
                            : 10 * currentWeight + 6.25 * metabolicProfile.altura - 5 * metabolicProfile.edad - 161;
                            
                          const factAct = selectedActivityFactor;
                          const tdee = bmr * factAct;
                          
                          let metaCalorias = tdee;
                          if (metabolicProfile.objetivo === "Bajar de Peso (Déficit)") {
                            metaCalorias -= 500;
                          } else if (metabolicProfile.objetivo === "Ganar Masa Muscular (Superávit)") {
                            metaCalorias += 400;
                          }
                          
                          let cumplio = false;
                          if (comidaDia > 0) {
                            if (metabolicProfile.objetivo === "Bajar de Peso (Déficit)") {
                              cumplio = comidaDia <= metaCalorias + 100;
                            } else if (metabolicProfile.objetivo === "Ganar Masa Muscular (Superávit)") {
                              cumplio = comidaDia >= metaCalorias - 150;
                            } else {
                              cumplio = Math.abs(comidaDia - metaCalorias) <= 200;
                            }
                          }
                          
                          const isToday = diaStr === new Date().toISOString().substring(0, 10);

                          return (
                            <div
                              key={diaStr}
                              className={\`p-5 rounded-3xl border transition-all \${
                                darkMode
                                  ? "bg-zinc-900/40 hover:bg-zinc-800/50 border-zinc-700/50 text-white"
                                  : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/60 text-slate-800"
                              } space-y-3 shadow-xs \${isToday ? "ring-2 ring-primary/30" : ""}\`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/60 pb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                      {dateObj.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0">
                                      <Activity className="w-2.5 h-2.5" /> RESUMEN DIARIO
                                    </span>
                                  </div>
                                  <h4 className="text-base font-extrabold">Balance Neto: {balanceNeto > 0 ? \`+\${balanceNeto}\` : balanceNeto} kcal</h4>
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs font-mono font-bold flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {comidaDia > 0 ? (
                                      cumplio ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Objetivo Cumplido
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                                          <Info className="w-3.5 h-3.5" /> Fuera de Rango
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-zinc-400 text-xs">Sin registros calóricos</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                <div className={\`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                   <span className="font-bold block truncate text-slate-800 dark:text-zinc-200 flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-primary" /> Alimentación</span>
                                   <div className="flex items-center justify-between mt-1">
                                     <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">Total Consumido</span>
                                     <span className="text-xs text-primary/80 font-black flex items-center gap-1">
                                       {comidaDia} kcal
                                     </span>
                                   </div>
                                </div>
                                
                                <div className={\`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                   <span className="font-bold block truncate text-slate-800 dark:text-zinc-200 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-primary" /> Gasto Activo</span>
                                   <div className="flex items-center justify-between mt-1">
                                     <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">Gym + Deporte</span>
                                     <span className="text-xs text-primary/80 font-black flex items-center gap-1">
                                       {gastadasTotal} kcal
                                     </span>
                                   </div>
                                </div>
                                
                                <div className={\`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                   <span className="font-bold block truncate text-slate-800 dark:text-zinc-200 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary" /> Peso Corporal</span>
                                   <div className="flex items-center justify-between mt-1">
                                     <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">Registrado / Actual</span>
                                     <span className="text-xs text-primary/80 font-black flex items-center gap-1">
                                       {pesoDia}
                                     </span>
                                   </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                  })()}
                </div>
`;

const match = content.match(tableRegex);
if (!match) {
  console.error("Could not find Historial Diario table block");
  process.exit(1);
}

content = content.replace(match[0], replacement);
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
console.log("Successfully replaced Historial Diario table.");
