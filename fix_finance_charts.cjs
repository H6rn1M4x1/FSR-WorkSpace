const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

const target1 = `              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between h-full text-zinc-900 dark:text-white shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-md dark:text-white">
                    Distribución de Gastos Varios
                  </h3>
                </div>

                <div className="flex justify-center my-2 relative">
                  <svg viewBox="0 0 100 100" className="w-32 h-32">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#18181b"
                      strokeWidth="12"
                    />
                    {(() => {
                      let cumulativePercent = 0;
                      return activeGastosVariosCategories.map((cat, idx) => {
                        if (totalGastosVarios === 0) return null;
                        const amt = gastosVariosCategoryTotals[cat] || 0;
                        const share = amt / totalGastosVarios;
                        const dashArray = \`\${share * 251.2} 251.2\`;
                        const dashOffset = \`\${251.2 - (cumulativePercent * 251.2) / 100}\`;
                        cumulativePercent += share * 100;

                        return (
                          <circle
                            key={cat}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={chartColors[idx % chartColors.length]}
                            strokeWidth="12"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 50 50)"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col p-2 text-center">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase">
                      Total
                    </span>
                    <span className="text-[10px] font-extrabold font-mono tracking-tight whitespace-nowrap dark:text-white">
                      {formatCurrency(totalGastosVarios)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center mt-2.5 text-[10px] font-bold max-h-24 overflow-y-auto scrollbar-none">
                  {activeGastosVariosCategories.length === 0 ? (
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Sin datos</span>
                  ) : (
                    activeGastosVariosCategories.map((cat, idx) => {
                      return (
                        <div key={cat} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                chartColors[idx % chartColors.length],
                            }}
                          ></span>
                          <span
                            className="text-zinc-500 dark:text-zinc-400 truncate max-w-[100px]"
                            title={cat}
                          >
                            {cat}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>`;

const replacement1 = `              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between h-full text-zinc-900 dark:text-white shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-md dark:text-white">
                    Distribución de Gastos Varios
                  </h3>
                </div>
                {(() => {
                  const pieDataGastosVarios = activeGastosVariosCategories.map((cat) => ({
                    name: cat,
                    value: gastosVariosCategoryTotals[cat] || 0
                  })).filter(item => item.value > 0);

                  const totalPieEntriesGV = Math.max(pieDataGastosVarios.length, 1);
                  const primaryPaletteGV = pieDataGastosVarios.map((_, index) => {
                    const opacityPercent = Math.max(
                      30,
                      Math.round(100 - (index * 65) / Math.max(totalPieEntriesGV - 1, 1))
                    );
                    return \`color-mix(in srgb, var(--color-primary) \${opacityPercent}%, \${darkMode ? "#27272a" : "#cbd5e1"})\`;
                  });

                  return pieDataGastosVarios.length > 0 ? (
                    <div className="flex-1 flex flex-col">
                      <div className="h-40 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieDataGastosVarios}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={4}
                              cornerRadius={8}
                              dataKey="value"
                            >
                              {pieDataGastosVarios.map((entry, index) => (
                                <Cell
                                  key={\`cell-\${index}\`}
                                  fill={primaryPaletteGV[index % primaryPaletteGV.length]}
                                  stroke={darkMode ? "#09090b" : "#f8fafc"}
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: darkMode ? "#18181b" : "#ffffff",
                                border: "1px solid var(--color-primary)",
                                borderRadius: "14px",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                              itemStyle={{
                                color: "var(--color-primary)",
                              }}
                              formatter={(value) => formatCurrency(value as number)}
                            />
                            <Legend
                              iconType="circle"
                              formatter={(value) => (
                                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                  {value}
                                </span>
                              )}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                            Total
                          </span>
                          <span className="text-xs font-black text-primary">
                            {formatCurrency(totalGastosVarios)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 font-medium italic min-h-[160px]">
                      Sin datos
                    </div>
                  );
                })()}
              </div>`;

content = content.replace(target1, replacement1);

const target2 = `              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between h-full text-zinc-900 dark:text-white shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-md dark:text-white">
                    Distribución por Categoria
                  </h3>
                </div>

                <div className="flex justify-center my-2 relative">
                  <svg viewBox="0 0 100 100" className="w-32 h-32">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#18181b"
                      strokeWidth="12"
                    />
                    {/* Drawing simple SVG sections based on proportions */}
                    {(() => {
                      let cumulativePercent = 0;
                      return activeCategories.map((cat, idx) => {
                        if (totalSpent === 0) return null;
                        const amt = categoryDetailedTotals[cat] || 0;
                        const share = amt / totalSpent;
                        const dashArray = \`\${share * 251.2} 251.2\`;
                        const dashOffset = \`\${251.2 - (cumulativePercent * 251.2) / 100}\`;
                        cumulativePercent += share * 100;

                        return (
                          <circle
                            key={cat}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={chartColors[idx % chartColors.length]}
                            strokeWidth="12"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 50 50)"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col p-2 text-center">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">
                      Total
                    </span>
                    <span className="text-[10px] font-extrabold font-mono tracking-tight whitespace-nowrap text-white">
                      {formatCurrency(totalSpent)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center mt-2.5 text-[10px] font-bold">
                  {activeCategories.length === 0 ? (
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      Sin datos de gastos
                    </span>
                  ) : (
                    activeCategories.map((cat, idx) => {
                      return (
                        <div key={cat} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                chartColors[idx % chartColors.length],
                            }}
                          ></span>
                          <span
                            className="text-zinc-500 dark:text-zinc-400 truncate max-w-[100px]"
                            title={cat}
                          >
                            {cat}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>`;

const replacement2 = `              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between h-full text-zinc-900 dark:text-white shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-md dark:text-white">
                    Distribución por Categoria
                  </h3>
                </div>
                {(() => {
                  const pieDataCategorias = activeCategories.map((cat) => ({
                    name: cat,
                    value: categoryDetailedTotals[cat] || 0
                  })).filter(item => item.value > 0);

                  const totalPieEntriesCat = Math.max(pieDataCategorias.length, 1);
                  const primaryPaletteCat = pieDataCategorias.map((_, index) => {
                    const opacityPercent = Math.max(
                      30,
                      Math.round(100 - (index * 65) / Math.max(totalPieEntriesCat - 1, 1))
                    );
                    return \`color-mix(in srgb, var(--color-primary) \${opacityPercent}%, \${darkMode ? "#27272a" : "#cbd5e1"})\`;
                  });

                  return pieDataCategorias.length > 0 ? (
                    <div className="flex-1 flex flex-col">
                      <div className="h-40 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={pieDataCategorias}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={4}
                              cornerRadius={8}
                              dataKey="value"
                            >
                              {pieDataCategorias.map((entry, index) => (
                                <Cell
                                  key={\`cell-\${index}\`}
                                  fill={primaryPaletteCat[index % primaryPaletteCat.length]}
                                  stroke={darkMode ? "#09090b" : "#f8fafc"}
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: darkMode ? "#18181b" : "#ffffff",
                                border: "1px solid var(--color-primary)",
                                borderRadius: "14px",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                              itemStyle={{
                                color: "var(--color-primary)",
                              }}
                              formatter={(value) => formatCurrency(value as number)}
                            />
                            <Legend
                              iconType="circle"
                              formatter={(value) => (
                                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                  {value}
                                </span>
                              )}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                            Total
                          </span>
                          <span className="text-xs font-black text-primary">
                            {formatCurrency(totalSpent)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 font-medium italic min-h-[160px]">
                      Sin datos
                    </div>
                  );
                })()}
              </div>`;

content = content.replace(target2, replacement2);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched successfully");
