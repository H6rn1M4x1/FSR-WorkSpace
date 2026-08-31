const fs = require('fs');
let content = fs.readFileSync('src/components/MealsView.tsx', 'utf8');

const regex = /const renderPlatoIngredientsBadges = \([^)]*\) => \{[\s\S]*?\};/;

const replacement = `const renderPlatoIngredientsBadges = (platoId: string) => {
    const list = getPlatoIngredientsList(platoId);
    if (list.length === 0) return <span className="text-slate-400 dark:text-zinc-600">-</span>;
    
    return (
      <div className="flex flex-col gap-1.5 py-1">
        {list.map((item, idx) => {
          const ingCals = calculateIngredientCalories(item.ingrediente, item.cantidad, mercaderia);
          return (
            <div key={idx} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-zinc-800/60 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">{item.ingrediente}</span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">
                  {item.cantidad !== undefined ? item.cantidad : ""} {item.unidad}
                </span>
              </div>
              {ingCals > 0 && (
                <span className="font-bold text-[10px] bg-primary/10 px-1.5 py-0.5 rounded-md text-primary shrink-0">
                  {Math.round(ingCals)} kcal
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/MealsView.tsx', content, 'utf8');
