const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `    if (formTipoMercado === "Cripto") {
       if (symbolObj.ultimoPrecio) {
          // ensure format US$ X.XX
          const valStr = symbolObj.ultimoPrecio.replace(/[^0-9,.-]/g, "").trim();
          setBasePriceCripto(\`US$ \${valStr}\`);
       }`;

const newBlock = `    if (formTipoMercado === "Cripto") {
       if (symbolObj.ultimoPrecio) {
          // The source is en-US formatted (e.g. 65,000.00). We need to convert it to es-AR format (65.000,00)
          // so parseCurrency and the rest of the form can understand it correctly.
          let clean = symbolObj.ultimoPrecio.replace(/[^0-9,.-]/g, "").trim();
          if (clean.includes(",") && clean.includes(".")) {
             // en-US: 65,000.00 -> 65000.00 -> 65.000,00
             clean = clean.replace(/,/g, "").replace(".", ",");
          } else if (clean.includes(".")) {
             // 0.05 -> 0,05
             clean = clean.replace(".", ",");
          }
          // Now clean is "65000,00" or similar, we should add thousands separators to be nice
          let num = parseFloat(clean.replace(/\\./g, "").replace(",", "."));
          if (!isNaN(num)) {
             clean = num.toLocaleString("es-AR", { maximumFractionDigits: 6 });
          }
          setBasePriceCripto(clean);
       }`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("Not found");
}
