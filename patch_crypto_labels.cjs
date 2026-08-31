const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldLabel = '{formTipoMercado === "Cripto" ? "(Incluye 0.1% Binance)" : "(Incluye comisiones IOL)"}';
const newLabel = '{formTipoMercado === "Cripto" ? "(Sin comisiones)" : "(Incluye comisiones IOL)"}';

if (content.includes(oldLabel)) {
    content = content.replaceAll(oldLabel, newLabel);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("Not found");
}
