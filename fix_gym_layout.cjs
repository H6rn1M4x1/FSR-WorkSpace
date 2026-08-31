const fs = require('fs');
const file = 'src/components/GymRutinaView.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetLayout = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 pt-2 w-full">
            {/* Búsqueda (Izquierda) */}
            <div className="relative w-full sm:flex-1">`;

const replacementLayout = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-3 pt-2 w-full">
            {/* Búsqueda y Selector (Derecha) */}
            <div className="relative w-full sm:w-64">`;

if (content.includes(targetLayout)) {
  content = content.replace(targetLayout, replacementLayout);
  fs.writeFileSync(file, content);
  console.log("Fixed layout in GymRutinaView");
} else {
  console.log("Layout not found in GymRutinaView");
}
