const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldTicker = `                    {/* Ticker */}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        Ticker / Símbolo <span className="text-primary">*</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={openTickerPickerModal}
                          className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 hover:border-primary transition-all text-xs font-bold cursor-pointer"
                        >
                          {formTicker ? (
                            <span className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-black font-mono">
                                {formTicker}
                              </span>
                              <span className="text-slate-500 dark:text-zinc-400 text-[11px]">
                                {allCotizaciones.find((c) => c.simbolo === formTicker)?.descripcion || "Seleccionado"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-zinc-500 font-normal">
                              -- Buscar / Seleccionar Ticker de IOL --
                            </span>
                          )}
                          <Search className="w-4 h-4 text-primary shrink-0" />
                        </button>
                      </div>
                    </div>`;

const newTicker = `                    {/* Ticker */}
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                        {formTipoMercado === "Cripto" ? "Criptomoneda" : "Ticker / Símbolo"} <span className="text-primary">*</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={openTickerPickerModal}
                          className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 hover:border-primary transition-all text-xs font-bold cursor-pointer"
                        >
                          {formTicker ? (
                            <span className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-black font-mono">
                                {formTicker}
                              </span>
                              <span className="text-slate-500 dark:text-zinc-400 text-[11px]">
                                {formTipoMercado === "Cripto" 
                                  ? (cotizacionesCripto?.find((c) => c.id === formTicker)?.name || "Seleccionado")
                                  : (allCotizaciones.find((c) => c.simbolo === formTicker)?.descripcion || "Seleccionado")
                                }
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-zinc-500 font-normal">
                              {formTipoMercado === "Cripto" ? "-- Buscar / Seleccionar Criptomoneda --" : "-- Buscar / Seleccionar Ticker de IOL --"}
                            </span>
                          )}
                          <Search className="w-4 h-4 text-primary shrink-0" />
                        </button>
                      </div>
                    </div>`;

content = content.replace(oldTicker, newTicker);
fs.writeFileSync(file, content);
