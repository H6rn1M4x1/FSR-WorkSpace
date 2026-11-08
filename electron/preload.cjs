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

// Puente del dock flotante (ver electron/main.cjs) — queda expuesto en AMBAS ventanas (la
// principal y la del dock), ya que las dos cargan el mismo preload. Cada lado usa solo la mitad
// que le sirve: la ventana principal empuja (pushSnapshot/notify) lo que el dock se limita a
// escuchar (onSnapshot/onNotify) y a usar para pedir resize/abrir la ventana principal.
contextBridge.exposeInMainWorld("FSR_ELECTRON_DOCK", {
  // Usado por la ventana principal (src/App.tsx) para mandarle al dock un resumen de pagos,
  // turnos, salud y académico cada vez que esa data cambia.
  pushSnapshot: (snapshot) => ipcRenderer.send("dock-snapshot", snapshot),
  // Usado por la ventana principal (src/services/notificationService.ts) para que una notificación
  // de la agenda termine en el dock en vez de en una notificación nativa de Windows.
  notify: (payload) => ipcRenderer.send("dock-notify", payload),
  // Usado por el dock (src/components/DockApp.tsx) para avisarle al proceso principal su tamaño
  // real (colapsado vs. expandido), ya que al ser una ventana sin bordes el contenido tiene que
  // coincidir exactamente con el tamaño de la ventana.
  resize: (size) => ipcRenderer.send("dock-resize", size),
  // Usado por el dock para mostrar la ventana principal (botón "Abrir app completa").
  openMain: () => ipcRenderer.send("dock-open-main"),
  // Selector de monitor del dock (ver electron/main.cjs).
  getDisplays: () => ipcRenderer.invoke("dock-get-displays"),
  setDisplay: (displayId) => ipcRenderer.send("dock-set-display", displayId),
  // Usado por el dock para "agregar"/"editar" (ver el comentario de dock-quick-add/dock-quick-edit
  // en electron/main.cjs) — category es una de las claves de QUICK_ADD_TARGETS en App.tsx.
  quickAdd: (category) => ipcRenderer.send("dock-quick-add", category),
  quickEdit: (category, itemId) => ipcRenderer.send("dock-quick-edit", { category, itemId }),
  // Tildar (Pagar/Marcar realizado/Marcar hecha) y eliminar en el momento, sin pasar por la app —
  // kind es uno de los DockItemKind de src/lib/dockSnapshot.ts.
  quickToggle: (kind, itemId) => ipcRenderer.send("dock-quick-toggle", { kind, itemId }),
  quickDelete: (kind, itemId) => ipcRenderer.send("dock-quick-delete", { kind, itemId }),
  // "Now Playing" de todo Windows (punto 2 pedido, round 11) — play/pausa/siguiente/anterior de
  // lo que esté sonando en cualquier app, vía PowerShell/WinRT (ver electron/main.cjs).
  mediaControl: (action) => ipcRenderer.send("dock-media-control", action),
  onSnapshot: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on("dock-snapshot", listener);
    return () => ipcRenderer.removeListener("dock-snapshot", listener);
  },
  onNotify: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dock-notify", listener);
    return () => ipcRenderer.removeListener("dock-notify", listener);
  },
  // Usado por el dock para enterarse de que electron/main.cjs lo mostró/escondió de golpe por el
  // mecanismo de pantalla completa (punto 3.1 pedido, round 9) — el renderer no tiene forma propia
  // de saber esto (lo decide el proceso principal solo, según lo que haya en pantalla), pero es el
  // único lado que puede reproducir sonido.
  onVisibilityChange: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dock-visibility-changed", listener);
    return () => ipcRenderer.removeListener("dock-visibility-changed", listener);
  },
  onMediaUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dock-media-update", listener);
    return () => ipcRenderer.removeListener("dock-media-update", listener);
  },
  // Bloq Mayús/Bloq Num y batería (punto 3 pedido, round 12, bloque 1 de Dynamic Island) — ver
  // electron/main.cjs (FOREGROUND_PROBE_SCRIPT y BATTERY_PROBE_SCRIPT).
  onKeyLockUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dock-keylock-update", listener);
    return () => ipcRenderer.removeListener("dock-keylock-update", listener);
  },
  onBatteryUpdate: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dock-battery-update", listener);
    return () => ipcRenderer.removeListener("dock-battery-update", listener);
  },
  // Usado por la ventana principal (src/App.tsx) para enterarse de que el dock pidió abrir el
  // formulario de alta/edición de una categoría — ver dock-quick-add/dock-quick-edit más arriba.
  onQuickAdd: (callback) => {
    const listener = (_event, category) => callback(category);
    ipcRenderer.on("dock-quick-add", listener);
    return () => ipcRenderer.removeListener("dock-quick-add", listener);
  },
  onQuickEdit: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dock-quick-edit", listener);
    return () => ipcRenderer.removeListener("dock-quick-edit", listener);
  },
  onQuickToggle: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dock-quick-toggle", listener);
    return () => ipcRenderer.removeListener("dock-quick-toggle", listener);
  },
  onQuickDelete: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("dock-quick-delete", listener);
    return () => ipcRenderer.removeListener("dock-quick-delete", listener);
  },
});
