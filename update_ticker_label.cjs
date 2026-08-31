const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldLabel = `                        <span>
                          Ticker / Símbolo (Cotizaciones IOL) <span className="text-primary">*</span>
                        </span>`;
const newLabel = `                        <span>
                          {formTipoMercado === "Cripto" ? "Nombre de Crypto" : "Ticker / Símbolo (Cotizaciones IOL)"} <span className="text-primary">*</span>
                        </span>`;

if (content.includes(oldLabel)) {
    content = content.replace(oldLabel, newLabel);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("Label not found");
}

