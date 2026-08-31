const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

// The file currently has `{/* List Table */}` around line 3900.
// Let's find this first instance.
const firstListTableIdx = content.indexOf('{/* List Table */}');
if (firstListTableIdx === -1) {
    console.error("Not found");
    process.exit(1);
}

// Find the end of the messed up Diario block that replaced it.
// We know it ends with `</AnimatePresence>` ? No, my fix_all.cjs replaced up to `</motion.div>` or `</AnimatePresence>`.
// Wait! Let's check where the `</AnimatePresence>` is in the current file.
const animatePresenceIdx = content.indexOf('</AnimatePresence>', firstListTableIdx);
if (animatePresenceIdx === -1) {
    console.error("AnimatePresence not found");
}

// Let's cut the file into 2 parts.
const part1 = content.substring(0, firstListTableIdx);
const part2 = animatePresenceIdx !== -1 ? content.substring(animatePresenceIdx) : content.substring(content.indexOf('{activeSubTab === "control_clinico"'));

// Now we need to insert:
// 1. Alimentacion list table
// 2. </motion.div> )}
// 3. The whole registro_diario tab
// 4. Then part2 (which starts with </AnimatePresence>)

const fixedAlimBlock = `
                {/* List Table */}
                <div className="space-y-3">
                  {(() => {
                    const filteredLogs = alimentacionLogs.filter(log => {
                      if (!selectedAlimDate) return true;
                      if (!log.fecha) return false;
                      const [y, m, d] = log.fecha.split('-').map(Number);
                      const dObj = new Date(y, m - 1, d);
                      return dObj.toDateString() === selectedAlimDate.toDateString();
                    });

                    if (filteredLogs.length === 0) {
                      return (
                        <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                          <Utensils className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-3" />
                          <p className="text-sm font-bold text-slate-400 dark:text-zinc-500">No hay comidas registradas para este día.</p>
                        </div>
                      );
                    }

                    return filteredLogs
                        .sort(
                          (a, b) =>
                            new Date(b.fecha).getTime() -
                            new Date(a.fecha).getTime(),
                        )
                        .map((log) => {
                          const platoInfo = platos?.find(
                            (p) => p.id === log.platoId,
                          );
                          const portions = log.cantidad || 1;
                          
                          let p = 0, c = 0, g = 0;
                          const hasCustomValores = log.valoresNutricionales && (
                            (log.valoresNutricionales.proteinas || 0) > 0 ||
                            (log.valoresNutricionales.carbohidratos || 0) > 0 ||
                            (log.valoresNutricionales.grasas || 0) > 0
                          );

                          if (hasCustomValores || platoInfo) {
                            try {
                              const vnBase = log.valoresNutricionales || (platoInfo ? calcularNutricionPlato(platoInfo, alimentos || [], mercaderia || []) : null);
                              if (vnBase) {
                                const factor = log.valoresNutricionales ? 1 : portions;
                                p = Math.round((vnBase.proteinas || 0) * factor);
                                c = Math.round((vnBase.carbohidratos || 0) * factor);
                                g = Math.round((vnBase.grasas || 0) * factor);
                              }
                            } catch (e) {
                              console.error("[HealthView] Error calculating nutrition log:", e);
                            }
                          }
                          
                          let fechaDate = new Date(log.fecha + "T12:00:00");

                          return (
                            <div
                              key={log.id}
                              className={\`p-5 rounded-3xl border transition-all \${
                                darkMode
                                  ? "bg-zinc-900/40 hover:bg-zinc-800/50 border-zinc-700/50 text-white"
                                  : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/60 text-slate-800"
                              } space-y-3 shadow-xs\`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/50 dark:border-zinc-800/60 pb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                                      {log.fecha ? fechaDate.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "FECHA DESCONOCIDA"}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0">
                                      <Utensils className="w-2.5 h-2.5" /> COMIDAS
                                    </span>
                                  </div>
                                  <h4 className="text-base font-extrabold">{log.estado} {platoInfo ? \`- \${platoInfo.nombrePlato}\` : ""}</h4>
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs font-mono font-bold flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                      <Flame className="w-3.5 h-3.5 fill-current" /> {log.calorias} kcal
                                    </span>
                                    {(p > 0 || c > 0 || g > 0) && (
                                      <>
                                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                          P: {p}g
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                          C: {c}g
                                        </span>
                                        <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                                          G: {g}g
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 ml-2 border-l border-zinc-200/60 dark:border-zinc-800/80 pl-2 shrink-0">
                                    <button
                                      onClick={() => handleDeleteAlimLog(log.id)}
                                      className="p-1.5 text-slate-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {log.ingredientesConsumidos && log.ingredientesConsumidos.length > 0 ? (
                                  log.ingredientesConsumidos.map((ing, iIdx) => (
                                    <div key={iIdx} className={\`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                      <span className="font-bold block truncate text-slate-800 dark:text-zinc-200">{ing.ingrediente}</span>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                                          {ing.cantidad} {ing.unidad}
                                        </span>
                                        <span className="text-xs text-primary/80 font-black flex items-center gap-1">
                                          <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {Math.round(ing.calorias)} kcal
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : platoInfo ? (
                                  <div className={\`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                    <span className="font-bold block truncate text-slate-800 dark:text-zinc-200">{platoInfo.nombrePlato}</span>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                                        {log.cantidad || 1} porción(es)
                                      </span>
                                      <span className="text-xs text-primary/80 font-black flex items-center gap-1">
                                        <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {log.calorias} kcal
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic">Resumen general. No hay detalles de ingredientes.</p>
                                )}
                              </div>
                            </div>
                          );
                        });
                  })()}
                </div>
              </motion.div>
            )}
`;

const registroDiarioHeader = `
            {deporteAlimActiveTab === "registro_diario" && (
              <motion.div
                key="registro_diario"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className={\`p-6 rounded-3xl border \${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                    : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
                } space-y-6 shadow-xs\`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-zinc-100">
                        Historial Diario
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      Resumen metabólico día a día.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    Últimos 14 días
                  </span>
                  {selectedDiarioDate && (
                    <button
                      onClick={() => setSelectedDiarioDate(null)}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                    >
                      Limpiar filtro
                    </button>
                  )}
                </div>
`;

const fixedDiarioBlock = `
                {/* List Table */}
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
                          const [y, m, d] = diaStr.split('-').map(Number);
                          const dateObj = new Date(y, m - 1, d);
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
              </motion.div>
            )}
`;

let newContent = part1 + fixedAlimBlock + registroDiarioHeader + fixedDiarioBlock + part2;
fs.writeFileSync('src/components/HealthView.tsx', newContent, 'utf-8');
console.log("Recovered everything.");

