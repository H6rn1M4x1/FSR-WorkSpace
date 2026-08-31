const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');
const alimList = content.match(/const filteredLogs = alimentacionLogs\.filter\([\s\S]*?\}\);/);
console.log("Alim filter:\n", alimList ? alimList[0] : "Not found");
const diarioList = content.match(/const filteredDias = dias\.filter\([\s\S]*?\}\);/);
console.log("Diario filter:\n", diarioList ? diarioList[0] : "Not found");
