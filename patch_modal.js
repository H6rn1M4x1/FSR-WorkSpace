import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

const replacement = `                  {/* Información Personalizada */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                        Información Personalizada (Opcional)
                      </label>
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={\`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all shadow-sm \${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}\`}
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Detener Grabación</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3 h-3" />
                            <span>Grabar Audio</span>
                          </>
                        )}
                      </button>
                    </div>
                    <RichTextEditor
                      value={tcInformacionPersonalizada}
                      onChange={setTcInformacionPersonalizada}
                      attachments={tcArchivosNecesarios}
                      onAttachmentsChange={setTcArchivosNecesarios}
                      
                      placeholder="Agrega notas, indicaciones especiales, recordatorios..."
                    />
                  </div>

                  {/* Transcripcion Automatica */}
                  {tcTranscripcionAutomatica && (
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl relative">
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                        <AudioLines className="w-3.5 h-3.5" />
                        Transcripción Automática
                      </label>
                      <textarea
                        value={tcTranscripcionAutomatica}
                        onChange={(e) => setTcTranscripcionAutomatica(e.target.value)}
                        className="w-full text-xs text-slate-700 dark:text-zinc-300 bg-transparent border-none focus:ring-0 resize-y min-h-[60px] p-0 italic"
                        placeholder="La transcripción aparecerá aquí..."
                      />
                    </div>
                  )}
`;

code = code.replace(/\{\/\* Información Personalizada \*\/\}\n                  <div>\n                    <label className="block text-\[10px\] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">\n                      Información Personalizada \(Opcional\)\n                    <\/label>\n                    <RichTextEditor\n                      value=\{tcInformacionPersonalizada\}\n                      onChange=\{setTcInformacionPersonalizada\}\n                      attachments=\{tcArchivosNecesarios\}\n                      onAttachmentsChange=\{setTcArchivosNecesarios\}\n                      \n                      placeholder="Agrega notas, indicaciones especiales, recordatorios\.\.\."\n                    \/>\n                  <\/div>/, replacement);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
