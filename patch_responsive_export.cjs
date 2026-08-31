const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

const targetStr = `                  {/* Controles de Exportación e Informes */}
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-4 text-zinc-900 dark:text-white shadow-xs">
                    <div>
                      <h4 className="font-extrabold text-sm dark:text-white">
                        Controles de Exportación e Informes
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Envía tus resúmenes financieros de forma segura
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">`;

const replacementStr = `                  {/* Controles de Exportación e Informes */}
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-zinc-900 dark:text-white shadow-xs">
                    <div>
                      <h4 className="font-extrabold text-sm dark:text-white">
                        Controles de Exportación e Informes
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        Envía tus resúmenes financieros de forma segura
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">`;

content = content.replace(targetStr, replacementStr);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched export controls responsive layout");
