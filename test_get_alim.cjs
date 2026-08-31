const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');
const match = content.match(/\{deporteAlimActiveTab === "alimentacion" && \([\s\S]*?\{deporteAlimActiveTab === "registro_diario" && \(/);
if (match) {
    fs.writeFileSync('/tmp/alim_tab.txt', match[0]);
    console.log("Saved alim tab to /tmp/alim_tab.txt");
} else {
    console.log("Alim tab not found");
}
