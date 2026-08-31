const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

const oldIngredientBlock = `return (
                                        <div key={iIdx} className={\`py-1 px-2.5 rounded-lg border flex items-center gap-2 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                          <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">{ing.ingrediente}</span>
                                          <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">{ing.cantidad} {ing.unidad}</span>
                                          <div className="h-3 w-px bg-slate-200 dark:bg-zinc-700/60"></div>
                                          <span className="text-[10px] text-primary font-black flex items-center gap-1 whitespace-nowrap">
                                            <Flame className="w-3 h-3 text-primary shrink-0 fill-primary/20" /> {Math.round(ing.calorias)} kcal
                                          </span>
                                          {(p > 0 || c > 0 || g > 0) && (
                                            <>
                                              <div className="h-3 w-px bg-slate-200 dark:bg-zinc-700/60"></div>
                                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary whitespace-nowrap">
                                                  <span>P: {p}g</span>
                                                  <span>C: {c}g</span>
                                                  <span>G: {g}g</span>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );`;

const newIngredientBlock = `return (
                                        <div key={iIdx} className={\`py-1.5 px-3 rounded-xl border flex flex-col justify-center \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                          <div className="flex items-baseline gap-1.5">
                                            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">{ing.ingrediente}</span>
                                            <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">{ing.cantidad} {ing.unidad}</span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-primary font-black flex items-center gap-1 whitespace-nowrap">
                                              <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {Math.round(ing.calorias)} kcal
                                            </span>
                                            {(p > 0 || c > 0 || g > 0) && (
                                              <>
                                                <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700/60"></div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-primary whitespace-nowrap">
                                                    <span>P: {p}g</span>
                                                    <span>C: {c}g</span>
                                                    <span>G: {g}g</span>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );`;

const oldPlatoBlock = `<div className={\`py-1 px-2.5 rounded-lg border flex flex-wrap sm:flex-nowrap items-center gap-2 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                    <span className="text-[11px] font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">{platoInfo.nombrePlato}</span>
                                    <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">{log.cantidad || 1} porción(es)</span>
                                    <div className="h-3 w-px bg-slate-200 dark:bg-zinc-700/60 hidden sm:block"></div>
                                    <span className="text-[10px] text-primary font-black flex items-center gap-1 whitespace-nowrap">
                                      <Flame className="w-3 h-3 text-primary shrink-0 fill-primary/20" /> {log.calorias} kcal
                                    </span>
                                    {(p > 0 || c > 0 || g > 0) && (
                                        <>
                                          <div className="h-3 w-px bg-slate-200 dark:bg-zinc-700/60 hidden sm:block"></div>
                                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary whitespace-nowrap">
                                              <span>P: {p}g</span>
                                              <span>C: {c}g</span>
                                              <span>G: {g}g</span>
                                          </div>
                                        </>
                                    )}
                                  </div>`;

const newPlatoBlock = `<div className={\`py-1.5 px-3 rounded-xl border flex flex-col justify-center \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">{platoInfo.nombrePlato}</span>
                                      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">{log.cantidad || 1} porción(es)</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-primary font-black flex items-center gap-1 whitespace-nowrap">
                                        <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {log.calorias} kcal
                                      </span>
                                      {(p > 0 || c > 0 || g > 0) && (
                                          <>
                                            <div className="h-3.5 w-px bg-slate-200 dark:bg-zinc-700/60"></div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-primary whitespace-nowrap">
                                                <span>P: {p}g</span>
                                                <span>C: {c}g</span>
                                                <span>G: {g}g</span>
                                            </div>
                                          </>
                                      )}
                                    </div>
                                  </div>`;

if (content.includes(oldIngredientBlock)) {
  content = content.replace(oldIngredientBlock, newIngredientBlock);
  console.log("Replaced ingredient block");
} else {
  console.log("Could not find oldIngredientBlock");
}

if (content.includes(oldPlatoBlock)) {
  content = content.replace(oldPlatoBlock, newPlatoBlock);
  console.log("Replaced plato block");
} else {
  console.log("Could not find oldPlatoBlock");
}

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
