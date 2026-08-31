const fs = require('fs');

const content = fs.readFileSync('src/components/CotizacionesCriptoTable.tsx', 'utf-8');

const oldCode1 = `    const missingImages = cotizaciones.some((c) => !c.image);
    
    if (elapsed >= thirtyMinutesMs || missingImages) {
      fetchCryptoData(false);
    }`;

const newCode1 = `    const missingImages = cotizaciones.some((c) => !c.image);
    const hasWrongFallbacks = cotizaciones.some(c => c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png');
    
    if (hasWrongFallbacks) {
       import("../data/initialCotizacionesCripto").then(({ initialCotizacionesCripto }) => {
          setCotizaciones(prev => prev.map(c => {
             if (c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png') {
                 const correct = initialCotizacionesCripto.find(i => i.id === c.id);
                 return correct ? { ...c, image: correct.image } : c;
             }
             return c;
          }));
       });
    } else if (elapsed >= thirtyMinutesMs || missingImages) {
      fetchCryptoData(false);
    }`;

const oldCode2 = `        // Ensure any remaining old ones get fallbacks if they have no image
        return merged.map(c => {
          if (!c.image) {
             const defaultIcon = \`https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png\`;
             return { ...c, image: defaultIcon };
          }
          return c;
        });`;

const newCode2 = `        // Ensure any remaining old ones get fallbacks if they have no image
        return merged.map(c => {
          if (!c.image || (c.id !== 'bitcoin' && c.image === 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png')) {
             return { ...c, image: undefined }; // keep undefined so it can be fixed by the other effect, or we let them be missing
          }
          return c;
        });`;

let updatedContent = content.replace(oldCode1, newCode1);
updatedContent = updatedContent.replace(oldCode2, newCode2);

fs.writeFileSync('src/components/CotizacionesCriptoTable.tsx', updatedContent);
