const fs = require('fs');
const file = 'src/components/InversionesTable.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldProps = `interface InversionesTableProps {
  inversiones: Inversion[];
  setInversiones: React.Dispatch<React.SetStateAction<Inversion[]>>;
  cotizaciones?: CotizacionAccion[];
  darkMode: boolean;
  onExportSheets?: (title: string, headers: string[], rows: any[][]) => void;
}`;

const newProps = `interface InversionesTableProps {
  inversiones: Inversion[];
  setInversiones: React.Dispatch<React.SetStateAction<Inversion[]>>;
  cotizaciones?: CotizacionAccion[];
  cotizacionesCripto?: import("../types").CotizacionCripto[];
  darkMode: boolean;
  onExportSheets?: (title: string, headers: string[], rows: any[][]) => void;
}`;

content = content.replace(oldProps, newProps);

const oldFuncSig = `export default function InversionesTable({
  inversiones,
  setInversiones,
  cotizaciones = [],
  darkMode,
  onExportSheets,
}: InversionesTableProps) {`;

const newFuncSig = `export default function InversionesTable({
  inversiones,
  setInversiones,
  cotizaciones = [],
  cotizacionesCripto = [],
  darkMode,
  onExportSheets,
}: InversionesTableProps) {`;

content = content.replace(oldFuncSig, newFuncSig);
fs.writeFileSync(file, content);
