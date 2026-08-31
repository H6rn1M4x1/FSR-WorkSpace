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

function splitByCommaOutsideParentheses(str) {
  if (!str) return [];
  const parts = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts.filter(p => p.length > 0);
}

function cleanName(val) {
  if (!val) return '';
  // Remove notion links in parentheses, like (https://...)
  let cleaned = val.replace(/\s*\(https?:\/\/[^\)]+\)/gi, '').trim();
  // Remove trailing/leading quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  // Normalize double spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
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
    console.warn("Trying alternative pattern for initialAlimentos...");
    const jsonMatchAlt = alimentosContent.match(/export const initialAlimentos\s*=\s*(\[[\s\S]*?\]);/);
    if (jsonMatchAlt) {
      initialAlimentos = eval(jsonMatchAlt[1]);
      console.log(`Successfully loaded ${initialAlimentos.length} alimentos.`);
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
  const clean = name.trim().toLowerCase();
  if (!clean) return undefined;

  // 1. Exact case-insensitive match
  let found = initialAlimentos.find(a => a.mercaderiaName.trim().toLowerCase() === clean);
  if (found) return found.id;

  // 2. Exact match with normalized spaces
  const normClean = clean.replace(/\s+/g, ' ');
  found = initialAlimentos.find(a => {
    const normMerc = a.mercaderiaName.trim().toLowerCase().replace(/\s+/g, ' ');
    return normMerc === normClean;
  });
  if (found) return found.id;

  // 3. Partial match (contains or is contained in)
  found = initialAlimentos.find(a => {
    const normMerc = a.mercaderiaName.trim().toLowerCase().replace(/\s+/g, ' ');
    return normMerc.includes(normClean) || normClean.includes(normMerc);
  });
  if (found) return found.id;

  // 4. Fallback match on first word (for brands/variants like "Papa (1 Kg.)" vs "Papa")
  const firstWord = normClean.split(' ')[0];
  if (firstWord && firstWord.length > 3) {
    found = initialAlimentos.find(a => {
      const normMerc = a.mercaderiaName.trim().toLowerCase().replace(/\s+/g, ' ');
      return normMerc.includes(firstWord);
    });
    if (found) return found.id;
  }

  return undefined;
}

// 2. Read platos_raw.csv
const csvPath = './platos_raw.csv';
if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found at ${csvPath}.`);
  process.exit(1);
}

console.log(`Parsing ${csvPath}...`);
const fileContent = fs.readFileSync(csvPath, 'utf8');
const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

if (lines.length < 2) {
  console.error("CSV file is empty or does not have enough rows.");
  process.exit(1);
}

const newPlatos = [];
const seenPlatoNames = new Set();
let platoCounter = 1;

// Default column mapping
let platoIndex = 0;
let carneIndex = 1;
let verduraIndex = 3;
let mercaderiaIndex = 5;

// Process line by line, updating indices if a header line is encountered
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const row = parseCSVLine(line);
  if (row.length === 0) continue;

  const firstCell = row[0] ? row[0].toLowerCase().trim() : '';
  const isHeader = firstCell === 'plato' || firstCell === 'nombre del plato' || firstCell === 'nombre' || line.toLowerCase().includes('alimento: carne');

  if (isHeader) {
    console.log(`\nNew Header section detected at line ${i + 1}: ${line.slice(0, 100)}...`);
    row.forEach((cell, idx) => {
      const cellLower = cell.toLowerCase().trim();
      if (cellLower === 'plato' || cellLower === 'nombre del plato' || cellLower === 'nombre') {
        platoIndex = idx;
      } else if (cellLower === 'alimento: carne' || cellLower === 'alimento carne' || cellLower === 'alimento:carne') {
        carneIndex = idx;
      } else if (cellLower === 'alimento: verduras' || cellLower === 'alimento verduras' || cellLower === 'alimento:verduras') {
        verduraIndex = idx;
      } else if (cellLower === 'mercaderia' || cellLower === 'mercadería') {
        mercaderiaIndex = idx;
      }
    });
    console.log(`Column indices updated: Plato=${platoIndex}, Carne=${carneIndex}, Verduras=${verduraIndex}, Mercaderia=${mercaderiaIndex}`);
    continue;
  }

  // Parse data row
  const rawPlatoName = row[platoIndex] ? row[platoIndex].trim() : '';
  if (!rawPlatoName || rawPlatoName.toLowerCase().startsWith('plato')) continue;

  const platoKey = rawPlatoName.toLowerCase();
  if (seenPlatoNames.has(platoKey)) {
    continue; // Deduplicate
  }
  seenPlatoNames.add(platoKey);

  const rawCarne = row[carneIndex] || '';
  const rawVerdura = row[verduraIndex] || '';
  const rawMercaderia = row[mercaderiaIndex] || '';

  const itemNames = [];
  if (rawCarne) {
    splitByCommaOutsideParentheses(rawCarne).forEach(x => {
      const c = cleanName(x);
      if (c) itemNames.push(c);
    });
  }
  if (rawVerdura) {
    splitByCommaOutsideParentheses(rawVerdura).forEach(x => {
      const c = cleanName(x);
      if (c) itemNames.push(c);
    });
  }
  if (rawMercaderia) {
    splitByCommaOutsideParentheses(rawMercaderia).forEach(x => {
      const c = cleanName(x);
      if (c) itemNames.push(c);
    });
  }

  // Find corresponding Alimento IDs
  const matchedIds = [];
  for (const itemName of itemNames) {
    const aid = findAlimentoId(itemName);
    if (aid && !matchedIds.includes(aid)) {
      matchedIds.push(aid);
    } else if (!aid) {
      console.warn(`[Unmatched Alimento] "${itemName}" (from plato "${rawPlatoName}")`);
    }
  }

  newPlatos.push({
    id: `pla-${platoCounter++}`,
    nombrePlato: rawPlatoName,
    alimentoId1: matchedIds[0] || undefined,
    alimentoId2: matchedIds[1] || undefined,
    alimentoId3: matchedIds[2] || undefined
  });
}

console.log(`\nSuccessfully processed ${newPlatos.length} unique platos.`);

// 3. Write back to src/data/initialPlatos.ts
const platosCode = `import { PlatoItem } from "../types";

export const initialPlatos: PlatoItem[] = ${JSON.stringify(newPlatos, null, 2)};
`;

fs.writeFileSync('./src/data/initialPlatos.ts', platosCode, 'utf8');
console.log("Successfully wrote imported platos to src/data/initialPlatos.ts!");
