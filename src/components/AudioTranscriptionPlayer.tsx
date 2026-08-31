import React, { useEffect, useRef, useState, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';

interface Props {
  audioUrl: string;
  transcript: string;
  onTranscriptChange?: (newTranscript: string) => void;
  isEditable?: boolean;
}


function hexToRgba(hex: string, alpha: number) {
  if (!hex || !hex.startsWith('#')) return `rgba(59, 130, 246, ${alpha})`;
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return `rgba(59, 130, 246, ${alpha})`;
  }
}

export function AudioTranscriptionPlayer({ audioUrl, transcript, onTranscriptChange, isEditable = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.4),
      progressColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),
      cursorColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 30,
      url: audioUrl,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => setIsReady(true));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('timeupdate' as any, (currentTime: number) => {
      const duration = ws.getDuration();
      if (duration > 0) {
        setProgress(currentTime / duration);
      }
    });

    const observer = new MutationObserver(() => {
      if (wavesurferRef.current) {
        const newColor = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8';
        wavesurferRef.current.setOptions({
          waveColor: hexToRgba(newColor, 0.4),
          progressColor: hexToRgba(newColor, 0.9),
          cursorColor: hexToRgba(newColor, 0.9),
        });
      }
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });

    return () => {
      observer.disconnect();
      ws.destroy();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (isReady) wavesurferRef.current?.playPause();
  };

  const words = useMemo(() => transcript.split(/(\s+)/), [transcript]);
  // We need to count non-whitespace words to calculate progress
  const nonWhitespaceWords = useMemo(() => words.filter(w => w.trim().length > 0), [words]);
  
  const activeWordIndex = Math.floor(progress * nonWhitespaceWords.length);

  return (
    <div className="flex flex-col gap-2 w-full mt-2">
      {/* Transcript with Highlights */}
      <div className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed max-h-[100px] overflow-y-auto scrollbar-thin">
        {isEditable ? (
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
                        className={`transition-colors duration-100 ${isActive && isPlaying ? 'bg-primary/20 text-primary font-medium rounded-sm px-0.5' : ''}`}
                      >
                        {chunk}
                      </span>
                   );
                 });
              })()}
            </div>
          </div>
        ) : (
          <div className="italic">
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
                      className={`transition-colors duration-100 ${isActive && isPlaying ? 'bg-primary/20 text-primary font-medium rounded-sm px-0.5' : ''}`}
                    >
                      {chunk}
                    </span>
                 );
               });
            })()}
          </div>
        )}
      </div>

      {/* Audio Player */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-zinc-800/50 rounded-lg border border-slate-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!isReady}
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-white dark:bg-zinc-700 text-primary rounded-full shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <div className="flex-1 overflow-hidden" ref={containerRef} />
      </div>
    </div>
  );
}
