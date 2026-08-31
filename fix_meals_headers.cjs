const fs = require('fs');
let c = fs.readFileSync('src/components/MealsView.tsx', 'utf8');

c = c.replace(/<div>\n\s*<div className="flex items-center gap-2">\n\s*<Database className="w-5 h-5 text-primary" \/>\n\s*<h3 className="font-bold text-lg">\n\s*Base de Datos de Mercadería\n\s*<\/h3>\n\s*<\/div>\n\s*<p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">\n\s*Registra y cataloga tus ingredientes habituales por comercio,\n\s*unidad de medida y sector de almacenamiento.\n\s*<\/p>\n\s*<\/div>/, `<div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <span>Base de Datos de Mercadería</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Registra y cataloga tus ingredientes habituales por comercio, unidad de medida y sector de almacenamiento.
              </p>
            </div>`);

c = c.replace(/<div>\n\s*<div className="flex items-center gap-2">\n\s*<ClipboardList className="w-5 h-5 text-primary" \/>\n\s*<h3 className="font-bold text-lg">\n\s*Base de Datos de Alimentos\n\s*<\/h3>\n\s*<\/div>\n\s*<p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">\n\s*Crea alimentos compuestos agrupando múltiples mercaderías\n\s*\(ej: "Salsa Fileto" = Tomate \+ Cebolla\).\n\s*<\/p>\n\s*<\/div>/, `<div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                <span>Base de Datos de Alimentos</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Crea alimentos compuestos agrupando múltiples mercaderías (ej: "Salsa Fileto" = Tomate + Cebolla).
              </p>
            </div>`);

c = c.replace(/<div>\n\s*<div className="flex items-center gap-2">\n\s*<ChefHat className="w-5 h-5 text-primary" \/>\n\s*<h3 className="font-bold text-lg">\n\s*Base de Datos de Platos\n\s*<\/h3>\n\s*<\/div>\n\s*<p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">\n\s*Diseña recetas y platos combinando alimentos y mercadería con\n\s*sus cantidades requeridas.\n\s*<\/p>\n\s*<\/div>/, `<div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                <span>Base de Datos de Platos</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Diseña recetas y platos combinando alimentos y mercadería con sus cantidades requeridas.
              </p>
            </div>`);

fs.writeFileSync('src/components/MealsView.tsx', c);
