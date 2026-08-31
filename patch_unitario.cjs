const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldUnit = `                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Valor Unitario (ARS)
                      </label>
                      <input
                        type="text"
                        placeholder="$15.000,00"
                        value={formValorUnitarioPesos}
                        onChange={(e) => setFormValorUnitarioPesos(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>`;

const newUnit = `                    {formTipoMercado !== "Cripto" && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                          Valor Unitario (ARS)
                        </label>
                        <input
                          type="text"
                          placeholder="$15.000,00"
                          value={formValorUnitarioPesos}
                          onChange={(e) => setFormValorUnitarioPesos(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                        />
                      </div>
                    )}`;
content = content.replace(oldUnit, newUnit);
fs.writeFileSync(file, content);
