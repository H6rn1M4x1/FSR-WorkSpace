const fs = require('fs');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// 1. Load Alimentos from src/data/initialAlimentos.ts
console.log("Loading initialAlimentos.ts...");
let initialAlimentos = [];
try {
  const alimentosContent = fs.readFileSync('./src/data/initialAlimentos.ts', 'utf8');
  const jsonMatch = alimentosContent.match(/export const initialAlimentos: AlimentoItem\[\] = (\[[\s\S]*?\]);/);
  if (jsonMatch) {
    initialAlimentos = eval(jsonMatch[1]);
    console.log(`Successfully loaded ${initialAlimentos.length} alimentos for lookup.`);
  } else {
    console.warn("Could not parse initialAlimentos array using regex. Trying alternative pattern...");
    const jsonMatchAlt = alimentosContent.match(/export const initialAlimentos\s*=\s*(\[[\s\S]*?\]);/);
    if (jsonMatchAlt) {
      initialAlimentos = eval(jsonMatchAlt[1]);
      console.log(`Successfully loaded ${initialAlimentos.length} alimentos using alternative pattern.`);
    } else {
      console.error("Failed to find initialAlimentos array.");
      process.exit(1);
    }
  }
} catch (err) {
  console.error("Error reading initialAlimentos.ts:", err);
  process.exit(1);
}

// Helper to find Alimento ID by name
function findAlimentoId(name) {
  if (!name) return undefined;
  const cleanName = name.trim().toLowerCase();
  if (!cleanName) return undefined;

  // 1. Case-insensitive exact match
  let found = initialAlimentos.find(a => a.mercaderiaName.trim().toLowerCase() === cleanName);
  if (found) return found.id;

  // 2. Partial match (starts with or contains)
  found = initialAlimentos.find(a => a.mercaderiaName.trim().toLowerCase().includes(cleanName) || cleanName.includes(a.mercaderiaName.trim().toLowerCase()));
  if (found) return found.id;

  return undefined;
}

// 2. Read platos_data.csv
const csvPath = './platos_data.csv';
if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found at ${csvPath}. Please create this file with your platos CSV data.`);
  process.exit(1);
}

console.log(`Parsing ${csvPath}...`);
const fileContent = fs.readFileSync(csvPath, 'utf8');
const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

if (lines.length < 2) {
  console.error("CSV file is empty or does not have enough rows (header + at least one data row).");
  process.exit(1);
}

// Identify headers and their indices
const headers = parseCSVLine(lines[0]);
console.log("CSV Headers identified:", headers);

let platoIndex = -1;
let carneIndex = -1;
let verduraIndex = -1;
let mercaderiaIndex = -1;

headers.forEach((header, idx) => {
  const hLower = header.toLowerCase();
  if (hLower === 'plato' || hLower === 'nombre del plato' || hLower === 'nombre') {
    platoIndex = idx;
  } else if (hLower.includes('carne') && (hLower.includes('alimento') || hLower.includes('carne'))) {
    carneIndex = idx;
  } else if (hLower.includes('verdura') && (hLower.includes('alimento') || hLower.includes('verdura'))) {
    verduraIndex = idx;
  } else if (hLower.includes('mercaderia') || hLower.includes('mercadería')) {
    mercaderiaIndex = idx;
  }
});

// Fallback to defaults if headers don't match exactly
if (platoIndex === -1) platoIndex = 0;
if (carneIndex === -1) carneIndex = 1;
if (verduraIndex === -1) verduraIndex = 3;
if (mercaderiaIndex === -1) mercaderiaIndex = 5;

console.log(`Mapping columns:
  - Plato Name: Column ${platoIndex}
  - Alimento Carne: Column ${carneIndex}
  - Alimento Verduras: Column ${verduraIndex}
  - Alimento Mercaderia: Column ${mercaderiaIndex}
`);

const newPlatos = [];
const seenPlatoNames = new Set();
let platoCounter = 1;

// Parse data rows
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  if (row.length === 0 || !row[platoIndex]) continue;

  const rawPlatoName = row[platoIndex].trim();
  if (!rawPlatoName) continue;

  // Deduplicate exact matches on Plato Name
  const platoKey = rawPlatoName.toLowerCase();
  if (seenPlatoNames.has(platoKey)) {
    continue;
  }
  seenPlatoNames.add(platoKey);

  const rawCarne = row[carneIndex];
  const rawVerdura = row[verduraIndex];
  const rawMercaderia = row[mercaderiaIndex];

  const alimentoId1 = findAlimentoId(rawCarne);
  const alimentoId2 = findAlimentoId(rawVerdura);
  const alimentoId3 = findAlimentoId(rawMercaderia);

  newPlatos.push({
    id: `pla-${platoCounter++}`,
    nombrePlato: rawPlatoName,
    alimentoId1: alimentoId1 || undefined,
    alimentoId2: alimentoId2 || undefined,
    alimentoId3: alimentoId3 || undefined
  });
}

console.log(`Processed ${newPlatos.length} unique platos.`);

// 3. Write back to src/data/initialPlatos.ts
const platosCode = `import { PlatoItem } from "../types";

export const initialPlatos: PlatoItem[] = ${JSON.stringify(newPlatos, null, 2)};
`;

fs.writeFileSync('./src/data/initialPlatos.ts', platosCode, 'utf8');
console.log("Successfully wrote imported platos to src/data/initialPlatos.ts!");
