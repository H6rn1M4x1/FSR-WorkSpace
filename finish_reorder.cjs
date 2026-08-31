const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');

// 1. Remove Top Grid wrapping
const topGridIdx = lines.findIndex(l => l.includes('{/* Top Grid: Medication Trackers & BP Stats */}'));
if (lines[topGridIdx + 1].includes('grid-cols-2')) {
  // Replace line with a simple wrapper (or nothing, but let's keep space-y-6 if needed? Wait, the parent is already space-y-6!)
  // If we remove the div entirely, we need to find the matching closing div.
  // The closing div is exactly before `{/* SECCIÓN AVANZADA: SALUD METABÓLICA Y NUTRICIÓN */}`
  lines[topGridIdx + 1] = '          <div className="space-y-6">';
  // Wait, if I just change it to space-y-6, it will stack them. Let's do that!
}

// 2. Remove Activities & Calories Summary Grid and Doctor directory
const activitiesIdx = lines.findIndex(l => l.includes('{/* Activities & Calories Summary Grid */}'));
const doctorEndIdx = lines.findIndex(l => l.includes('{activeSubTab === "deporte_alimentacion" && ('));
// We need to keep `        </>` and `      )}` which are right before `deporte_alimentacion`.
let endOfResumenIdx = doctorEndIdx - 1;
while(endOfResumenIdx >= 0 && (!lines[endOfResumenIdx].includes('</>') && !lines[endOfResumenIdx].includes(')}'))) {
  endOfResumenIdx--;
}
// `endOfResumenIdx` is pointing to `      )}`. Above it is `        </>`.
const removeEndIdx = endOfResumenIdx - 2; // the line right before `        </>`

if (activitiesIdx !== -1 && removeEndIdx !== -1) {
  lines.splice(activitiesIdx, removeEndIdx - activitiesIdx + 1);
}

fs.writeFileSync('src/components/HealthView.tsx', lines.join('\n'), 'utf8');
console.log("Finished reordering.");
