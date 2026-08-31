const fs = require('fs');

const content = fs.readFileSync('src/components/CotizacionesCriptoTable.tsx', 'utf-8');

const importLine = `import { initialCotizacionesCripto } from "../data/initialCotizacionesCripto";\n`;

let updatedContent = content;

if (!updatedContent.includes('import { initialCotizacionesCripto }')) {
  updatedContent = importLine + updatedContent;
}

const oldCode1 = `       import("../data/initialCotizacionesCripto").then(({ initialCotizacionesCripto }) => {
          setCotizaciones(prev => prev.map(c => {
             if (c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png') {
                 const correct = initialCotizacionesCripto.find(i => i.id === c.id);
                 return correct ? { ...c, image: correct.image } : c;
             }
             return c;
          }));
       });`;

const newCode1 = `       setCotizaciones(prev => prev.map(c => {
             if (c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png') {
                 const correct = initialCotizacionesCripto.find(i => i.id === c.id);
                 return correct ? { ...c, image: correct.image } : c;
             }
             return c;
       }));`;

updatedContent = updatedContent.replace(oldCode1, newCode1);

const oldCode2 = `        // Ensure any remaining old ones get fallbacks if they have no image
        return merged.map(c => {
          if (!c.image || (c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png')) {
             return { ...c, image: undefined }; // keep undefined so it can be fixed by the other effect, or we let them be missing
          }
          return c;
        });`;

const newCode2 = `        // Ensure any remaining old ones get fallbacks if they have no image
        return merged.map(c => {
          if (!c.image || (c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png')) {
             const correct = initialCotizacionesCripto.find(i => i.id === c.id);
             return correct && correct.image ? { ...c, image: correct.image } : { ...c, image: undefined };
          }
          return c;
        });`;

updatedContent = updatedContent.replace(oldCode2, newCode2);

fs.writeFileSync('src/components/CotizacionesCriptoTable.tsx', updatedContent);
