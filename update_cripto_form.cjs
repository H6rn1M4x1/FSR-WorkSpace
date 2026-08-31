const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Ticker Label
const tickerLabelOld = '{formTipoMercado === "Cripto" ? "Criptomoneda" : "Ticker / Símbolo"} <span className="text-primary">*</span>';
const tickerLabelNew = '{formTipoMercado === "Cripto" ? "Nombre de Crypto" : "Ticker / Símbolo"} <span className="text-primary">*</span>';
if (content.includes(tickerLabelOld)) {
    content = content.replace(tickerLabelOld, tickerLabelNew);
} else {
    console.warn("Ticker label not found");
}

// 2. Dolar CCL & Split & Unitario ARS & Unitario USD
const blockStart = `                    {/* Dólar CCL & Split configuration */}`;
const blockEndMarker = `                    {/* Total ARS (Calculated automatically with commissions) */}`;

const startIndex = content.indexOf(blockStart);
const endIndex = content.indexOf(blockEndMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const originalBlock = content.substring(startIndex, endIndex);

    const newBlock = `                    {formTipoMercado === "Cripto" ? (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                            Cotización Dólar Crypto
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
                            Precio de Compra/Venta (US$)
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
                        {/* Dólar CCL & Split configuration */}
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

                        {/* Unit USD (Calculated: (Acción Completa USD) / Split) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                            Valor Unitario (USD) <Calculator className="w-3 h-3 text-blue-500" />
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={formValorUnitarioDolares}
                            className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400 outline-none font-mono cursor-not-allowed"
                          />
                        </div>
                      </>
                    )}

`;
    content = content.replace(originalBlock, newBlock);
} else {
    console.warn("Dolar CCL block not found");
}

// 3. Update the calc logic
const calcStart = `  // Recalculate Form values automatically when inputs change`;
const calcEndStr = `  ]);`;
const calcStartIndex = content.indexOf(calcStart);
const calcEndIndex = content.indexOf(calcEndStr, calcStartIndex);

