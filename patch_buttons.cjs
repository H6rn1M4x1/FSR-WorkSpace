const fs = require('fs');

function fixButton(file, btnClass) {
  let content = fs.readFileSync(file, 'utf-8');
  let regex = new RegExp(`className="${btnClass} px-4 py-2 rounded-full`);
  let newContent = content.replace(regex, `className="w-full sm:w-auto justify-center ${btnClass} px-4 py-2 rounded-full`);
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log(`Updated ${file}`);
  }
}

fixButton('src/components/CotizacionesAccionesTable.tsx', 'btn-actualizar-iol');
fixButton('src/components/CotizacionesCriptoTable.tsx', 'btn-actualizar-coingecko');

