import fs from 'fs';
let code = fs.readFileSync('src/components/AudioTranscriptionPlayer.tsx', 'utf8');

const hexToRgbaCode = `
function hexToRgba(hex: string, alpha: number) {
  if (!hex || !hex.startsWith('#')) return \`rgba(59, 130, 246, \${alpha})\`;
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return \`rgba(\${r}, \${g}, \${b}, \${alpha})\`;
  } catch (e) {
    return \`rgba(59, 130, 246, \${alpha})\`;
  }
}

export function AudioTranscriptionPlayer`;

code = code.replace(/export function AudioTranscriptionPlayer/, hexToRgbaCode);

code = code.replace(/waveColor: 'rgba\\(59, 130, 246, 0\\.4\\)',\\s*progressColor: 'rgba\\(59, 130, 246, 0\\.9\\)',\\s*cursorColor: 'rgba\\(59, 130, 246, 0\\.9\\)',/, 
`waveColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.4),
      progressColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),
      cursorColor: hexToRgba(getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1a73e8', 0.9),`);

fs.writeFileSync('src/components/AudioTranscriptionPlayer.tsx', code);
