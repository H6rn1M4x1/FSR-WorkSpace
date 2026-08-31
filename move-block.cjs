const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');

const startIdx = 2766; // Line 2767
const endIdx = 3080;   // Line 3081

// 1. Fix the width class for extracted block if needed
let extractedBlock = lines.slice(startIdx, endIdx + 1);
// "Resumen de Actividades" originally had `lg:col-span-2`. Let's remove `lg:col-span-2` since it's now inside a space-y-6, so it can just take full width naturally, or we leave it. Let's replace `lg:col-span-2` with `w-full`.
extractedBlock = extractedBlock.map(l => l.replace('lg:col-span-2', 'w-full'));
// We also want to adapt its background to match the style internally. Since it's inside a translucid dark container, we could make it simpler.
// But the user didn't request changing the internal card background of Resumen de Actividades itself, they asked to move it inside. I'll leave its bg classes or make them slightly more transparent. Wait, the user said: "Mover 'Resumen de Actividades' dentro del Bloque: Traslada el módulo completo...". I'll keep it as is, or slightly transparent.

const remainingLines = [
  ...lines.slice(0, startIdx),
  ...lines.slice(endIdx + 1)
];

const sectionIndex = remainingLines.findIndex(l => l.includes('{/* SECCIÓN AVANZADA: SALUD METABÓLICA Y NUTRICIÓN */}'));

// Apply wrapper changes
remainingLines[sectionIndex + 1] = `          <div className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900/40 border-white/10 backdrop-blur-md" : "bg-white/40 border-slate-200 backdrop-blur-md"}\`}>`;
remainingLines[sectionIndex + 2] = `            <div className="flex items-center gap-2 mb-6">`;
remainingLines.splice(sectionIndex + 6, 0, `            <div className="space-y-6">`);

// Find the end index
const nextTabIdx = remainingLines.findIndex(l => l.includes('activeSubTab === "deporte_alimentacion"'));
// Search backwards from nextTabIdx for the closing tags
let insertIdx = -1;
for (let i = nextTabIdx; i >= 0; i--) {
  if (remainingLines[i].includes('</>')) {
    // i is `</>`
    // i-1 is `          </div>` (wrapper)
    // i-2 is `            </div>` (grid)
    insertIdx = i - 1; // We want to insert AFTER grid closing (which is i-2), so AT i-1.
    break;
  }
}

if (insertIdx !== -1) {
  // Insert extractedBlock and a closing div
  remainingLines.splice(insertIdx, 0, ...extractedBlock, `            </div>`);
  fs.writeFileSync('src/components/HealthView.tsx', remainingLines.join('\n'), 'utf8');
  console.log("Success");
} else {
  console.log("Failed to find insertion point");
}
