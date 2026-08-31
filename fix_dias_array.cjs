const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

const diasArrayRegex = /const dias = \[\];\s*const hoy = new Date\(\);\s*for \(let i = 0; i < 14; i\+\+\) \{\s*const d = new Date\(hoy\.getTime\(\) - i \* 24 \* 60 \* 60 \* 1000\);\s*const fechaStr = d\.toISOString\(\)\.substring\(0, 10\);\s*dias\.push\(fechaStr\);\s*\}/g;

const fixedDiasArray = `const dias = [];
                        const hoy = new Date();
                        for (let i = 0; i < 14; i++) {
                          const d = new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000);
                          const fechaStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
                          dias.push(fechaStr);
                        }`;
                        
content = content.replace(diasArrayRegex, fixedDiasArray);
fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
console.log("Fixed dias array timezone bug.");
