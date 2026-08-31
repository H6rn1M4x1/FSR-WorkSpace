const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf8');

const replacement = `                      {(() => {
                        const dias = [];
                        const hoy = new Date();
                        for (let i = 0; i < 14; i++) {
                          const d = new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000);
                          const fechaStr = d.toISOString().substring(0, 10);
                          dias.push(fechaStr);
                        }
                        
                        const filteredDias = dias.filter(diaStr => {
                          if (!selectedDiarioDate) return true;
                          const dateObj = new Date(diaStr + "T12:00:00");
                          return dateObj.toDateString() === selectedDiarioDate.toDateString();
                        });

                        if (filteredDias.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 font-medium">
                                No hay historial registrado para este día.
                              </td>
                            </tr>
                          );
                        }

                        return filteredDias.map((diaStr) => {`;

const searchRegex = /\{\(\(\) => \{\s*const dias = \[\];\s*const hoy = new Date\(\);\s*for \(let i = 0; i < 14; i\+\+\) \{\s*const d = new Date\(hoy.getTime\(\) - i \* 24 \* 60 \* 60 \* 1000\);\s*const fechaStr = d.toISOString\(\).substring\(0, 10\);\s*dias.push\(fechaStr\);\s*\}\s*return dias.map\(\(diaStr\) => \{/g;

content = content.replace(searchRegex, replacement);

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf8');
console.log("Patched diario map 2");
