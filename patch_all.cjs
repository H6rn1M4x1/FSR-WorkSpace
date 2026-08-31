const fs = require('fs');

function addIcon(file, regexString) {
  let content = fs.readFileSync(file, 'utf-8');
  let regex = new RegExp(regexString, 'g');
  let newContent = content.replace(regex, '$1\n                      icon={<Filter className="w-3.5 h-3.5" />}');
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log(`Updated ${file}`);
  }
}

// CotizacionesAccionesTable.tsx
let catFile = 'src/components/CotizacionesAccionesTable.tsx';
let catContent = fs.readFileSync(catFile, 'utf-8');
catContent = catContent.replace(
  /(\{\/\* Tendencia Selector \*\/}\s*<CustomSelect\s*size="sm")/,
  '$1\n              icon={<Filter className="w-3.5 h-3.5" />}'
);
fs.writeFileSync(catFile, catContent);

// AcademicView.tsx
let acFile = 'src/components/AcademicView.tsx';
let acContent = fs.readFileSync(acFile, 'utf-8');

acContent = acContent.replace(
  /(<CustomSelect\s*value=\{peSelectedYear\})/g,
  '$1\n                      icon={<Filter className="w-3.5 h-3.5" />}'
);
acContent = acContent.replace(
  /(<CustomSelect\s*value=\{hSelectedDia\})/g,
  '$1\n                      icon={<Filter className="w-3.5 h-3.5" />}'
);
acContent = acContent.replace(
  /(<CustomSelect\s*value=\{hSelectedMateria\})/g,
  '$1\n                      icon={<Filter className="w-3.5 h-3.5" />}'
);
acContent = acContent.replace(
  /(<CustomSelect\s*value=\{exSelectedMateria\})/g,
  '$1\n                      icon={<Filter className="w-3.5 h-3.5" />}'
);

fs.writeFileSync(acFile, acContent);
console.log("Patched missing selects");
