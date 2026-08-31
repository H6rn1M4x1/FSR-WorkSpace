const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldHeader = `                      <h3 className="font-black text-sm md:text-base">
                        Seleccionar Ticker / Símbolo
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Cotizaciones del Mercado (IOL)
                      </p>`;

const newHeader = `                      <h3 className="font-black text-sm md:text-base">
                        {formTipoMercado === "Cripto" ? "Seleccionar Crypto" : "Seleccionar Ticker / Símbolo"}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {formTipoMercado === "Cripto" ? "Cotizaciones de Criptomonedas" : "Cotizaciones del Mercado (IOL)"}
                      </p>`;

if (content.includes(oldHeader)) {
    content = content.replace(oldHeader, newHeader);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("Not found");
}
