const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

const targetStr = `                  {/* budgets progress */}
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between h-full text-zinc-900 dark:text-white shadow-xs">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          <h3 className="font-bold text-md font-sans dark:text-white">
                            Categorías
                          </h3>
                        </div>
                      </div>
                      <div className="space-y-4 max-h-60 overflow-y-auto pr-1">`;

const replacementStr = `                  {/* budgets progress */}
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col h-full text-zinc-900 dark:text-white shadow-xs">
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-md font-sans dark:text-white">
                          Categorías
                        </h3>
                      </div>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-1">`;

content = content.replace(targetStr, replacementStr);

// Also need to remove the closing </div> of the removed `<div>` wrapper
const targetStrEnd = `                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Custom Visual SVG Donut/Pie Chart */}`;

const replacementStrEnd = `                            </div>
                          );
                        })}
                      </div>
                  </div>
                  {/* Custom Visual SVG Donut/Pie Chart */}`;

content = content.replace(targetStrEnd, replacementStrEnd);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched Categories height");
