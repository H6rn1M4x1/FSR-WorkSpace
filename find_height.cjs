const fs = require('fs');
const content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('Control de Medicamentos'));
const middleIndex = lines.findIndex(l => l.includes('Tendencia Presión Arterial'));
const endIndex = lines.findIndex(l => l.includes('SECCIÓN AVANZADA: SALUD METABÓLICA Y NUTRICIÓN'));

console.log("Med Start:", startIndex);
console.log("BP Start:", middleIndex);
console.log("End:", endIndex);
