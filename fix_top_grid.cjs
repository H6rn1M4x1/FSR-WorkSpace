const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');

const topGridIdx = lines.findIndex(l => l.includes('{/* Top Grid: Medication Trackers & BP Stats */}'));
console.log("topGridIdx:", topGridIdx);
console.log(lines[topGridIdx + 1]); // <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

const bpIdx = lines.findIndex(l => l.includes('{/* Blood Pressure Trends & SVG Chart */}'));
console.log("bpIdx:", bpIdx);

const saludIdx = lines.findIndex(l => l.includes('{/* SECCIÓN AVANZADA: SALUD METABÓLICA Y NUTRICIÓN */}'));
console.log("saludIdx:", saludIdx);

