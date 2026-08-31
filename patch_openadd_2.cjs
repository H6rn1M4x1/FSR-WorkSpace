const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldAddFields = `    setFormCantidad(1);
    setFormDolarCCL(marketDolarCCL || "1.198,00");
    setFormSplit(1);`;

const newAddFields = `    setFormCantidad(1);
    setFormDolarCCL(marketDolarCCL || "1.198,00");
    setFormDolarCripto(marketDolarCripto || "1.200,00");
    setFormSplit(1);`;

content = content.replace(oldAddFields, newAddFields);
fs.writeFileSync(file, content);
