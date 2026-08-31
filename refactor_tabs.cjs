const fs = require('fs');

function refactorFile(file, tabsConfig, startString, endString, stateVar, setterVar) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('import { SubNav }')) {
    // Inject import after React import or lucide-react import
    content = content.replace(/import .* from "lucide-react";/, match => `${match}\nimport { SubNav } from "./SubNav";`);
  }

  const startIndex = content.indexOf(startString);
  const endIndex = content.indexOf(endString, startIndex) + endString.length;
  
  if (startIndex !== -1 && endIndex > startIndex) {
    const replacement = `<SubNav activeTab={${stateVar}} onTabChange={(id) => ${setterVar}(id as any)} className="mb-6" tabs={[\n${tabsConfig}\n      ]} />`;
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`Could not find bounds in ${file}`);
  }
}

// 1. FinanceView
refactorFile('src/components/FinanceView.tsx', 
`        { id: "resumen", label: "Resumen", icon: TrendingUp },
        { id: "todos_pagos", label: "Todos los Pagos", icon: Wallet },
        { id: "gastos_varios", label: "Gastos Varios", icon: CreditCard }`,
  '<div\n          className="flex gap-2.5 overflow-x-auto scroll-smooth scrollbar-none pb-4 mb-6 border-b border-slate-200 dark:border-zinc-800/60"',
  '        </div>',
  'activeTab', 'setActiveTab'
);

// 2. AppointmentsView
refactorFile('src/components/AppointmentsView.tsx',
`        { id: "agenda", label: "Agenda", icon: Calendar },
        { id: "registro", label: "Registro de Turnos y Compromisos", icon: Stethoscope }`,
  '<div\n          className="flex gap-2.5 overflow-x-auto scroll-smooth scrollbar-none pb-4 mb-6 border-b border-slate-200 dark:border-zinc-800/60"',
  '        </div>',
  'activeTab', 'setActiveTab'
);

// 3. HealthView
refactorFile('src/components/HealthView.tsx',
`        { id: "resumen", label: "Resumen y Profesionales", icon: Activity },
        { id: "deportes", label: "Deportes y Actividades", icon: Activity },
        { id: "alimentacion", label: "Alimentación", icon: Activity },
        { id: "medicamentos", label: "Medicamentos", icon: Pill },
        { id: "disponibilidad", label: "Disponibilidad de Medicamentos", icon: Clock },
        { id: "doctores", label: "Doctores", icon: Stethoscope },
        { id: "presion", label: "Datos de Presión", icon: Activity },
        { id: "estudios", label: "Estudios y/o Informes", icon: Activity }`,
  '<div\n          className="flex gap-2.5 overflow-x-auto scroll-smooth scrollbar-none pb-4 mb-6 border-b border-slate-200 dark:border-zinc-800/60"',
  '        </div>',
  'activeSubTab', 'setActiveSubTab'
);

// 4. MealsView
refactorFile('src/components/MealsView.tsx',
`        { id: "planificador", label: "Planificador y Alacena", icon: UtensilsCrossed },
        { id: "mercaderia", label: "Mercadería (Base de Datos)", icon: Database },
        { id: "alimentos", label: "Alimentos (Base de Datos)", icon: ClipboardList },
        { id: "platos", label: "Platos (Base de Datos)", icon: ChefHat },
        { id: "organizacion_semanal", label: "Organización Semanal", icon: CalendarDays },
        { id: "lista_compras", label: "Lista de Compras", icon: ShoppingBag }`,
  '<div\n          className="flex gap-2.5 overflow-x-auto scroll-smooth scrollbar-none pb-4 mb-6 border-b border-slate-200 dark:border-zinc-800/60"',
  '        </div>',
  'activeSubTab', 'setActiveSubTab'
);

