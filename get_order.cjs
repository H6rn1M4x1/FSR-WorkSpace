const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('          {activeSubTab === "resumen" && ('));
const endIndex = lines.findIndex(l => l.includes('      {activeSubTab === "deporte_alimentacion" && ('));

for(let i=startIndex; i<endIndex; i++) {
  if (lines[i].includes('Control de Medicamentos')) console.log(`${i+1}: Control de Medicamentos`);
  if (lines[i].includes('Tendencia Presión Arterial')) console.log(`${i+1}: Tendencia Presión Arterial`);
  if (lines[i].includes('SECCIÓN AVANZADA: SALUD METABÓLICA Y NUTRICIÓN')) console.log(`${i+1}: SECCIÓN AVANZADA`);
  if (lines[i].includes('Activities & Calories Summary Grid')) console.log(`${i+1}: Activities & Calories Summary Grid`);
  if (lines[i].includes('Doctor directory / card organiser')) console.log(`${i+1}: Doctor directory`);
}
