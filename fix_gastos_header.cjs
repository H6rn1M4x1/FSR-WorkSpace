const fs = require('fs');

let c = fs.readFileSync('src/components/GastosVariosTable.tsx', 'utf8');

const originalHeader = `<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-tight flex items-center gap-2">
                Gastos Varios
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">
                  Control & AI
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Sigue tus consumos por tarjeta de crédito o débito e importa
                resúmenes automáticamente con Inteligencia Artificial.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setShowAiModal(true);
                setExtractedPreview([]);
                setAiError(null);
              }}
              className="px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Subir Resumen con IA</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-full bg-primary text-white dark:text-blue-950 font-bold text-xs hover:bg-primary-hover shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Gasto</span>
            </button>
          </div>
        </div>`;

const newHeader = `<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-extrabold text-md flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>Gastos Varios</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest ml-1">
                Control & AI
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Sigue tus consumos por tarjeta de crédito o débito e importa resúmenes automáticamente con Inteligencia Artificial.
            </p>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setShowAiModal(true);
                  setExtractedPreview([]);
                  setAiError(null);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4" />
                <span>Subir Resumen con IA</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Gasto</span>
              </button>
            </div>
          </div>
        </div>`;

c = c.replace(originalHeader, newHeader);

// Update outer wrapper to exactly match the unified one:
c = c.replace(
  /className=\{`p-6 rounded-3xl border transition-all \$\{\n\s*darkMode\n\s*\? "bg-zinc-900\/30 border-zinc-800\/80 text-white"\n\s*: "bg-white border-zinc-200 text-zinc-900 shadow-xs"\n\s*\}`\}/,
  `className={\`p-6 rounded-3xl border \${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}\`}`
);

// Fix the "Filter and Search Controls" wrapper: 
// <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800/80">
// Change it to just: <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6"> like in AcademicView or AppointmentsView but let's keep it simple: <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
c = c.replace(
  /<div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800\/80">/,
  `<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">`
);

fs.writeFileSync('src/components/GastosVariosTable.tsx', c);
