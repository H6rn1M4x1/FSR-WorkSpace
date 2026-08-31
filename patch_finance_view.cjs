const fs = require('fs');
const file = 'src/components/FinanceView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldInversiones = `<InversionesTable
          inversiones={inversiones}
          setInversiones={setInversiones}
          cotizaciones={cotizacionesAcciones}
          darkMode={darkMode}
          onExportSheets={onExportSheets}
        />`;

const newInversiones = `<InversionesTable
          inversiones={inversiones}
          setInversiones={setInversiones}
          cotizaciones={cotizacionesAcciones}
          cotizacionesCripto={cotizacionesCripto}
          darkMode={darkMode}
          onExportSheets={onExportSheets}
        />`;

if (content.includes(oldInversiones)) {
    content = content.replace(oldInversiones, newInversiones);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("Not found");
}
