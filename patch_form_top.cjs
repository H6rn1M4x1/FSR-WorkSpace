const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldFormStart = `<form onSubmit={handleSave} className="space-y-4 pb-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Lugar */}`;

const newFormStart = `<form onSubmit={handleSave} className="space-y-4 pb-1">
                    {/* Tipo de Inversión */}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                        Tipo de Inversión
                      </label>
                      <div className="flex bg-slate-100 dark:bg-zinc-900 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => setFormTipoMercado("Tradicional")}
                          className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${formTipoMercado === "Tradicional" ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"}\`}
                        >
                          Mercado Tradicional
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormTipoMercado("Cripto")}
                          className={\`flex-1 py-2 text-xs font-bold rounded-lg transition-all \${formTipoMercado === "Cripto" ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"}\`}
                        >
                          Criptomoneda
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Lugar */}`;

content = content.replace(oldFormStart, newFormStart);
fs.writeFileSync(file, content);
