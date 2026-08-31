const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `<span className="text-[10px] font-semibold text-blue-600/80 dark:text-blue-400/80">
                          (Incluye comisiones)
                        </span>`,
    `<span className="text-[10px] font-semibold text-blue-600/80 dark:text-blue-400/80">
                          {formTipoMercado === "Cripto" ? "(Incluye 0.1% Binance)" : "(Incluye comisiones IOL)"}
                        </span>`
);

fs.writeFileSync(file, content);
console.log("Success");
