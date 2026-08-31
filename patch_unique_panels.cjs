const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldPanels = `  const uniquePanels = useMemo(() => {
    const panels = Array.from(new Set(allCotizaciones.map((c) => c.panel).filter(Boolean)));
    return ["TODOS", ...panels];
  }, [allCotizaciones]);`;

const newPanels = `  const uniquePanels = useMemo(() => {
    if (formTipoMercado === "Cripto") {
       return ["TODOS", "Criptomonedas"];
    }
    const panels = Array.from(new Set(allCotizaciones.map((c) => c.panel).filter(Boolean)));
    return ["TODOS", ...panels];
  }, [allCotizaciones, formTipoMercado]);`;

if (content.includes(oldPanels)) {
    content = content.replace(oldPanels, newPanels);
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("Not found");
}
