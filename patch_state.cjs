const fs = require('fs');
const file = '/app/applet/src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const stateDefinitionsStart = `  // Real-time Dólar CCL state from Market Quotes (IOL / dolarapi)
  const [marketDolarCCL, setMarketDolarCCL] = useState<string>("1.198,00");
  const [marketDolarCripto, setMarketDolarCripto] = useState<string>("1.200,00");
  const [formTipoMercado, setFormTipoMercado] = useState<"Tradicional" | "Cripto">("Tradicional");
  const [formDolarCripto, setFormDolarCripto] = useState("1.200,00");
  const [basePriceCripto, setBasePriceCripto] = useState("");`;

const formStateLoc = `  // Form State
  const [formLugar, setFormLugar] = useState("Invertir Online");`;

const oldStateDefs = `  // Real-time Dólar CCL state from Market Quotes (IOL / dolarapi)
  const [marketDolarCCL, setMarketDolarCCL] = useState<string>("1.198,00");
  const [marketDolarCripto, setMarketDolarCripto] = useState<string>("1.200,00");
  const [formTipoMercado, setFormTipoMercado] = useState<"Tradicional" | "Cripto">("Tradicional");
  const [formDolarCripto, setFormDolarCripto] = useState("1.200,00");
  const [basePriceCripto, setBasePriceCripto] = useState("");`;

if (content.includes(oldStateDefs)) {
    // 1. Remove the old definitions
    content = content.replace(oldStateDefs, "");
    
    // 2. Insert before formStateLoc
    const replacement = stateDefinitionsStart + '\n\n' + formStateLoc;
    content = content.replace(formStateLoc, replacement);
    
    fs.writeFileSync(file, content);
    console.log("Success");
} else {
    console.error("State definitions not found");
}

