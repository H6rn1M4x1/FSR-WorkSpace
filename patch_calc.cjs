const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldCalc = `  // Recalculate Form values automatically when inputs change
  useEffect(() => {
    const unitARS = parseCurrency(formValorUnitarioPesos);
    const qty = formCantidad > 0 ? formCantidad : 0;
    const ccl = parseCurrency(formDolarCCL) || 1198;
    const split = formSplit > 0 ? formSplit : 1;

    // Determine IOL tariff rate
    const cleanTicker = formTicker.trim().toUpperCase();
    const quote = allCotizaciones.find(
      (c) => c.simbolo.toUpperCase() === cleanTicker
    );
    const panel = quote?.panel || "";

    let ratePercent = 0.00605; // Default: 0.50% + 21% IVA = 0.605%
    let minARS = 121;
    let minUSD = 2.0;

    if (panel.toLowerCase().includes("fondo") || cleanTicker.startsWith("FCI")) {
      ratePercent = 0;
      minARS = 0;
      minUSD = 0;
    } else if (panel.toLowerCase().includes("caucion") || cleanTicker.includes("CAUCION")) {
      ratePercent = 0.001815; // 0.15% + IVA = 0.1815%
      minARS = 0;
      minUSD = 0;
    }

    // 1. Valor Total (ARS) = (Unitario ARS * Cantidad) + Comisión IOL
    const rawTotalARS = unitARS * qty;
    const comisionARS =
      rawTotalARS > 0
        ? ratePercent > 0
          ? Math.max(rawTotalARS * ratePercent, minARS)
          : 0
        : 0;
    const totalConComisionARS = rawTotalARS + comisionARS;
    setFormValorTotalPesos(formatARS(totalConComisionARS));

    // 2. Valor Unitario (USD) = Se calcula obteniendo el valor de la acción completa en USD, dividido entre "Split / Ratio"
    // Valor de la acción completa en USD = (Valor Unitario ARS * Split / Ratio) / Dólar CCL
    // O más simple (dado que unitARS ya es por el CEDEAR local): (Unitario ARS / Dólar CCL)
    // El Split sirve para el cálculo subyacente si queremos ver el precio real en NY, pero para
    // el unitario del CEDEAR local en dólares es directo. Asumimos la división directa.
    const unitUSD = ccl > 0 ? unitARS / ccl : 0;
    setFormValorUnitarioDolares(formatUSD(unitUSD));

    // 3. Valor Total (USD) = (Unit USD * Cantidad) + Comisión en USD
    const rawTotalUSD = unitUSD * qty;
    const comisionUSD =
      rawTotalUSD > 0
        ? ratePercent > 0
          ? Math.max(rawTotalUSD * ratePercent, minUSD)
          : 0
        : 0;
    const totalConComisionUSD = rawTotalUSD + comisionUSD;
    setFormValorTotalDolares(formatUSD(totalConComisionUSD));
  }, [
    formValorUnitarioPesos,
    formCantidad,
    formDolarCCL,
    formSplit,
    formTicker,
    allCotizaciones,
  ]);`;

const newCalc = `  // Recalculate Form values automatically when inputs change
  useEffect(() => {
    const qty = formCantidad > 0 ? formCantidad : 0;
    
    if (formTipoMercado === "Cripto") {
       // Base is USD for Crypto
       let unitUSD = parseCurrency(basePriceCripto);
       if (unitUSD === 0 && basePriceCripto.trim() === "") unitUSD = 0;
       
       const cripto = parseCurrency(formDolarCripto) || 1200;
       
       const totalUSD = unitUSD * qty;
       setFormValorTotalDolares(formatUSD(totalUSD));
       setFormValorUnitarioDolares(formatUSD(unitUSD)); // keep formatted version
       
       const unitARS = unitUSD * cripto;
       const totalARS = totalUSD * cripto;
       
       setFormValorUnitarioPesos(formatARS(unitARS));
       setFormValorTotalPesos(formatARS(totalARS));
       
    } else {
      const unitARS = parseCurrency(formValorUnitarioPesos);
      const ccl = parseCurrency(formDolarCCL) || 1198;
      const split = formSplit > 0 ? formSplit : 1;

      // Determine IOL tariff rate
      const cleanTicker = formTicker.trim().toUpperCase();
      const quote = allCotizaciones.find(
        (c) => c.simbolo.toUpperCase() === cleanTicker
      );
      const panel = quote?.panel || "";

      let ratePercent = 0.00605; // Default: 0.50% + 21% IVA = 0.605%
      let minARS = 121;
      let minUSD = 2.0;

      if (panel.toLowerCase().includes("fondo") || cleanTicker.startsWith("FCI")) {
        ratePercent = 0;
        minARS = 0;
        minUSD = 0;
      } else if (panel.toLowerCase().includes("caucion") || cleanTicker.includes("CAUCION")) {
        ratePercent = 0.001815; // 0.15% + IVA = 0.1815%
        minARS = 0;
        minUSD = 0;
      }

      // 1. Valor Total (ARS) = (Unitario ARS * Cantidad) + Comisión IOL
      const rawTotalARS = unitARS * qty;
      const comisionARS =
        rawTotalARS > 0
          ? ratePercent > 0
            ? Math.max(rawTotalARS * ratePercent, minARS)
            : 0
          : 0;
      const totalConComisionARS = rawTotalARS + comisionARS;
      setFormValorTotalPesos(formatARS(totalConComisionARS));

      // 2. Valor Unitario (USD)
      const unitUSD = ccl > 0 ? unitARS / ccl : 0;
      setFormValorUnitarioDolares(formatUSD(unitUSD));

      // 3. Valor Total (USD) = (Unit USD * Cantidad) + Comisión en USD
      const rawTotalUSD = unitUSD * qty;
      const comisionUSD =
        rawTotalUSD > 0
          ? ratePercent > 0
            ? Math.max(rawTotalUSD * ratePercent, minUSD)
            : 0
          : 0;
      const totalConComisionUSD = rawTotalUSD + comisionUSD;
      setFormValorTotalDolares(formatUSD(totalConComisionUSD));
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
  ]);`;

content = content.replace(oldCalc, newCalc);
fs.writeFileSync(file, content);
