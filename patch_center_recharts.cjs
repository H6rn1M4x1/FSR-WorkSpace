const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

// First replace the absolute divs with empty string
content = content.replace(/<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-9">[\s\S]*?<\/div>/g, '');

// Now we inject Label into the Pie components.
// We need to inject <Label ... /> right after <Pie ... >

const labelGV = `>
                                  <Label
                                    content={({ viewBox }) => {
                                      const { cx, cy } = viewBox;
                                      return (
                                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                                          <tspan x={cx} dy="-0.5em" fontSize="7" fontWeight="bold" fill={darkMode ? "#a1a1aa" : "#64748b"} letterSpacing="0.05em">TOTAL</tspan>
                                          <tspan x={cx} dy="1.2em" fontSize="9" fontWeight="800" fill="var(--color-primary)">{formatCurrency(totalGastosVarios)}</tspan>
                                        </text>
                                      );
                                    }}
                                  />`;
                                  
content = content.replace(/dataKey="value"\s*>\s*\{pieDataGastosVarios/g, labelGV.replace('>', 'dataKey="value"\n                                >') + '\n                                  {pieDataGastosVarios');

const labelCat = `>
                                  <Label
                                    content={({ viewBox }) => {
                                      const { cx, cy } = viewBox;
                                      return (
                                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                                          <tspan x={cx} dy="-0.5em" fontSize="7" fontWeight="bold" fill={darkMode ? "#a1a1aa" : "#64748b"} letterSpacing="0.05em">TOTAL</tspan>
                                          <tspan x={cx} dy="1.2em" fontSize="9" fontWeight="800" fill="var(--color-primary)">{formatCurrency(totalSpent)}</tspan>
                                        </text>
                                      );
                                    }}
                                  />`;

content = content.replace(/dataKey="value"\s*>\s*\{pieDataCategorias/g, labelCat.replace('>', 'dataKey="value"\n                                >') + '\n                                  {pieDataCategorias');

const labelEmpty = `>
                                  <Label
                                    content={({ viewBox }) => {
                                      const { cx, cy } = viewBox;
                                      return (
                                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                                          <tspan x={cx} dy="-0.5em" fontSize="7" fontWeight="bold" fill={darkMode ? "#a1a1aa" : "#64748b"} letterSpacing="0.05em">TOTAL</tspan>
                                          <tspan x={cx} dy="1.2em" fontSize="9" fontWeight="800" fill={darkMode ? "#a1a1aa" : "#64748b"}>$0,00</tspan>
                                        </text>
                                      );
                                    }}
                                  />`;

content = content.replace(/stroke="none"\s*>\s*<Cell/g, labelEmpty.replace('>', 'stroke="none"\n                                >') + '\n                                  <Cell');

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched Recharts Pie with inner Labels");
