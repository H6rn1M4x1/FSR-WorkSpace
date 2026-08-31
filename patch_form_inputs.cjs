const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldCant = `                    {/* Cantidad */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Cantidad de Acciones <span className="text-primary">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formCantidad}
                        onChange={(e) => setFormCantidad(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>`;

const newCant = `                    {/* Cantidad */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        {formTipoMercado === "Cripto" ? "Cantidad" : "Cantidad de Acciones"} <span className="text-primary">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formCantidad}
                        onChange={(e) => setFormCantidad(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                      />
                    </div>`;
content = content.replace(oldCant, newCant);

const oldDolar = `                    {/* Dólar CCL & Split configuration */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                        <span>Dólar CCL (Cotización)</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Lock className="w-3 h-3" /> No modificable
                        </span>
                      </label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={formDolarCCL}
                        placeholder="1.198,00"
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 outline-none font-mono cursor-not-allowed select-none opacity-85"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                        <span>Split / Ratio</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <Lock className="w-3 h-3" /> No modificable
                        </span>
                      </label>
                      <input
                        type="number"
                        disabled
                        readOnly
                        value={formSplit}
                        className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 outline-none font-mono cursor-not-allowed select-none opacity-85"
                      />
                    </div>`;

const newDolar = `                    {/* Dolar & Split configuration */}
                    {formTipoMercado === "Cripto" ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                            Dólar Cripto (Referencia)
                          </label>
                          <input
                            type="text"
                            value={formDolarCripto}
                            onChange={(e) => setFormDolarCripto(e.target.value)}
                            placeholder="1.200,00"
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                            Precio Base (US$)
                          </label>
                          <input
                            type="text"
                            value={basePriceCripto}
                            onChange={(e) => setBasePriceCripto(e.target.value)}
                            placeholder="US$ 0,00"
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                            <span>Dólar CCL (Cotización)</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Lock className="w-3 h-3" /> No modificable
                            </span>
                          </label>
                          <input
                            type="text"
                            disabled
                            readOnly
                            value={formDolarCCL}
                            placeholder="1.198,00"
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 outline-none font-mono cursor-not-allowed select-none opacity-85"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                            <span>Split / Ratio</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 bg-amber-500/10 dark:bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <Lock className="w-3 h-3" /> No modificable
                            </span>
                          </label>
                          <input
                            type="number"
                            disabled
                            readOnly
                            value={formSplit}
                            className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400 outline-none font-mono cursor-not-allowed select-none opacity-85"
                          />
                        </div>
                      </>
                    )}`;

content = content.replace(oldDolar, newDolar);
fs.writeFileSync(file, content);
