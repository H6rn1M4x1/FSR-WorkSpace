const fs = require('fs');

let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

const tableRegex = /<div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800\/80">\s*<table[\s\S]*?<\/div>/;

const replacement = `
                    <div className="space-y-3">
                      {filteredLogs
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
                            
                            let fechaDate = new Date(log.fecha);
                            // Adjust for timezone to avoid off-by-one day issues since log.fecha is likely YYYY-MM-DD
                            fechaDate = new Date(fechaDate.getTime() + fechaDate.getTimezoneOffset() * 60000);

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
                          })}
                    </div>
`;

// There are TWO such blocks, one for Alimentación and one for Historial Diario.
// We must find the FIRST match to replace Alimentación.

const match1 = content.match(tableRegex);
if (!match1) {
  console.error("Could not find table block");
  process.exit(1);
}

// Replace only the first occurrence for now.
content = content.replace(match1[0], replacement);

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
console.log("Successfully replaced Alimentacion table.");
