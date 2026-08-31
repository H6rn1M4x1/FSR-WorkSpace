const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

const emptyGVTarget = `<div className="flex-1 flex items-center justify-center text-xs text-zinc-500 font-medium italic min-h-[160px]">
                          Sin datos
                        </div>`;

const emptyGVRep = `<div className="flex-1 flex flex-col">
                          <div className="h-60 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={[{ name: 'Sin datos', value: 1 }]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={65}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  <Cell fill={darkMode ? "#18181b" : "#e2e8f0"} />
                                </Pie>
                              </RechartsPieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                Total
                              </span>
                              <span className="text-xs font-black text-slate-500 dark:text-zinc-400">
                                $0,00
                              </span>
                            </div>
                          </div>
                          <div className="text-center text-xs text-zinc-500 font-medium italic mt-2">
                            Sin datos
                          </div>
                        </div>`;

content = content.replace(emptyGVTarget, emptyGVRep);

const emptyCatTarget = `<div className="flex-1 flex items-center justify-center text-xs text-zinc-500 font-medium italic min-h-[160px]">
                      Sin datos
                    </div>`;

content = content.replace(emptyCatTarget, emptyGVRep); // Use same for Categories

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Empty states patched");
