const fs = require('fs');
const path = require('path');

const files = [
  'src/components/HealthView.tsx',
  'src/components/AcademicView.tsx',
  'src/components/GymRutinaView.tsx',
  'src/components/FinanceView.tsx',
  'src/components/MealsView.tsx',
  'src/components/WorkoutBuilderModal.tsx',
  'src/components/UserSettingsModal.tsx',
  'src/components/TopNavbar.tsx',
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  
  // Replace onClick={() => setTab("xyz")} with onClick={(e) => { setTab("xyz"); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}
  // We should be careful to only replace the ones used for TABS.
  // We can look for setters like: setActiveTab, setClinicoActiveTab, setMedsActiveTab, setDeporteAlimActiveTab, setPlanEstudioSubTab, setHorarioSubTab, setPagosSubTab, setCotizacionesSubTab, setCreacionComidasActiveTab, setMobileTab, setTickerCategoryFilter
  const tabSetters = [
    'setActiveTab', 
    'setClinicoActiveTab', 
    'setMedsActiveTab', 
    'setDeporteAlimActiveTab', 
    'setPlanEstudioSubTab', 
    'setHorarioSubTab', 
    'setPagosSubTab', 
    'setCotizacionesSubTab', 
    'setCreacionComidasActiveTab', 
    'setMobileTab',
    'setTickerCategoryFilter'
  ];

  tabSetters.forEach(setter => {
    // Regex for onClick={() => setter("value")}
    const regex1 = new RegExp(`onClick=\\{\\(\\) => ${setter}\\(([^)]+)\\)\\}`, 'g');
    content = content.replace(regex1, `onClick={(e) => { ${setter}($1); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}`);
    
    // Regex for onClick={() => setter(value)}
    const regex2 = new RegExp(`onClick=\\{\\(\\) => ${setter}\\(([^)]+)\\)\\}`, 'g');
    content = content.replace(regex2, `onClick={(e) => { ${setter}($1); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }}`);
  });
  
  // Also make sure all the containers have scroll-smooth and scrollbar-hide
  // scrollbar-none is used in our project instead of scrollbar-hide.
  content = content.replace(/overflow-x-auto/g, (match, offset, string) => {
     // Check if it already has scroll-smooth, if not we add it. 
     // It's easier to just do a smart replace or assume we can add it safely.
     return 'overflow-x-auto scroll-smooth';
  });
  
  // Clean up duplicate scroll-smooth
  content = content.replace(/scroll-smooth(\s+scroll-smooth)+/g, 'scroll-smooth');

  fs.writeFileSync(file, content, 'utf-8');
});

console.log("Done");
