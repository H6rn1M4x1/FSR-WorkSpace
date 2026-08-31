const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `          } else {
            console.error("Error cargando el respaldo: ", result.error);
            setDriveStatusMessage("Error al cargar datos desde Drive.");
          }`;

const replacementStr = `          } else {
            if (result.error && typeof result.error === 'string' && result.error.toLowerCase().includes('credenciales')) {
              // Silenced by user request
              setDriveStatusMessage("Google Drive no conectado.");
            } else {
              console.error("Error cargando el respaldo: ", result.error);
              setDriveStatusMessage("Error al cargar datos desde Drive.");
            }
          }`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx");
