const fs = require('fs');
let file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Replace the filter icon wrapper
content = content.replace(
  /<div className="flex items-center gap-1\.5 text-xs text-slate-500 dark:text-zinc-400 font-semibold shrink-0">\s*<Filter className="w-3\.5 h-3\.5" \/>\s*<\/div>/,
  ''
);

// Add flex-col to the wrapper
content = content.replace(
  /<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">/g,
  '<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">'
);

// Add icon to the selects (selectedBroker, selectedOperacion, selectedEstado, selectedResultado)
content = content.replace(
  /(<CustomSelect\s*size="sm"\s*value=\{selectedBroker\})/g,
  '$1\n              icon={<Filter className="w-3.5 h-3.5" />}'
);
content = content.replace(
  /(<CustomSelect\s*size="sm"\s*value=\{selectedOperacion\})/g,
  '$1\n              icon={<Filter className="w-3.5 h-3.5" />}'
);
content = content.replace(
  /(<CustomSelect\s*size="sm"\s*value=\{selectedEstado\})/g,
  '$1\n              icon={<Filter className="w-3.5 h-3.5" />}'
);
content = content.replace(
  /(<CustomSelect\s*size="sm"\s*value=\{selectedResultado\})/g,
  '$1\n              icon={<Filter className="w-3.5 h-3.5" />}'
);

fs.writeFileSync(file, content);
