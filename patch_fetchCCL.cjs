const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldFetch = `    const fetchCCL = async () => {
      try {
        const res = await fetch("https://dolarapi.com/v1/dolares");
        if (res.ok) {
          const data = await res.json();
          const cclObj = data.find(
            (d: any) => d.casa === "contadoconliqui" || d.casa === "ccl"
          );
          if (cclObj?.venta && isMounted) {
            const val = Number(cclObj.venta).toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            if (val) {
              setMarketDolarCCL(val);
              return;
            }
          }
        }
      } catch {}

      const item = allCotizaciones.find(
        (c) =>
          c.panel === "Monedas / Divisas" &&
          (c.descripcion.toLowerCase().includes("ccl") ||
            c.descripcion.toLowerCase().includes("liqui") ||
            c.simbolo.toLowerCase().includes("ccl"))
      );
      if (item && item.ultimoPrecio && isMounted) {
        setMarketDolarCCL(item.ultimoPrecio);
      }
    };`;

const newFetch = `    const fetchDolares = async () => {
      try {
        const res = await fetch("https://dolarapi.com/v1/dolares");
        if (res.ok) {
          const data = await res.json();
          
          const cclObj = data.find(
            (d: any) => d.casa === "contadoconliqui" || d.casa === "ccl"
          );
          if (cclObj?.venta && isMounted) {
            const val = Number(cclObj.venta).toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            if (val) setMarketDolarCCL(val);
          } else {
             // fallback IOL
            const item = allCotizaciones.find(
              (c) =>
                c.panel === "Monedas / Divisas" &&
                (c.descripcion.toLowerCase().includes("ccl") ||
                  c.descripcion.toLowerCase().includes("liqui") ||
                  c.simbolo.toLowerCase().includes("ccl"))
            );
            if (item && item.ultimoPrecio && isMounted) {
              setMarketDolarCCL(item.ultimoPrecio);
            }
          }

          const criptoObj = data.find((d: any) => d.casa === "cripto");
          if (criptoObj?.venta && isMounted) {
             const valCripto = Number(criptoObj.venta).toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
             });
             if (valCripto) setMarketDolarCripto(valCripto);
          }
        }
      } catch {}
    };`;

content = content.replace(oldFetch, newFetch);
content = content.replace('fetchCCL();', 'fetchDolares();');

// Also add marketDolarCripto state
const cclState = `  const [marketDolarCCL, setMarketDolarCCL] = useState<string>("1.198,00");`;
const newStates = `  const [marketDolarCCL, setMarketDolarCCL] = useState<string>("1.198,00");
  const [marketDolarCripto, setMarketDolarCripto] = useState<string>("1.200,00");
  const [formTipoMercado, setFormTipoMercado] = useState<"Tradicional" | "Cripto">("Tradicional");
  const [formDolarCripto, setFormDolarCripto] = useState("1.200,00");
  const [basePriceCripto, setBasePriceCripto] = useState("");
`;
content = content.replace(cclState, newStates);

fs.writeFileSync(file, content);