if (calcStartIndex !== -1 && calcEndIndex !== -1) {
    const originalCalc = content.substring(calcStartIndex, calcEndIndex + calcEndStr.length);
    const newCalc = `  // Recalculate Form values automatically when inputs change
  useEffect(() => {
    const qty = formCantidad > 0 ? formCantidad : 0;
    
    if (formTipoMercado === "Cripto") {
       let unitUSD = parseCurrency(basePriceCripto);
       if (unitUSD === 0 && basePriceCripto.trim() === "") unitUSD = 0;
       
       const cripto = parseCurrency(formDolarCripto) || 1200;
       
       // Binance Commission: 0.1%
       const ratePercent = 0.001;
       const rawTotalUSD = unitUSD * qty;
       const comisionUSD = rawTotalUSD * ratePercent;
       const totalConComisionUSD = rawTotalUSD + comisionUSD;

       setFormValorTotalDolares(formatUSD(totalConComisionUSD));
       setFormValorUnitarioDolares(formatUSD(unitUSD)); // Underlying unit for save
       
       const unitARS = unitUSD * cripto;
       const totalConComisionARS = totalConComisionUSD * cripto;
       
       setFormValorUnitarioPesos(formatARS(unitARS));
       setFormValorTotalPesos(formatARS(totalConComisionARS));
       
       // G/P calculation
       if (formTicker.trim()) {
           const cQuote = cotizacionesCripto?.find(c => c.id === formTicker);
           if (cQuote && cQuote.price) {
               const currentPriceUSD = parseCurrency(cQuote.price);
               const currentPriceARS = currentPriceUSD * cripto;

               const gpUnitUSD = currentPriceUSD - unitUSD;
               const gpTotalUSD = gpUnitUSD * qty;
               const gpTotalARS = gpTotalUSD * cripto;

               setFormGananciasDolares(formatUSD(gpTotalUSD));
               setFormGananciasPesos(formatARS(gpTotalARS));
           } else {
               setFormGananciasDolares("US$ 0,00");
               setFormGananciasPesos("$0,00");
           }
       } else {
           setFormGananciasDolares("US$ 0,00");
           setFormGananciasPesos("$0,00");
       }
       
    } else {
      const unitARS = parseCurrency(formValorUnitarioPesos);
      const ccl = parseCurrency(formDolarCCL) || 1198;
      const split = formSplit > 0 ? formSplit : 1;

      const cleanTicker = formTicker.trim().toUpperCase();
      const quote = allCotizaciones.find(
        (c) => c.simbolo.toUpperCase() === cleanTicker
      );
      const panel = quote?.panel || "";

      let ratePercent = 0.00605; // IOL: 0.50% + 21% IVA = 0.605%
      let minARS = 121;
      let minUSD = 2.0;

      if (panel.toLowerCase().includes("fondo") || cleanTicker.startsWith("FCI")) {
        ratePercent = 0;
        minARS = 0;
        minUSD = 0;
      } else if (panel.toLowerCase().includes("caucion") || cleanTicker.includes("CAUCION")) {
        ratePercent = 0.001815;
        minARS = 0;
        minUSD = 0;
      }

      const rawTotalARS = unitARS * qty;
      const comisionARS = rawTotalARS > 0 && ratePercent > 0 ? Math.max(rawTotalARS * ratePercent, minARS) : 0;
      const totalConComisionARS = rawTotalARS + comisionARS;
      setFormValorTotalPesos(formatARS(totalConComisionARS));

      const valorAccionCompletaUSD = ccl > 0 ? (unitARS * split) / ccl : 0;
      const unitUSD = split > 0 ? valorAccionCompletaUSD / split : (ccl > 0 ? unitARS / ccl : 0);
      setFormValorUnitarioDolares(formatUSD(unitUSD));

      const rawTotalUSD = unitUSD * qty;
      const comisionUSD = rawTotalUSD > 0 && ratePercent > 0 ? Math.max(rawTotalUSD * ratePercent, minUSD) : 0;
      const totalConComisionUSD = rawTotalUSD + comisionUSD;
      setFormValorTotalDolares(formatUSD(totalConComisionUSD));

      // 4. G/P Acumulada
      if (formTicker.trim() && quote) {
        const currentPriceARS = parseCurrency(quote.ultimoPrecio);
        const currentPriceUSD = quote.moneda === "USD" ? currentPriceARS : (ccl > 0 ? currentPriceARS / ccl : 0);

        const gpUnitARS = currentPriceARS - unitARS;
        const gpTotalARS = gpUnitARS * qty;

        const gpUnitUSD = currentPriceUSD - unitUSD;
        const gpTotalUSD = gpUnitUSD * qty;

        setFormGananciasPesos(formatARS(gpTotalARS));
        setFormGananciasDolares(formatUSD(gpTotalUSD));
      } else {
        setFormGananciasPesos("$0,00");
        setFormGananciasDolares("US$ 0,00");
      }
    }
  }, [
    formValorUnitarioPesos,
    formCantidad,
    formDolarCCL,
    formSplit,
    formTicker,
    allCotizaciones,
    formTipoMercado,
    basePriceCripto,
    formDolarCripto,
    cotizacionesCripto,
  ]);`;
    content = content.replace(originalCalc, newCalc);
} else {
    console.warn("Calc block not found");
}

// 4. Update the "Valor Total" labels for Cripto Binance Commission
const lblARSStart = `{/* Total ARS (Calculated automatically with commissions) */}`;
const lblARSEnd = `Valor Total (ARS) <Calculator className="w-3 h-3 text-primary" />`;
const lblARSReplace = `Valor Total (ARS) <Calculator className="w-3 h-3 text-primary" />`;

const lblUSDStart = `{/* Total USD (Calculated automatically with commissions) */}`;

content = content.replace(
    `<span className="text-[10px] font-semibold text-primary/80">
                          (Incluye comisiones)
                        </span>`,
    `<span className="text-[10px] font-semibold text-primary/80">
                          {formTipoMercado === "Cripto" ? "(Incluye 0.1% Binance)" : "(Incluye comisiones IOL)"}
                        </span>`
);
content = content.replace(
    `<span className="text-[10px] font-semibold text-blue-500/80">
                          (Incluye comisiones)
                        </span>`,
    `<span className="text-[10px] font-semibold text-blue-500/80">
                          {formTipoMercado === "Cripto" ? "(Incluye 0.1% Binance)" : "(Incluye comisiones IOL)"}
                        </span>`
);

fs.writeFileSync(file, content);
console.log("Done");
