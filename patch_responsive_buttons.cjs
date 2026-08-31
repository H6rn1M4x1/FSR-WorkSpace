const fs = require('fs');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, filesList);
    } else if (name.endsWith('.tsx')) {
      filesList.push(name);
    }
  }
  return filesList;
}

const files = getFiles('src/components');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let originalContent = content;

  // Pattern 1: <div className="flex flex-wrap items-center gap-2.5"> 
  // (Used in Inversiones, Gastos, Cotizaciones)
  content = content.replace(
    /className="flex flex-wrap items-center gap-2\.5"/g,
    'className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0"'
  );

  // Pattern 2: <div className="flex items-center gap-2 flex-wrap">
  // (Used in GymRutinaView for Crear Nueva Rutina)
  content = content.replace(
    /className="flex items-center gap-2 flex-wrap"/g,
    'className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0"'
  );

  // Pattern 3: <div className="flex items-center gap-2 flex-wrap sm:justify-end">
  // (Used in GymRutinaView for Registrar Rutina)
  content = content.replace(
    /className="flex items-center gap-2 flex-wrap sm:justify-end"/g,
    'className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 w-full mt-3 sm:mt-0"'
  );

  // Add w-full sm:w-auto justify-center to those buttons in Gastos, Inversiones, Cotizaciones
  // We can target specific strings in className for the buttons
  content = content.replace(
    /className="(px-4 py-2.*? flex items-center gap-2 cursor-pointer active:scale-95)"/g,
    'className="w-full sm:w-auto justify-center $1"'
  );
  
  content = content.replace(
    /className="(btn-export.*?px-4 py-2.*? flex items-center gap-2 cursor-pointer active:scale-95)"/g,
    'className="w-full sm:w-auto justify-center $1"'
  );

  // GymRutina "Crear Nueva Rutina" button
  content = content.replace(
    /className="(px-4 py-2\.5 bg-primary.*? flex items-center gap-2 .*?)"/g,
    'className="w-full sm:w-auto justify-center $1"'
  );
  
  // GymRutina "+ Registrar Rutina" button
  content = content.replace(
    /className="(`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all cursor-pointer \$\{)/g,
    'className={`w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all cursor-pointer ${'
  );
  
  // HealthView "Agregar Medicamento"
  content = content.replace(
    /className="flex items-center justify-center gap-1\.5 px-4 py-2\.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-xs self-start sm:self-center"/g,
    'className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-xs w-full sm:w-auto mt-2 sm:mt-0 sm:self-center"'
  );
  
  // PaymentsTable "Vencimiento" Date Pickers wrappers
  // original: <div className="w-40 sm:w-44">
  // We want to give it w-full and the inputs inside it w-full.
  content = content.replace(
    /className="w-40 sm:w-44"/g,
    'className="flex-1 w-full sm:w-44"'
  );
  
  // The Vencimiento filters wrapper (w-full for Desde/Hasta block)
  // `<div className="flex items-center gap-1.5">` inside `<div className="flex flex-wrap items-center gap-3">` inside PaymentsTable
  // We can just find the flex flex-wrap items-center gap-3 that has the date pickers
  content = content.replace(
    /className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t/g,
    'className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t w-full'
  );
  
  content = content.replace(
    /className="flex flex-wrap items-center gap-3">/g,
    'className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">'
  );

  // But we need to make sure the label and input pair expands
  // original: <div className="flex items-center gap-1.5"> (when wrapping the labels)
  // Let's replace specifically in PaymentsTable:
  if (file.includes('PaymentsTable.tsx')) {
    content = content.replace(
      /<div className="flex items-center gap-1\.5">\s*<label className="text-\[11px\] font-semibold text-slate-500 dark:text-zinc-400">\s*(Desde|Hasta):/g,
      '<div className="flex items-center gap-2 w-full sm:w-auto">\n              <label className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 whitespace-nowrap w-10">\n                $1:'
    );
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Patched ${file}`);
  }
}
console.log("Done");
