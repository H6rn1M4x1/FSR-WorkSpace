const fs = require('fs');
let content = fs.readFileSync('src/components/HealthView.tsx', 'utf-8');

// 1. Balance Neto
content = content.replace(
  /<h4 className="text-base font-extrabold">Balance Neto: \{balanceNeto > 0 \? \`\+\$\{balanceNeto\}\` : balanceNeto\} kcal<\/h4>/g,
  '<h4 className="text-base font-extrabold text-slate-800 dark:text-zinc-100">Balance Neto: <span className="text-primary">{balanceNeto > 0 ? `+${balanceNeto}` : balanceNeto} kcal</span></h4>'
);

// Total Consumido text-primary instead of text-primary/80
content = content.replace(
  /<span className="text-xs text-primary\/80 font-black flex items-center gap-1">\s*\{comidaDia\} kcal\s*<\/span>/g,
  '<span className="text-xs text-primary font-black flex items-center gap-1">\n                                       {comidaDia} kcal\n                                     </span>'
);

// 2. Ingredients cards
const oldIngredientCard = `<div key={iIdx} className={\`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                      <span className="font-bold block truncate text-slate-800 dark:text-zinc-200">{ing.ingrediente}</span>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                                          {ing.cantidad} {ing.unidad}
                                        </span>
                                        <span className="text-xs text-primary/80 font-black flex items-center gap-1">
                                          <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {Math.round(ing.calorias)} kcal
                                        </span>
                                      </div>
                                    </div>`;

const newIngredientCard = `(() => {
                                      const baseNutri = getIngredientNutriVal(ing.ingrediente, mercaderia || []);
                                      const factor = ing.cantidad / 100;
                                      const p = Math.round(baseNutri.proteinas * factor);
                                      const c = Math.round(baseNutri.carbohidratos * factor);
                                      const g = Math.round(baseNutri.grasas * factor);
                                      
                                      return (
                                        <div key={iIdx} className={\`p-2 rounded-xl border text-[10px] flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                          <span className="font-bold block truncate text-slate-800 dark:text-zinc-200">{ing.ingrediente}</span>
                                          <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                                              {ing.cantidad} {ing.unidad}
                                            </span>
                                            <span className="text-[10px] text-primary font-black flex items-center gap-1">
                                              <Flame className="w-3 h-3 text-primary shrink-0 fill-primary/20" /> {Math.round(ing.calorias)} kcal
                                            </span>
                                          </div>
                                          {(p > 0 || c > 0 || g > 0) && (
                                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-bold">
                                                <span className="text-blue-500 dark:text-blue-400">P: {p}g</span>
                                                <span className="text-amber-500 dark:text-amber-400">C: {c}g</span>
                                                <span className="text-red-500 dark:text-red-400">G: {g}g</span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()`;

// We also need to fix the case where there is no `ingredientesConsumidos` but there is a `platoInfo`
const oldPlatoCard = `<div className={\`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                    <span className="font-bold block truncate text-slate-800 dark:text-zinc-200">{platoInfo.nombrePlato}</span>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                                        {log.cantidad || 1} porción(es)
                                      </span>
                                      <span className="text-xs text-primary/80 font-black flex items-center gap-1">
                                        <Flame className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" /> {log.calorias} kcal
                                      </span>
                                    </div>
                                  </div>`;

const newPlatoCard = `<div className={\`p-2 rounded-xl border text-[10px] flex flex-col justify-between gap-1 \${darkMode ? "bg-zinc-950/50 border-zinc-800/80" : "bg-slate-50 border-slate-200/60"}\`}>
                                    <span className="font-bold block truncate text-slate-800 dark:text-zinc-200">{platoInfo.nombrePlato}</span>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                                        {log.cantidad || 1} porción(es)
                                      </span>
                                      <span className="text-[10px] text-primary font-black flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-primary shrink-0 fill-primary/20" /> {log.calorias} kcal
                                      </span>
                                    </div>
                                    {(p > 0 || c > 0 || g > 0) && (
                                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-bold">
                                            <span className="text-blue-500 dark:text-blue-400">P: {p}g</span>
                                            <span className="text-amber-500 dark:text-amber-400">C: {c}g</span>
                                            <span className="text-red-500 dark:text-red-400">G: {g}g</span>
                                        </div>
                                    )}
                                  </div>`;

// Apply replaces
if (content.indexOf(oldIngredientCard) !== -1) {
    content = content.replace(oldIngredientCard, newIngredientCard);
} else {
    console.log("oldIngredientCard not found, using regex");
    content = content.replace(/<div key=\{iIdx\} className=\{\`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-1[\s\S]*?<\/div>\s*<\/div>/, newIngredientCard + "\n                                    ");
}

if (content.indexOf(oldPlatoCard) !== -1) {
    content = content.replace(oldPlatoCard, newPlatoCard);
} else {
    console.log("oldPlatoCard not found");
}

fs.writeFileSync('src/components/HealthView.tsx', content, 'utf-8');
console.log("Done");
