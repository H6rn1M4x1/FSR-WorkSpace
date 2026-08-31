const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

// Replace all remaining
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
fs.writeFileSync('src/components/FinanceView.tsx', content);
