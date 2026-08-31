import fs from 'fs';
let code = fs.readFileSync('src/components/AudioTranscriptionPlayer.tsx', 'utf8');

code = code.replace(/\{isEditable \? \([\s\S]*?\) : \(/,
`{isEditable ? (
          <div className="flex flex-col gap-2">
            <div className="flex justify-end">
               <button 
                 type="button" 
                 onClick={() => {
                   const el = document.getElementById('edit-mode-toggle');
                   if (el) {
                     if (el.dataset.mode === 'edit') {
                       el.dataset.mode = 'read';
                       el.innerText = 'Editar Texto';
                       document.getElementById('transcript-textarea').style.display = 'none';
                       document.getElementById('transcript-read').style.display = 'block';
                     } else {
                       el.dataset.mode = 'edit';
                       el.innerText = 'Ver Resaltado';
                       document.getElementById('transcript-textarea').style.display = 'block';
                       document.getElementById('transcript-read').style.display = 'none';
                     }
                   }
                 }}
                 id="edit-mode-toggle"
                 data-mode="read"
                 className="text-[10px] text-primary hover:underline font-bold"
               >
                 Editar Texto
               </button>
            </div>
            <textarea
              id="transcript-textarea"
              style={{ display: 'none' }}
              value={transcript}
              onChange={(e) => onTranscriptChange?.(e.target.value)}
              className="w-full text-xs text-slate-700 dark:text-zinc-300 bg-transparent border-none focus:ring-0 resize-y min-h-[60px] p-0 italic"
              placeholder="La transcripción aparecerá aquí..."
            />
            <div id="transcript-read" className="italic">
              {(() => {
                 let wordCount = 0;
                 return words.map((chunk, i) => {
                   const isWhitespace = chunk.trim().length === 0;
                   if (isWhitespace) return <span key={i}>{chunk}</span>;
                   
                   const isActive = wordCount === Math.min(activeWordIndex, nonWhitespaceWords.length - 1);
                   wordCount++;
                   
                   return (
                      <span 
                        key={i} 
                        className={\`transition-colors duration-100 \${isActive && isPlaying ? 'bg-primary/20 text-primary font-medium rounded-sm px-0.5' : ''}\`}
                      >
                        {chunk}
                      </span>
                   );
                 });
              })()}
            </div>
          </div>
        ) : (`);

fs.writeFileSync('src/components/AudioTranscriptionPlayer.tsx', code);
