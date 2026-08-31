const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldModalSelect = `  // Handle selecting a ticker from the floating sub-modal
  const handleSelectTickerFromModal = (symbolObj: CotizacionAccion) => {
    const sym = symbolObj.simbolo;
    setFormTicker(sym);
    saveRecentTicker(sym);

    // Auto-load split/ratio from quote symbol
    const autoRatio = getRatioForTicker(sym, allCotizaciones);
    setFormSplit(autoRatio);

    // Auto-fill Unitario ARS with latest quote price
    if (symbolObj.ultimoPrecio) {
      const rawPrice = symbolObj.ultimoPrecio.startsWith("$")
        ? symbolObj.ultimoPrecio
        : \`$\${symbolObj.ultimoPrecio}\`;
      setFormValorUnitarioPesos(rawPrice);
    }

    setShowTickerPicker(false);
  };`;

const newModalSelect = `  // Handle selecting a ticker from the floating sub-modal
  const handleSelectTickerFromModal = (symbolObj: CotizacionAccion) => {
    const sym = symbolObj.simbolo;
    setFormTicker(sym);
    saveRecentTicker(sym);

    if (formTipoMercado === "Cripto") {
       if (symbolObj.ultimoPrecio) {
          // ensure format US$ X.XX
          const valStr = symbolObj.ultimoPrecio.replace(/[^0-9,.-]/g, "").trim();
          setBasePriceCripto(\`US$ \${valStr}\`);
       }
    } else {
      // Auto-load split/ratio from quote symbol
      const autoRatio = getRatioForTicker(sym, allCotizaciones);
      setFormSplit(autoRatio);

      // Auto-fill Unitario ARS with latest quote price
      if (symbolObj.ultimoPrecio) {
        const rawPrice = symbolObj.ultimoPrecio.startsWith("$")
          ? symbolObj.ultimoPrecio
          : \`$\${symbolObj.ultimoPrecio}\`;
        setFormValorUnitarioPesos(rawPrice);
      }
    }

    setShowTickerPicker(false);
  };`;

content = content.replace(oldModalSelect, newModalSelect);

const oldAutoUpdate = `      // Auto-update Valor Unitario (ARS) if ticker changed
      if (prevTickerRef.current.trim().toUpperCase() !== cleanTicker) {
        prevTickerRef.current = formTicker;
        const quote = allCotizaciones.find(
          (c) => c.simbolo.trim().toUpperCase() === cleanTicker
        );
        if (quote && quote.ultimoPrecio) {
          const rawPrice = quote.ultimoPrecio.startsWith("$")
            ? quote.ultimoPrecio
            : \`$\${quote.ultimoPrecio}\`;
          setFormValorUnitarioPesos(rawPrice);
        }
      }`;

const newAutoUpdate = `      // Auto-update Valor Unitario (ARS) if ticker changed
      if (prevTickerRef.current.trim().toUpperCase() !== cleanTicker) {
        prevTickerRef.current = formTicker;
        if (formTipoMercado === "Cripto") {
           const cQuote = cotizacionesCripto?.find(c => c.id === formTicker);
           if (cQuote && cQuote.price) {
              const valStr = cQuote.price.replace(/[^0-9,.-]/g, "").trim();
              setBasePriceCripto(\`US$ \${valStr}\`);
           }
        } else {
          const quote = allCotizaciones.find(
            (c) => c.simbolo.trim().toUpperCase() === cleanTicker
          );
          if (quote && quote.ultimoPrecio) {
            const rawPrice = quote.ultimoPrecio.startsWith("$")
              ? quote.ultimoPrecio
              : \`$\${quote.ultimoPrecio}\`;
            setFormValorUnitarioPesos(rawPrice);
          }
        }
      }`;

content = content.replace(oldAutoUpdate, newAutoUpdate);

fs.writeFileSync(file, content);
