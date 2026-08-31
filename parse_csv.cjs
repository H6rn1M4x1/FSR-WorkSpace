const fs = require('fs');

// We will read src/data/initialAlimentos.ts by extracting the JSON array from it.
const alimentosContent = fs.readFileSync('./src/data/initialAlimentos.ts', 'utf8');
const jsonMatch = alimentosContent.match(/export const initialAlimentos: AlimentoItem\[\] = (\[[\s\S]*?\]);/);
if (!jsonMatch) {
  console.error("Could not find initialAlimentos in src/data/initialAlimentos.ts");
  process.exit(1);
}

const initialAlimentos = eval(jsonMatch[1]);
console.log(`Loaded ${initialAlimentos.length} initialAlimentos from file.`);

// Let's list a few foods to see their names
console.log("Sample alimentos:");
initialAlimentos.slice(0, 5).forEach(a => console.log(` - ${a.id}: ${a.mercaderiaName}`));
