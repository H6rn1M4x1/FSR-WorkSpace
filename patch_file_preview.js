import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

// Ensure import
if (!code.includes('FilePreviewModal')) {
  code = code.replace(/import \{ AudioTranscriptionPlayer \} from "\.\/AudioTranscriptionPlayer";/, 'import { AudioTranscriptionPlayer } from "./AudioTranscriptionPlayer";\nimport { FilePreviewModal } from "./FilePreviewModal";');
}

// Ensure state
if (!code.includes('previewFileUrl')) {
  code = code.replace(/const \[showTurnoCompModal, setShowTurnoCompModal\] = useState\(false\);/, 
    `const [showTurnoCompModal, setShowTurnoCompModal] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("Documento Adjunto");`);
}

// 1. Render modal at the end of the return statement
if (!code.includes('<FilePreviewModal')) {
  code = code.replace(/<\/div>\n    \)(;|)/, `      <FilePreviewModal isOpen={!!previewFileUrl} onClose={() => setPreviewFileUrl(null)} fileUrl={previewFileUrl} fileName={previewFileName} />\n    </div>\n  )`);
}

// Replace the links inside the edit modal
// <a href={tcPedido} target="_blank"... 
// with a button that sets the state

// First, tcPedido view button
code = code.replace(
  /<a\s+href=\{tcPedido\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 text-xs text-primary dark:text-primary hover:underline font-bold truncate max-w-\[120px\]"\s*>\s*<FileDown className="w-4 h-4 shrink-0" \/>\s*<span className="truncate text-\[10px\]">\s*Ver Archivo\s*<\/span>\s*<\/a>/,
  `<button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setPreviewFileUrl(tcPedido); setPreviewFileName("Pedido / Documento"); }}
                                className="flex items-center gap-1 text-xs text-primary dark:text-primary hover:underline font-bold truncate max-w-[120px]"
                              >
                                <FileDown className="w-4 h-4 shrink-0" />
                                <span className="truncate text-[10px]">Ver Archivo</span>
                              </button>`
);

// Second, matchedRecord.fileData view button
code = code.replace(
  /<a\s+href=\{matchedRecord\.fileData\}\s+download=\{[^}]+\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1\.5 px-3 py-2 bg-primary hover:bg-primary text-white dark:text-blue-950 rounded-full text-\[11px\] font-extrabold transition-all shadow-md shadow-primary\/10 cursor-pointer text-center justify-center hover:scale-\[1\.02\] active:scale-\[0\.98\] w-full h-\[36px\]"\s*>\s*<FileDown className="w-4 h-4 shrink-0" \/>\s*<span>Archivo \/ Adjunto<\/span>\s*<\/a>/,
  `<button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setPreviewFileUrl(matchedRecord.fileData); setPreviewFileName(matchedRecord.fileName || "Estudio / Informe"); }}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary text-white dark:text-blue-950 rounded-full text-[11px] font-extrabold transition-all shadow-md shadow-primary/10 cursor-pointer text-center justify-center hover:scale-[1.02] active:scale-[0.98] w-full h-[36px]"
                                >
                                  <FileDown className="w-4 h-4 shrink-0" />
                                  <span>Archivo / Adjunto</span>
                                </button>`
);

// Third, card views attached files (pedidoDocumento)
code = code.replace(
  /<a\s+href=\{item\.pedidoDocumento\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1\.5 px-3 py-1\.5 bg-primary\/10 hover:bg-primary\/10 text-primary dark:text-primary rounded-lg text-xs font-bold transition-colors"\s*>\s*<FileDown className="w-3\.5 h-3\.5" \/>\s*<span>Ver Pedido<\/span>\s*<\/a>/,
  `<button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(item.pedidoDocumento || null); setPreviewFileName("Pedido / Documento"); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/10 text-primary dark:text-primary rounded-lg text-xs font-bold transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Ver Pedido</span>
                            </button>`
);

// Fourth, card views attached files (estudioInformeDoc)
code = code.replace(
  /<a\s+href=\{item\.estudioInformeDoc\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1\.5 px-3 py-1\.5 bg-primary\/10 hover:bg-primary\/10 text-primary dark:text-primary rounded-lg text-xs font-bold transition-colors"\s*>\s*<FileDown className="w-3\.5 h-3\.5" \/>\s*<span>Ver Estudio<\/span>\s*<\/a>/,
  `<button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(item.estudioInformeDoc || null); setPreviewFileName("Estudio / Informe"); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/10 text-primary dark:text-primary rounded-lg text-xs font-bold transition-colors"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>Ver Estudio</span>
                            </button>`
);

// List view attached files
code = code.replace(
  /<a\s+href=\{tc\.pedidoDocumento\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 text-\[9px\] font-bold text-primary hover:underline px-2 py-1 bg-primary\/5 rounded"\s+onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*>\s*<FileDown className="w-3 h-3" \/>\s*<span>Ver Pedido<\/span>\s*<\/a>/,
  `<button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.pedidoDocumento || null); setPreviewFileName("Pedido / Documento"); }}
                                    className="flex items-center gap-1 text-[9px] font-bold text-primary hover:underline px-2 py-1 bg-primary/5 rounded"
                                  >
                                    <FileDown className="w-3 h-3" />
                                    <span>Ver Pedido</span>
                                  </button>`
);

code = code.replace(
  /<a\s+href=\{tc\.estudioInformeDoc\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 text-\[9px\] font-bold text-primary hover:underline px-2 py-1 bg-primary\/5 rounded"\s+onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*>\s*<FileDown className="w-3 h-3" \/>\s*<span>Ver Estudio<\/span>\s*<\/a>/,
  `<button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(tc.estudioInformeDoc || null); setPreviewFileName("Estudio / Informe"); }}
                                    className="flex items-center gap-1 text-[9px] font-bold text-primary hover:underline px-2 py-1 bg-primary/5 rounded"
                                  >
                                    <FileDown className="w-3 h-3" />
                                    <span>Ver Estudio</span>
                                  </button>`
);

code = code.replace(
  /<a\s+key=\{`att-\$\{idx\}`\}\s+href=\{archivo\.url\}\s+target="_blank"\s+rel="noopener noreferrer"\s+className="flex items-center gap-1 text-\[9px\] font-bold text-slate-500 hover:text-primary hover:underline px-2 py-1 bg-slate-50 dark:bg-zinc-800\/50 rounded"\s+onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*>\s*<Paperclip className="w-3 h-3" \/>\s*<span className="truncate max-w-\[100px\]">\{archivo\.name\}<\/span>\s*<\/a>/g,
  `<button
                                    key={\`att-\${idx}\`}
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewFileUrl(archivo.url); setPreviewFileName(archivo.name); }}
                                    className="flex items-center gap-1 text-[9px] font-bold text-slate-500 hover:text-primary hover:underline px-2 py-1 bg-slate-50 dark:bg-zinc-800/50 rounded"
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span className="truncate max-w-[100px]">{archivo.name}</span>
                                  </button>`
);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
