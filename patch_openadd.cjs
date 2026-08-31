const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldAdd = `  // Open Create
  const handleOpenAdd = () => {
    prevTickerRef.current = "";
    setEditingItem(null);
    setFormLugar("Invertir Online");
    setFormOperacion("Compra");
    setFormTicker("");`;

const newAdd = `  // Open Create
  const handleOpenAdd = () => {
    prevTickerRef.current = "";
    setEditingItem(null);
    setFormTipoMercado("Tradicional");
    setBasePriceCripto("");
    setFormLugar("Invertir Online");
    setFormOperacion("Compra");
    setFormTicker("");`;

content = content.replace(oldAdd, newAdd);
fs.writeFileSync(file, content);
