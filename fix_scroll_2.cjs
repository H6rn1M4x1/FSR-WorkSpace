const fs = require('fs');
const path = require('path');

const files = [
  'src/components/InversionesTable.tsx',
  'src/components/GastosVariosTable.tsx',
  'src/components/CotizacionesAccionesTable.tsx',
  'src/components/CotizacionesCriptoTable.tsx',
  'src/components/TopNavbar.tsx',
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  
  const tabSetters = [
    'setActiveTab', 
    'setTickerCategoryFilter',
    'setInversionesTab', // Just in case
    'setPagosTab'
  ];

  tabSetters.forEach(setter => {
    // Regex for onClick={() => setter("value")}
    const regex1 = new RegExp(`onClick=\\{\\(\\) => ${setter}\\(([^)]+)\\)\\}`, 'g');
    content = content.replace(regex1, `onClick={(e) => { ${setter}($1); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}`);
  });
  
  content = content.replace(/overflow-x-auto/g, 'overflow-x-auto scroll-smooth');
  content = content.replace(/scroll-smooth(\s+scroll-smooth)+/g, 'scroll-smooth');

  fs.writeFileSync(file, content, 'utf-8');
});

console.log("Done");
