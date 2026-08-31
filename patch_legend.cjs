const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

// Target 1: Gastos Varios Legend
const targetGVLegend = `                                <Legend
                                  iconType="circle"
                                  formatter={(value) => (
                                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                      {value}
                                    </span>
                                  )}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>`;

const repGVLegend = `                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mt-2 px-2 overflow-y-auto max-h-32">
                            {pieDataGastosVarios.map((entry, index) => (
                              <div key={index} className="flex items-center gap-1.5">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: primaryPaletteGV[index % primaryPaletteGV.length] }}
                                />
                                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                  {entry.name}
                                </span>
                              </div>
                            ))}
                          </div>`;

content = content.replace(targetGVLegend, repGVLegend);

// Target 2: Categorias Legend
const targetCatLegend = `                                <Legend
                                  iconType="circle"
                                  formatter={(value) => (
                                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                      {value}
                                    </span>
                                  )}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>`;

const repCatLegend = `                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mt-2 px-2 overflow-y-auto max-h-32">
                            {pieDataCategorias.map((entry, index) => (
                              <div key={index} className="flex items-center gap-1.5">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: primaryPaletteCat[index % primaryPaletteCat.length] }}
                                />
                                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                  {entry.name}
                                </span>
                              </div>
                            ))}
                          </div>`;

content = content.replace(targetCatLegend, repCatLegend);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Legends replaced");
