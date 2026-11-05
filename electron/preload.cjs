const { contextBridge, ipcRenderer } = require("electron");

// Expone una bandera mínima para que el código web (src/lib/apiBase.ts) sepa que corre
// empaquetado en el Electron de Windows y arme las URLs de las funciones de Netlify en absoluto.
contextBridge.exposeInMainWorld("FSR_ELECTRON", true);

// Puente para la sección de actualizaciones de Configuración — ver electron/main.cjs
// (autoUpdater) y src/lib/appUpdates.ts.
contextBridge.exposeInMainWorld("FSR_ELECTRON_UPDATES", {
  getVersion: () => ipcRenderer.invoke("app-get-version"),
  check: () => ipcRenderer.invoke("app-check-for-updates"),
  quitAndInstall: () => ipcRenderer.invoke("app-quit-and-install"),
  onStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("app-update-status", listener);
    return () => ipcRenderer.removeListener("app-update-status", listener);
  },
});
