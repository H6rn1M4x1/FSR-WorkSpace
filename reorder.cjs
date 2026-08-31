const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');

// Find the boundaries of the sections

// 1. End of Top Grid (Medication & BP)
const topGridEndIdx = lines.findIndex(l => l.includes('          {/* Activities & Calories Summary Grid */}'));
console.log("topGridEndIdx (insert before this):", topGridEndIdx);

// 2. Start of SECCIÓN AVANZADA
const seccionAvanzadaStartIdx = lines.findIndex(l => l.includes('          {/* SECCIÓN AVANZADA: SALUD METABÓLICA Y NUTRICIÓN */}'));
console.log("seccionAvanzadaStartIdx:", seccionAvanzadaStartIdx);

// 3. End of SECCIÓN AVANZADA
// It's right before `        </>` and `      )}` and `      {activeSubTab === "deporte_alimentacion" && (`
const nextTabStartIdx = lines.findIndex(l => l.includes('{activeSubTab === "deporte_alimentacion" && ('));
// Search backwards from nextTabStartIdx to find `        </>`
let seccionAvanzadaEndIdx = -1;
for (let i = nextTabStartIdx; i >= 0; i--) {
  if (lines[i].includes('        </>')) {
    seccionAvanzadaEndIdx = i - 1;
    break;
  }
}
console.log("seccionAvanzadaEndIdx:", seccionAvanzadaEndIdx);

if (topGridEndIdx !== -1 && seccionAvanzadaStartIdx !== -1 && seccionAvanzadaEndIdx !== -1) {
  const seccionAvanzadaBlock = lines.slice(seccionAvanzadaStartIdx, seccionAvanzadaEndIdx + 1);
  
  const remainingLines = [
    ...lines.slice(0, seccionAvanzadaStartIdx),
    ...lines.slice(seccionAvanzadaEndIdx + 1)
  ];
  
  // Insert seccionAvanzadaBlock at topGridEndIdx in remainingLines
  const newLines = [
    ...remainingLines.slice(0, topGridEndIdx),
    ...seccionAvanzadaBlock,
    ...remainingLines.slice(topGridEndIdx)
  ];
  
  fs.writeFileSync('src/components/HealthView.tsx', newLines.join('\n'), 'utf8');
  console.log("Success");
} else {
  console.log("Failed to find boundaries");
}
