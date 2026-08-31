const fs = require('fs');
let content = fs.readFileSync('src/components/AcademicView.tsx', 'utf-8');

// Patch 1: Header controls container
const headerControlsRegex = /\{\/\* Header Controls \*\/\}\s*<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">\s*<div>\s*<h3 className="font-extrabold text-md flex items-center gap-2">\s*<GraduationCap className="w-5 h-5 text-primary" \/>\s*<span>Plan de Estudio<\/span>\s*<\/h3>\s*<p className="text-xs text-zinc-500 mt-0\.5">\s*Administra el estado, correlativas y fechas clave de regularidad o aprobación de las materias de tu carrera\.\s*<\/p>\s*<\/div>\s*<div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">/m;

const headerControlsRep = `{/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <span>Plan de Estudio</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Administra el estado, correlativas y fechas clave de regularidad o aprobación de las materias de tu carrera.
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">`;
content = content.replace(headerControlsRegex, headerControlsRep);

// Patch 2: Filters Bar
const filtersBarRegex = /\{\/\* Filters Bar \*\/\}\s*<div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">\s*\{\/\* Search query \*\/\}\s*<div className="relative sm:col-span-2">/m;
const filtersBarRep = `{/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
            {/* Search query */}
            <div className="relative w-full sm:w-auto sm:col-span-2 flex-1">`;
content = content.replace(filtersBarRegex, filtersBarRep);

fs.writeFileSync('src/components/AcademicView.tsx', content);
console.log("Patched responsive layout in AcademicView");
