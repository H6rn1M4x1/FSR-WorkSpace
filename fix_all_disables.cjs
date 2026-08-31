const fs = require('fs');

function addDisabledStates(file, configList) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  let changed = false;

  for (const config of configList) {
    const { name, stateVar, tabArray } = config;
    const tabsArrayStr = JSON.stringify(tabArray);

    const leftRegex = new RegExp(`(<button[^>]*onClick=\\{scroll${name}TabsLeft\\}[^>]*)className="([^"]*)"`, 'g');
    content = content.replace(leftRegex, (match, p1, p2) => {
      if (p2.includes('{`')) return match;
      changed = true;
      return `${p1}className={\`${p2} \${${tabsArrayStr}.indexOf(${stateVar}) === 0 ? "opacity-30 pointer-events-none" : ""}\`}`;
    });

    const rightRegex = new RegExp(`(<button[^>]*onClick=\\{scroll${name}TabsRight\\}[^>]*)className="([^"]*)"`, 'g');
    content = content.replace(rightRegex, (match, p1, p2) => {
      if (p2.includes('{`')) return match;
      changed = true;
      return `${p1}className={\`${p2} \${${tabsArrayStr}.indexOf(${stateVar}) === ${tabArray.length - 1} ? "opacity-30 pointer-events-none" : ""}\`}`;
    });
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Disabled updated ${file}`);
  }
}

addDisabledStates('src/components/AcademicView.tsx', [
  { name: 'PlanEstudio', stateVar: 'planEstudioSubTab', tabArray: ['plan_estudio', 'historia_academica'] },
  { name: 'Horario', stateVar: 'horarioSubTab', tabArray: ['horario', 'examenes'] }
]);

addDisabledStates('src/components/FinanceView.tsx', [
  { name: 'Cotizaciones', stateVar: 'cotizacionesSubTab', tabArray: ['acciones', 'cripto'] },
  { name: 'Pagos', stateVar: 'pagosSubTab', tabArray: ['todos_pagos', 'gastos_varios'] }
]);

addDisabledStates('src/components/MealsView.tsx', [
  { name: 'CreacionComidas', stateVar: 'creacionComidasActiveTab', tabArray: ['mercaderia', 'alimentos', 'platos'] }
]);

addDisabledStates('src/components/HealthView.tsx', [
  { name: 'Meds', stateVar: 'medsActiveTab', tabArray: ['historial', 'stock'] },
  { name: 'Clinico', stateVar: 'clinicoActiveTab', tabArray: ['doctores', 'presion', 'estudios', 'medicamentos'] },
  { name: 'DeporteAlim', stateVar: 'deporteAlimActiveTab', tabArray: ['rutina', 'alimentacion', 'registro_diario'] }
]);

