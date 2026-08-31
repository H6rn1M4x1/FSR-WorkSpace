const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

// replace the center text block for Gastos Varios
let targetGV = `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                Total
                              </span>
                              <span className="text-xs font-black text-primary">
                                {formatCurrency(totalGastosVarios)}
                              </span>
                            </div>`;

let repGV = `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-5">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                Total
                              </span>
                              <span className="text-[10px] font-extrabold text-primary">
                                {formatCurrency(totalGastosVarios)}
                              </span>
                            </div>`;

content = content.replace(targetGV, repGV);

// replace the center text block for Gastos Varios Empty state
let targetGVEmpty = `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                Total
                              </span>
                              <span className="text-xs font-black text-slate-500 dark:text-zinc-400">
                                $0,00
                              </span>
                            </div>`;

let repGVEmpty = `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-5">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                Total
                              </span>
                              <span className="text-[10px] font-extrabold text-slate-500 dark:text-zinc-400">
                                $0,00
                              </span>
                            </div>`;

content = content.replace(targetGVEmpty, repGVEmpty);

// replace the center text block for Categorias
let targetCat = `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-24px]">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                Total
                              </span>
                              <span className="text-xs font-black text-primary">
                                {formatCurrency(totalSpent)}
                              </span>
                            </div>`;

let repCat = `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-5">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                Total
                              </span>
                              <span className="text-[10px] font-extrabold text-primary">
                                {formatCurrency(totalSpent)}
                              </span>
                            </div>`;

content = content.replace(targetCat, repCat);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched text size");
