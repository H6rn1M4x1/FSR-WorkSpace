const fs = require('fs');

function updateComponentTabs(file, configList) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const config of configList) {
    const { name, stateVar, stateSetter, tabArray, refName } = config;
    const tabsArrayStr = JSON.stringify(tabArray);

    // Replace the left function
    const leftRegex = new RegExp(`const scroll${name}TabsLeft = \\(\\) => {[^}]*\\n[^}]*\\n[^}]*\\n\\s*};`, 'g');
    const leftMatch = content.match(leftRegex);
    if (leftMatch) {
      const leftNew = `const scroll${name}TabsLeft = () => {
    const tabs = ${tabsArrayStr};
    const currentIndex = tabs.indexOf(${stateVar});
    if (currentIndex > 0) {
      ${stateSetter}(tabs[currentIndex - 1] as any);
      if (${refName}.current) {
        const buttons = ${refName}.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };`;
      content = content.replace(leftMatch[0], leftNew);
      changed = true;
    }

    // Replace the right function
    const rightRegex = new RegExp(`const scroll${name}TabsRight = \\(\\) => {[^}]*\\n[^}]*\\n[^}]*\\n\\s*};`, 'g');
    const rightMatch = content.match(rightRegex);
    if (rightMatch) {
      const rightNew = `const scroll${name}TabsRight = () => {
    const tabs = ${tabsArrayStr};
    const currentIndex = tabs.indexOf(${stateVar});
    if (currentIndex < tabs.length - 1) {
      ${stateSetter}(tabs[currentIndex + 1] as any);
      if (${refName}.current) {
        const buttons = ${refName}.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };`;
      content = content.replace(rightMatch[0], rightNew);
      changed = true;
    }

    // Add hidden classes to buttons
    // Search for button with onClick={scroll...Left} and add hidden if currentIndex === 0
    const leftBtnRegex = new RegExp(`(<button[^>]*onClick=\\{scroll${name}TabsLeft\\}[^>]*)className="([^"]*)"`, 'g');
    content = content.replace(leftBtnRegex, (match, p1, p2) => {
      if (p2.includes('{`')) return match; // already templated
      return `${p1}className={\`${p2} \${${tabsArrayStr}.indexOf(${stateVar}) === 0 ? "opacity-30 pointer-events-none" : ""}\`}`;
    });

    const rightBtnRegex = new RegExp(`(<button[^>]*onClick=\\{scroll${name}TabsRight\\}[^>]*)className="([^"]*)"`, 'g');
    content = content.replace(rightBtnRegex, (match, p1, p2) => {
      if (p2.includes('{`')) return match;
      return `${p1}className={\`${p2} \${${tabsArrayStr}.indexOf(${stateVar}) === ${tabArray.length - 1} ? "opacity-30 pointer-events-none" : ""}\`}`;
    });
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}

// AcademicView
updateComponentTabs('src/components/AcademicView.tsx', [
  { name: 'PlanEstudio', stateVar: 'planEstudioSubTab', stateSetter: 'setPlanEstudioSubTab', tabArray: ['plan_estudio', 'historia_academica'], refName: 'planEstudioScrollRef' },
  { name: 'Horario', stateVar: 'horarioSubTab', stateSetter: 'setHorarioSubTab', tabArray: ['horario', 'examenes'], refName: 'horarioScrollRef' }
]);

// FinanceView
updateComponentTabs('src/components/FinanceView.tsx', [
  { name: 'Cotizaciones', stateVar: 'cotizacionesSubTab', stateSetter: 'setCotizacionesSubTab', tabArray: ['acciones', 'cripto'], refName: 'cotizacionesScrollRef' },
  { name: 'Pagos', stateVar: 'pagosSubTab', stateSetter: 'setPagosSubTab', tabArray: ['todos_pagos', 'gastos_varios'], refName: 'pagosScrollRef' }
]);

// MealsView
updateComponentTabs('src/components/MealsView.tsx', [
  { name: 'CreacionComidas', stateVar: 'creacionComidasActiveTab', stateSetter: 'setCreacionComidasActiveTab', tabArray: ['mercaderia', 'alimentos', 'platos'], refName: 'creacionComidasScrollRef' }
]);

// HealthView
updateComponentTabs('src/components/HealthView.tsx', [
  { name: 'Meds', stateVar: 'medsActiveTab', stateSetter: 'setMedsActiveTab', tabArray: ['historial', 'stock'], refName: 'medsScrollRef' },
  { name: 'Clinico', stateVar: 'clinicoActiveTab', stateSetter: 'setClinicoActiveTab', tabArray: ['doctores', 'presion', 'estudios', 'medicamentos'], refName: 'clinicoScrollRef' },
  { name: 'DeporteAlim', stateVar: 'deporteAlimActiveTab', stateSetter: 'setDeporteAlimActiveTab', tabArray: ['rutina', 'alimentacion', 'registro_diario'], refName: 'deporteAlimScrollRef' }
]);

console.log("Done unify_tabs.cjs");
