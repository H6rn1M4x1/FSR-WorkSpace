const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldEdit = `  // Open Edit
  const handleOpenEdit = (item: Inversion) => {
    const itemTicker = item.ticker || "";
    prevTickerRef.current = itemTicker;
    setEditingItem(item);
    setFormLugar(item.lugar || "Invertir Online");
    setFormOperacion(item.operacion || "Compra");
    setFormTicker(itemTicker);
    setFormFecha(item.fecha || "");
    setFormCantidad(item.cantidad || 1);
    setFormDolarCCL(marketDolarCCL || "1.198,00");
    const itemRatio = item.ticker ? getRatioForTicker(item.ticker, allCotizaciones) : 1;
    setFormSplit(itemRatio);
    setFormValorUnitarioPesos(item.valorUnitarioPesos || "$0,00");
    setFormValorTotalPesos(item.valorTotalPesos || "$0,00");
    setFormEstado(item.estado || "Abierto");
    setFormValorUnitarioDolares(item.valorUnitarioDolares || "US$ 0,00");
    setFormValorTotalDolares(item.valorTotalDolares || "US$ 0,00");
    setFormGananciasPesos(item.gananciasAcumuladasPesos || "$0,00");
    setFormGananciasDolares(item.gananciasAcumuladasDolares || "US$ 0,00");
    setFormResultado(item.resultado || "Ganancia");
    setShowAddModal(true);
  };`;

const newEdit = `  // Open Edit
  const handleOpenEdit = (item: Inversion) => {
    const itemTicker = item.ticker || "";
    prevTickerRef.current = itemTicker;
    setEditingItem(item);
    
    // Auto-detect crypto
    const isCrypto = cotizacionesCripto && cotizacionesCripto.some(c => c.id === itemTicker);
    setFormTipoMercado(isCrypto ? "Cripto" : "Tradicional");

    setFormLugar(item.lugar || "Invertir Online");
    setFormOperacion(item.operacion || "Compra");
    setFormTicker(itemTicker);
    setFormFecha(item.fecha || "");
    setFormCantidad(item.cantidad || 1);
    setFormDolarCCL(marketDolarCCL || "1.198,00");
    setFormDolarCripto(marketDolarCripto || "1.200,00");
    
    if (isCrypto) {
       setBasePriceCripto(item.valorUnitarioDolares || "US$ 0,00");
    }

    const itemRatio = item.ticker ? getRatioForTicker(item.ticker, allCotizaciones) : 1;
    setFormSplit(itemRatio);
    setFormValorUnitarioPesos(item.valorUnitarioPesos || "$0,00");
    setFormValorTotalPesos(item.valorTotalPesos || "$0,00");
    setFormEstado(item.estado || "Abierto");
    setFormValorUnitarioDolares(item.valorUnitarioDolares || "US$ 0,00");
    setFormValorTotalDolares(item.valorTotalDolares || "US$ 0,00");
    setFormGananciasPesos(item.gananciasAcumuladasPesos || "$0,00");
    setFormGananciasDolares(item.gananciasAcumuladasDolares || "US$ 0,00");
    setFormResultado(item.resultado || "Ganancia");
    setShowAddModal(true);
  };`;

content = content.replace(oldEdit, newEdit);
fs.writeFileSync(file, content);
