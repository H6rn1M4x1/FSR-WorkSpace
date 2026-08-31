const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. save CompleteBackupToDrive
let target1 = `      console.error("Error saving backup to Drive:", err);`;
let rep1 = `      if (err && err.message && err.message.toLowerCase().includes('credenciales')) {
        // Silenced
      } else {
        console.error("Error saving backup to Drive:", err);
      }`;
content = content.replace(target1, rep1);

// 2. loadCompleteBackupFromDrive
let target2 = `      console.error("Error loading backup from Drive:", err);`;
let rep2 = `      if (err && err.message && err.message.toLowerCase().includes('credenciales')) {
        // Silenced
      } else {
        console.error("Error loading backup from Drive:", err);
      }`;
content = content.replace(target2, rep2);

// 3. silent load
let target3 = `          console.error("Error doing initial silent load from Drive:", e);`;
let rep3 = `          if (e && e.message && e.message.toLowerCase().includes('credenciales')) {
            // Silenced
          } else {
            console.error("Error doing initial silent load from Drive:", e);
          }`;
content = content.replace(target3, rep3);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched other console errors");
