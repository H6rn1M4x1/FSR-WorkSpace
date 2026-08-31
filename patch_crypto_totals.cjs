const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `    if (formTipoMercado === "Cripto") {
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
       setFormValorTotalPesos(formatARS(totalConComisionARS));`;

const newBlock = `    if (formTipoMercado === "Cripto") {
       let unitUSD = parseCurrency(basePriceCripto);
       if (unitUSD === 0 && basePriceCripto.trim() === "") unitUSD = 0;
       
       const cripto = parseCurrency(formDolarCripto) || 1200;
       
       // Binance Commission: 0.1% (Only for info/banner, not for totals per user request)
       const ratePercent = 0.001;
       const rawTotalUSD = unitUSD * qty;
       const comisionUSD = rawTotalUSD * ratePercent;
       
       // Valor Total (USD): Cantidad*Precio de Compra/Venta (US$)
       const totalUSD = rawTotalUSD;

       setFormValorTotalDolares(formatUSD(totalUSD));
       setFormValorUnitarioDolares(formatUSD(unitUSD)); // Underlying unit for save
       
       const unitARS = unitUSD * cripto;
       
       // Valor Total (ARS): Cantidad*Precio de Compra/Venta (US$)*Cotización Dólar Crypto
       const totalARS = rawTotalUSD * cripto;
       
       setFormValorUnitarioPesos(formatARS(unitARS));
       setFormValorTotalPesos(formatARS(totalARS));`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("Not found");
}
