import fs from 'fs';
let code = fs.readFileSync('src/components/AudioTranscriptionPlayer.tsx', 'utf8');

code = code.replace(/ws\.on\('seek', \(progress\) => \{\n       setProgress\(progress\);\n    \}\);/,
`ws.on('seek', (progress) => {
       setProgress(progress);
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
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });`);

code = code.replace(/return \(\) => \{\n      ws\.destroy\(\);\n    \};/g,
`return () => {
      observer.disconnect();
      ws.destroy();
    };`);

fs.writeFileSync('src/components/AudioTranscriptionPlayer.tsx', code);
