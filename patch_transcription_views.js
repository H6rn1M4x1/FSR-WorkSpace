import fs from 'fs';
let code = fs.readFileSync('src/components/AppointmentsView.tsx', 'utf8');

// Ensure import AudioTranscriptionPlayer
if (!code.includes('AudioTranscriptionPlayer')) {
  code = code.replace(/import \{ SubNav \} from "\.\/SubNav";/, 'import { SubNav } from "./SubNav";\nimport { AudioTranscriptionPlayer } from "./AudioTranscriptionPlayer";');
}

// 1. Edit Modal
const editRegex = /\{\/\* Transcripcion Automatica \*\/\}\n                  \{tcTranscripcionAutomatica && \([\s\S]*?<textarea\n                        value=\{tcTranscripcionAutomatica\}\n                        onChange=\{\(e\) => setTcTranscripcionAutomatica\(e\.target\.value\)\}\n                        className="w-full text-xs text-slate-700 dark:text-zinc-300 bg-transparent border-none focus:ring-0 resize-y min-h-\[60px\] p-0 italic"\n                        placeholder="La transcripción aparecerá aquí\.\.\."\n                      \/>\n                    <\/div>\n                  \)\}/;

const editReplacement = `                  {/* Transcripcion Automatica */}
                  {tcTranscripcionAutomatica && (
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl relative">
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest mb-2">
                        <AudioLines className="w-3.5 h-3.5" />
                        Transcripción Automática
                      </label>
                      {(() => {
                        const audioFile = tcArchivosNecesarios.find(a => a.name.startsWith('Audio_') && a.url.startsWith('data:audio/'));
                        if (audioFile) {
                          return (
                            <AudioTranscriptionPlayer 
                               audioUrl={audioFile.url}
                               transcript={tcTranscripcionAutomatica}
                               onTranscriptChange={setTcTranscripcionAutomatica}
                               isEditable={true}
                            />
                          );
                        }
                        return (
                           <textarea
                             value={tcTranscripcionAutomatica}
                             onChange={(e) => setTcTranscripcionAutomatica(e.target.value)}
                             className="w-full text-xs text-slate-700 dark:text-zinc-300 bg-transparent border-none focus:ring-0 resize-y min-h-[60px] p-0 italic"
                             placeholder="La transcripción aparecerá aquí..."
                           />
                        );
                      })()}
                    </div>
                  )}`;

code = code.replace(editRegex, editReplacement);

// 2. Card view
const cardRegex = /\{tc\.transcripcionAutomatica && \(\n                                  <div className="flex flex-col gap-0\.5 pt-1\.5 border-t border-zinc-100 dark:border-zinc-800">\n                                    <span className="flex items-center gap-1 text-\[9px\] font-bold text-green-500 uppercase tracking-wider">\n                                      <AudioLines className="w-3 h-3" \/> Transcripción:\n                                    <\/span>\n                                    <div className="text-zinc-600 dark:text-zinc-400 italic text-\[11px\] max-h-\[100px\] overflow-y-auto scrollbar-thin">\n                                      \{tc\.transcripcionAutomatica\}\n                                    <\/div>\n                                  <\/div>\n                                \)\}/;

const cardReplacement = `{tc.transcripcionAutomatica && (
                                  <div className="flex flex-col gap-0.5 pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-green-500 uppercase tracking-wider">
                                      <AudioLines className="w-3 h-3" /> Transcripción:
                                    </span>
                                    {(() => {
                                      const audioFile = tc.archivosNecesarios?.find(a => a.name.startsWith('Audio_') && a.url.startsWith('data:audio/'));
                                      if (audioFile) {
                                         return <AudioTranscriptionPlayer audioUrl={audioFile.url} transcript={tc.transcripcionAutomatica} />;
                                      }
                                      return (
                                        <div className="text-zinc-600 dark:text-zinc-400 italic text-[11px] max-h-[100px] overflow-y-auto scrollbar-thin">
                                          {tc.transcripcionAutomatica}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}`;

code = code.replace(cardRegex, cardReplacement);

fs.writeFileSync('src/components/AppointmentsView.tsx', code);
