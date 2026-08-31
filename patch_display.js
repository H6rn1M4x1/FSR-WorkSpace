import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

// 1. Export HTML logic
code = code.replace(/\$\{tc\.informacionPersonalizada \? `\n                      <div class="mt-2 text-\[10px\] \$\{doctorTextColor\} italic border-l-2 border-primary\/30 pl-2 py-0\.5 prose dark:prose-invert prose-sm prose-p:my-0 prose-ul:my-0 prose-ol:my-0 \[\&_\*\]:!text-\[10px\] \[\&_\*\]:!text-slate-600 dark:\[\&_\*\]:!text-zinc-400 max-h-\[80px\] overflow-y-auto scrollbar-thin \[\&_ol_ol\]:list-\[lower-alpha\] \[\&_ol_ol_ol\]:list-\[lower-roman\]">\n                        \$\{tc\.informacionPersonalizada\}\n                      <\/div>\n                    ` : ""\}/,
`\${tc.informacionPersonalizada ? \`
                      <div class="mt-2 text-[10px] \${doctorTextColor} italic border-l-2 border-primary/30 pl-2 py-0.5 prose dark:prose-invert prose-sm prose-p:my-0 prose-ul:my-0 prose-ol:my-0 [&_*]:!text-[10px] [&_*]:!text-slate-600 dark:[&_*]:!text-zinc-400 max-h-[80px] overflow-y-auto scrollbar-thin [&_ol_ol]:list-[lower-alpha] [&_ol_ol_ol]:list-[lower-roman]">
                        \${tc.informacionPersonalizada}
                      </div>
                    \` : ""}
                    \${tc.transcripcionAutomatica ? \`
                      <div class="mt-2 text-[10px] \${doctorTextColor} italic border-l-2 border-green-500/30 pl-2 py-0.5 max-h-[80px] overflow-y-auto scrollbar-thin">
                        <span class="font-bold uppercase tracking-wider block mb-0.5 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg> Transcripción:</span>
                        \${tc.transcripcionAutomatica}
                      </div>
                    \` : ""}`);

// 2. Card View Display
code = code.replace(/\{tc\.informacionPersonalizada && \(\n                                  <div className="flex flex-col gap-0\.5 pt-1\.5 border-t border-zinc-100 dark:border-zinc-800">\n                                    <span className="text-\[9px\] font-bold text-slate-400 uppercase tracking-wider">Info:<\/span>\n                                    <div \n                                      className="text-zinc-600 dark:text-zinc-400 italic text-\[11px\] prose dark:prose-invert prose-sm prose-p:my-0\.5 prose-ul:my-0\.5 prose-ol:my-0\.5 \[\&_\*\]:!text-\[11px\] \[\&_\*\]:!text-zinc-600 dark:\[\&_\*\]:!text-zinc-400 max-h-\[100px\] overflow-y-auto scrollbar-thin \[\&_ol_ol\]:list-\[lower-alpha\] \[\&_ol_ol_ol\]:list-\[lower-roman\]"\n                                      dangerouslySetInnerHTML=\{\{ __html: tc\.informacionPersonalizada \}\}\n                                    \/>\n                                  <\/div>\n                                \)\}/,
`{tc.informacionPersonalizada && (
                                  <div className="flex flex-col gap-0.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Info:</span>
                                    <div 
                                      className="text-zinc-600 dark:text-zinc-400 italic text-[11px] prose dark:prose-invert prose-sm prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 [&_*]:!text-[11px] [&_*]:!text-zinc-600 dark:[&_*]:!text-zinc-400 max-h-[100px] overflow-y-auto scrollbar-thin [&_ol_ol]:list-[lower-alpha] [&_ol_ol_ol]:list-[lower-roman]"
                                      dangerouslySetInnerHTML={{ __html: tc.informacionPersonalizada }}
                                    />
                                  </div>
                                )}
                                {tc.transcripcionAutomatica && (
                                  <div className="flex flex-col gap-0.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-green-500 uppercase tracking-wider">
                                      <AudioLines className="w-3 h-3" /> Transcripción:
                                    </span>
                                    <div className="text-zinc-600 dark:text-zinc-400 italic text-[11px] max-h-[100px] overflow-y-auto scrollbar-thin">
                                      {tc.transcripcionAutomatica}
                                    </div>
                                  </div>
                                )}`);

// 3. Table View Display
code = code.replace(/\{tc\.informacionPersonalizada && \(\n                                <span \n                                  className="text-\[10px\] text-zinc-500 italic line-clamp-1 prose dark:prose-invert prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-sm \[\&_\*\]:!text-\[10px\] \[\&_\*\]:!text-zinc-500 \[\&_ol_ol\]:list-\[lower-alpha\] \[\&_ol_ol_ol\]:list-\[lower-roman\]" \n                                  title="Información personalizada adjunta"\n                                  dangerouslySetInnerHTML=\{\{ __html: tc\.informacionPersonalizada \}\}\n                                \/>\n                              \)\}/,
`{tc.informacionPersonalizada && (
                                <span 
                                  className="text-[10px] text-zinc-500 italic line-clamp-1 prose dark:prose-invert prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-sm [&_*]:!text-[10px] [&_*]:!text-zinc-500 [&_ol_ol]:list-[lower-alpha] [&_ol_ol_ol]:list-[lower-roman]" 
                                  title="Información personalizada adjunta"
                                  dangerouslySetInnerHTML={{ __html: tc.informacionPersonalizada }}
                                />
                              )}
                              {tc.transcripcionAutomatica && (
                                <span 
                                  className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-500 italic line-clamp-1" 
                                  title="Transcripción Automática"
                                >
                                  <AudioLines className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{tc.transcripcionAutomatica}</span>
                                </span>
                              )}`);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
