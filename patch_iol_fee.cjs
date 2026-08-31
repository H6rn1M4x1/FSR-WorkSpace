const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const calcFeeStart = `  // InvertirOnline (IOL) Tariffs calculation based on selected ticker/panel
  const iolFeeInfo = useMemo(() => {`;
const calcFeeEnd = `    return {
      comisionARS,
      comisionUSD,
      rateLabel,
    };
  }, [formValorUnitarioPesos, formCantidad, formDolarCCL, formSplit, formTicker, allCotizaciones]);`;

const startIndex = content.indexOf(calcFeeStart);
const endIndex = content.indexOf(calcFeeEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const originalBlock = content.substring(startIndex, endIndex + calcFeeEnd.length);
    const newBlock = `  // Tariffs calculation based on selected ticker/panel/crypto
  const iolFeeInfo = useMemo(() => {
    const qty = formCantidad > 0 ? formCantidad : 0;
    
    if (formTipoMercado === "Cripto") {
       let unitUSD = parseCurrency(basePriceCripto);
       if (unitUSD === 0 && basePriceCripto.trim() === "") unitUSD = 0;
       const cripto = parseCurrency(formDolarCripto) || 1200;
       
       const rawTotalUSD = unitUSD * qty;
       const ratePercent = 0.001; // 0.1% Binance Spot
       const rateLabel = "0.1% Spot";
       
       const comisionUSD = rawTotalUSD * ratePercent;
       const comisionARS = comisionUSD * cripto;
       
       return { comisionARS, comisionUSD, rateLabel };
    }

    const unitARS = parseCurrency(formValorUnitarioPesos);
    const ccl = parseCurrency(formDolarCCL) || 1198;
    const split = formSplit > 0 ? formSplit : 1;

    const rawTotalARS = unitARS * qty;
    const valorAccionCompletaUSD = ccl > 0 ? (unitARS * split) / ccl : 0;
    const unitUSD = split > 0 ? valorAccionCompletaUSD / split : (ccl > 0 ? unitARS / ccl : 0);
    const rawTotalUSD = unitUSD * qty;

    const cleanTicker = formTicker.trim().toUpperCase();
    const quote = allCotizaciones.find((c) => c.simbolo.toUpperCase() === cleanTicker);
    const panel = quote?.panel || "";

    // Determine IOL tariff rate
    let ratePercent = 0.00605; // Default: 0.50% + 21% IVA = 0.605%
    let rateLabel = "0,50% + IVA (0,605%)";
    let minARS = 121; // $100 + IVA
    let minUSD = 2.0;

    if (panel.toLowerCase().includes("fondo") || cleanTicker.startsWith("FCI")) {
      ratePercent = 0;
      rateLabel = "0% (S/Cargo)";
      minARS = 0;
      minUSD = 0;
    } else if (panel.toLowerCase().includes("caucion") || cleanTicker.includes("CAUCION")) {
      ratePercent = 0.001815; // 0.15% + IVA = 0.1815%
      rateLabel = "0,15% + IVA (0,1815%)";
      minARS = 0;
      minUSD = 0;
    }

    const comisionARS = rawTotalARS > 0 && ratePercent > 0 ? Math.max(rawTotalARS * ratePercent, minARS) : 0;
    const comisionUSD = rawTotalUSD > 0 && ratePercent > 0 ? Math.max(rawTotalUSD * ratePercent, minUSD) : 0;

    return {
      comisionARS,
      comisionUSD,
      rateLabel,
    };
  }, [formValorUnitarioPesos, formCantidad, formDolarCCL, formSplit, formTicker, allCotizaciones, formTipoMercado, basePriceCripto, formDolarCripto]);`;

    content = content.replace(originalBlock, newBlock);
} else {
    console.warn("Fee info not found");
}

const oldBannerComisionTitle = `<span>Comisión IOL a Pagar</span>`;
const newBannerComisionTitle = `<span>{formTipoMercado === "Cripto" ? "Comisión Binance a Pagar" : "Comisión IOL a Pagar"}</span>`;

if (content.includes(oldBannerComisionTitle)) {
    content = content.replace(oldBannerComisionTitle, newBannerComisionTitle);
}

fs.writeFileSync(file, content);
console.log("Success");
