const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

const target1 = `<Cell
                                      key={\`cell-\${index}\`}
                                      fill={
                                        primaryPaletteGV[
                                          index % primaryPaletteGV.length
                                        ]
                                      }
                                      stroke={darkMode ? "#09090b" : "#f8fafc"}
                                      strokeWidth={2}
                                    />`;

const rep1 = `<Cell
                                      key={\`cell-\${index}\`}
                                      fill={
                                        primaryPaletteGV[
                                          index % primaryPaletteGV.length
                                        ]
                                      }
                                      stroke={darkMode ? "#09090b" : "#f8fafc"}
                                      strokeWidth={pieDataGastosVarios.length === 1 ? 0 : 2}
                                    />`;

content = content.replace(target1, rep1);

const target2 = `<Cell
                                  key={\`cell-\${index}\`}
                                  fill={primaryPaletteCat[index % primaryPaletteCat.length]}
                                  stroke={darkMode ? "#09090b" : "#f8fafc"}
                                  strokeWidth={2}
                                />`;

const rep2 = `<Cell
                                  key={\`cell-\${index}\`}
                                  fill={primaryPaletteCat[index % primaryPaletteCat.length]}
                                  stroke={darkMode ? "#09090b" : "#f8fafc"}
                                  strokeWidth={pieDataCategorias.length === 1 ? 0 : 2}
                                />`;
                                
content = content.replace(target2, rep2);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Replaced");
