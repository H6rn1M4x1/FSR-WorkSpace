import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

code = code.replace(
  /<a\s+href=\{tc\.estudioInformeDoc\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 px-2 py-1 bg-primary\/10 dark:bg-primary\/10 text-primary dark:text-primary rounded-lg text-\[10px\] font-extrabold hover:underline"\s*>\s*<FileDown className="w-3 h-3" \/>\s*<span>Ver Estudio<\/span>\s*<\/a>/,
  `<button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.estudioInformeDoc || null); setPreviewFileName("Estudio / Informe"); }}
                                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline"
                                  >
                                    <FileDown className="w-3 h-3" />
                                    <span>Ver Estudio</span>
                                  </button>`
);

code = code.replace(
  /<a\s+href=\{tc\.pedidoDocumento\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 px-2 py-1 bg-primary\/10 dark:bg-primary\/10 text-primary dark:text-primary rounded-lg text-\[10px\] font-extrabold hover:underline"\s*>\s*<FileDown className="w-3 h-3" \/>\s*<span>Ver Pedido<\/span>\s*<\/a>/,
  `<button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.pedidoDocumento || null); setPreviewFileName("Pedido / Documento"); }}
                                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline"
                                  >
                                    <FileDown className="w-3 h-3" />
                                    <span>Ver Pedido</span>
                                  </button>`
);

// Also tcArchivosNecesarios in the same area
code = code.replace(
  /<a\s+key=\{`att-\$\{idx\}`\}\s+href=\{archivo\.url\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-zinc-800\/50 text-slate-500 dark:text-zinc-400 rounded-lg text-\[10px\] font-bold hover:text-primary dark:hover:text-primary hover:underline truncate max-w-\[120px\]"\s*>\s*<Paperclip className="w-3 h-3" \/>\s*<span className="truncate">\{archivo\.name\}<\/span>\s*<\/a>/g,
  `<button
                                    key={\`att-\${idx}\`}
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(archivo.url); setPreviewFileName(archivo.name); }}
                                    className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 rounded-lg text-[10px] font-bold hover:text-primary dark:hover:text-primary hover:underline truncate max-w-[120px]"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate">{archivo.name}</span>
                                  </button>`
);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
