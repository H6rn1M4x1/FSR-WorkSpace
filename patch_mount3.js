import fs from 'fs';
let code = fs.readFileSync('src/components/AudioTranscriptionPlayer.tsx', 'utf8');

const target = "waveColor: 'rgba(59, 130, 246, 0.4)',      progressColor: 'rgba(59, 130, 246, 0.9)',      cursorColor: 'rgba(59, 130, 246, 0.9)',";

if (code.includes(target)) {
  code = code.replace(target, 
    `waveColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.4),
      progressColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),
      cursorColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),`
  );
} else {
  console.log("Not found exact string. Using another method.");
  // try replacing line by line
  code = code.replace(/waveColor: 'rgba\\(59, 130, 246, 0.4\\)',/g, "waveColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.4),");
  code = code.replace(/progressColor: 'rgba\\(59, 130, 246, 0.9\\)',/g, "progressColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),");
  code = code.replace(/cursorColor: 'rgba\\(59, 130, 246, 0.9\\)',/g, "cursorColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),");
}

fs.writeFileSync('src/components/AudioTranscriptionPlayer.tsx', code);
