const fs = require('fs');

const content = fs.readFileSync('src/components/CotizacionesCriptoTable.tsx', 'utf-8');

const oldCode = `      setCotizaciones(newData);`;
const newCode = `      setCotizaciones((prev) => {
        const merged = [...prev];
        for (const newItem of newData) {
          const idx = merged.findIndex(c => c.id === newItem.id);
          if (idx !== -1) {
            merged[idx] = { ...merged[idx], ...newItem, image: newItem.image || merged[idx].image };
          } else {
            merged.push(newItem);
          }
        }
        
        // Ensure any remaining old ones get fallbacks if they have no image
        return merged.map(c => {
          if (!c.image) {
             const defaultIcon = \`https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png\`;
             return { ...c, image: defaultIcon };
          }
          return c;
        });
      });`;

const updatedContent = content.replace(oldCode, newCode);
fs.writeFileSync('src/components/CotizacionesCriptoTable.tsx', updatedContent);
