const { contextBridge } = require("electron");

// Expone una bandera mínima para que el código web (src/lib/apiBase.ts) sepa que corre
// empaquetado en el Electron de Windows y arme las URLs de las funciones de Netlify en absoluto.
contextBridge.exposeInMainWorld("FSR_ELECTRON", true);
