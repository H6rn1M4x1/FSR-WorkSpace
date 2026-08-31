const fs = require('fs');

function updateComponentTabs(file, configList) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const config of configList) {
    const { name, stateVar, stateSetter, tabArray, refName } = config;
    const tabsArrayStr = JSON.stringify(tabArray);

    const leftRegex = new RegExp(`const scroll${name}TabsLeft = \\(\\)[\\s\\S]*?(?:\\n  \\};|\\n\\};)`, '');
    const rightRegex = new RegExp(`const scroll${name}TabsRight = \\(\\)[\\s\\S]*?(?:\\n  \\};|\\n\\};)`, '');

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

    if (leftRegex.test(content)) {
      content = content.replace(leftRegex, leftNew);
      changed = true;
    } else {
      console.log('Failed to match left for', name, 'in', file);
    }

    if (rightRegex.test(content)) {
      content = content.replace(rightRegex, rightNew);
      changed = true;
    } else {
      console.log('Failed to match right for', name, 'in', file);
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}

updateComponentTabs('src/components/AcademicView.tsx', [
  { name: 'PlanEstudio', stateVar: 'planEstudioSubTab', stateSetter: 'setPlanEstudioSubTab', tabArray: ['plan_estudio', 'historia_academica'], refName: 'planEstudioScrollRef' },
  { name: 'Horario', stateVar: 'horarioSubTab', stateSetter: 'setHorarioSubTab', tabArray: ['horario', 'examenes'], refName: 'horarioScrollRef' }
]);

updateComponentTabs('src/components/FinanceView.tsx', [
  { name: 'Cotizaciones', stateVar: 'cotizacionesSubTab', stateSetter: 'setCotizacionesSubTab', tabArray: ['acciones', 'cripto'], refName: 'cotizacionesScrollRef' },
  { name: 'Pagos', stateVar: 'pagosSubTab', stateSetter: 'setPagosSubTab', tabArray: ['todos_pagos', 'gastos_varios'], refName: 'pagosScrollRef' }
]);

updateComponentTabs('src/components/MealsView.tsx', [
  { name: 'CreacionComidas', stateVar: 'creacionComidasActiveTab', stateSetter: 'setCreacionComidasActiveTab', tabArray: ['mercaderia', 'alimentos', 'platos'], refName: 'creacionComidasScrollRef' }
]);

updateComponentTabs('src/components/HealthView.tsx', [
  { name: 'Meds', stateVar: 'medsActiveTab', stateSetter: 'setMedsActiveTab', tabArray: ['historial', 'stock'], refName: 'medsScrollRef' },
  { name: 'Clinico', stateVar: 'clinicoActiveTab', stateSetter: 'setClinicoActiveTab', tabArray: ['doctores', 'presion', 'estudios', 'medicamentos'], refName: 'clinicoScrollRef' },
  { name: 'DeporteAlim', stateVar: 'deporteAlimActiveTab', stateSetter: 'setDeporteAlimActiveTab', tabArray: ['rutina', 'alimentacion', 'registro_diario'], refName: 'deporteAlimScrollRef' }
]);

