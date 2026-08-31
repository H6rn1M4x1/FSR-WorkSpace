import fs from 'fs';
let code = fs.readFileSync('src/components/AudioTranscriptionPlayer.tsx', 'utf8');

const regex = /waveColor: 'rgba\\(59, 130, 246, 0\.4\\)',\s*progressColor: 'rgba\\(59, 130, 246, 0\.9\\)',\s*cursorColor: 'rgba\\(59, 130, 246, 0\.9\\)',/;

code = code.replace(regex, 
`waveColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.4),
      progressColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),
      cursorColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),`);

fs.writeFileSync('src/components/AudioTranscriptionPlayer.tsx', code);
