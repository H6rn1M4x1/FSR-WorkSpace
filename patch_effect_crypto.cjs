const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldBlock = `        if (formTipoMercado === "Cripto") {
           const cQuote = cotizacionesCripto?.find(c => c.id === formTicker);
           if (cQuote && cQuote.price) {
              const valStr = cQuote.price.replace(/[^0-9,.-]/g, "").trim();
              setBasePriceCripto(\`US$ \${valStr}\`);
           }`;

const newBlock = `        if (formTipoMercado === "Cripto") {
           const cQuote = cotizacionesCripto?.find(c => c.id === formTicker);
           if (cQuote && cQuote.price) {
              let clean = cQuote.price.replace(/[^0-9,.-]/g, "").trim();
              if (clean.includes(",") && clean.includes(".")) {
                 clean = clean.replace(/,/g, "").replace(".", ",");
              } else if (clean.includes(".")) {
                 clean = clean.replace(".", ",");
              }
              let num = parseFloat(clean.replace(/\\./g, "").replace(",", "."));
              if (!isNaN(num)) {
                 clean = num.toLocaleString("es-AR", { maximumFractionDigits: 6 });
              }
              setBasePriceCripto(\`US$ \${clean}\`);
           }`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("Not found");
}
