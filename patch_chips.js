import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

// For tcPedido
code = code.replace(
  /<div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">\s*<button\s*type="button"\s*onClick=\{\(e\) => \{ e\.preventDefault\(\); setPreviewFileUrl\(tcPedido\); setPreviewFileName\("Pedido \/ Documento"\); \}\}\s*className="flex items-center gap-1 text-xs text-primary dark:text-primary hover:underline font-bold truncate max-w-\[120px\]"\s*>\s*<FileDown className="w-4 h-4 shrink-0" \/>\s*<span className="truncate text-\[10px\]">Ver Archivo<\/span>\s*<\/button>\s*<button\s*type="button"\s*onClick=\{\(\) => setTcPedido\(undefined\)\}\s*className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700\/80 transition-all cursor-pointer"\s*>\s*<X className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*<\/div>/,
  `<div onClick={() => { setPreviewFileUrl(tcPedido); setPreviewFileName("Pedido / Documento"); }} className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                              <div className="flex items-center gap-1 text-xs text-primary dark:text-primary font-bold truncate max-w-[120px]">
                                <FileDown className="w-4 h-4 shrink-0" />
                                <span className="truncate text-[10px]">Ver Archivo</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setTcPedido(undefined); }}
                                className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-300 dark:hover:bg-zinc-600 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>`
);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
