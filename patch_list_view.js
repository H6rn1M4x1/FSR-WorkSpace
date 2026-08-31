import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

code = code.replace(
  /<a\s+href=\{tc\.pedidoDocumento\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 px-2 py-1 bg-primary\/10 dark:bg-primary\/10 text-primary dark:text-primary rounded-lg text-\[10px\] font-extrabold hover:underline"\s*>\s*<FileDown className="w-3 h-3" \/>\s*<span>Ver<\/span>\s*<\/a>/,
  `<button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.pedidoDocumento || null); setPreviewFileName("Pedido / Documento"); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline"
                                >
                                  <FileDown className="w-3 h-3" />
                                  <span>Ver</span>
                                </button>`
);

code = code.replace(
  /<a\s+href=\{tc\.estudioInformeDoc\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 px-2 py-1 bg-primary\/10 dark:bg-primary\/10 text-primary dark:text-primary rounded-lg text-\[10px\] font-extrabold hover:underline"\s*>\s*<FileDown className="w-3 h-3" \/>\s*<span>Ver<\/span>\s*<\/a>/,
  `<button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.estudioInformeDoc || null); setPreviewFileName("Estudio / Informe"); }}
                                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline"
                                >
                                  <FileDown className="w-3 h-3" />
                                  <span>Ver</span>
                                </button>`
);

// Map popup attached files (which I missed earlier)
code = code.replace(
  /<a\s+key=\{`att-\$\{idx\}`\}\s+href=\{archivo\.url\}\s+target="_blank"\s+rel="noopener noreferrer"\s+download=\{archivo\.name\}\s+className="flex items-center gap-1\.5 px-3 py-1\.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-\[10px\] font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors shadow-sm"\s*>\s*<Paperclip className="w-3 h-3" \/>\s*<span className="truncate max-w-\[120px\]">\{archivo\.name\}<\/span>\s*<\/a>/g,
  `<button
                                    key={\`att-\${idx}\`}
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(archivo.url); setPreviewFileName(archivo.name); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors shadow-sm"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-[120px]">{archivo.name}</span>
                                  </button>`
);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
