const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceView.tsx', 'utf-8');

content = content.replace(
  /stroke=\{darkMode \? "#09090b" : "#f8fafc"\}\s+strokeWidth=\{2\}/,
  'stroke={darkMode ? "#09090b" : "#f8fafc"}\n                                      strokeWidth={pieDataCategorias.length === 1 ? 0 : 2}'
);

fs.writeFileSync('src/components/FinanceView.tsx', content);
console.log("Patched!");
