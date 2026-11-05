const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const serve = require("electron-serve");
const { autoUpdater } = require("electron-updater");

// Sirve el mismo dist/ que genera "vite build" (el que también sube a Netlify) detrás de un
// protocolo local (app://-) en vez de file://, así las rutas absolutas ("/assets/...") del build
// resuelven igual que en la web real.
const loadURL = serve({ directory: path.join(__dirname, "..", "dist") });

let mainWindow;

// Busca actualizaciones contra el "generic" feed de package.json#build.publish (los archivos
// latest.yml + instalador que sube cada build a public/downloads/win/, servidos por Netlify) —
// ver electron:build:win en package.json. No instala sola: descarga y avisa, y el usuario decide
// desde Configuración cuándo reiniciar para aplicarla (quitAndInstall).
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

function sendUpdateStatus(status, extra) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("app-update-status", { status, ...extra });
  }
}

autoUpdater.on("checking-for-update", () => sendUpdateStatus("checking"));
autoUpdater.on("update-available", (info) => sendUpdateStatus("available", { version: info.version }));
autoUpdater.on("update-not-available", () => sendUpdateStatus("not-available"));
autoUpdater.on("error", (err) => sendUpdateStatus("error", { message: String(err && err.message ? err.message : err) }));
autoUpdater.on("download-progress", (p) => sendUpdateStatus("downloading", { percent: Math.round(p.percent) }));
autoUpdater.on("update-downloaded", (info) => sendUpdateStatus("downloaded", { version: info.version }));

ipcMain.handle("app-check-for-updates", () => autoUpdater.checkForUpdates().catch((err) => sendUpdateStatus("error", { message: String(err) })));
ipcMain.handle("app-quit-and-install", () => autoUpdater.quitAndInstall());
ipcMain.handle("app-get-version", () => app.getVersion());

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 500,
    backgroundColor: "#09090b",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Los links externos (ej. el popup de login de Google, o un enlace a Google Drive) se abren en
  // el navegador del sistema en vez de navegar la ventana de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  loadURL(mainWindow);
}

app.whenReady().then(() => {
  createWindow();
  // Chequeo silencioso al arrancar — si hay algo nuevo, se descarga solo y queda esperando a que
  // el usuario confirme el reinicio desde Configuración (ver app-update-status en preload.cjs).
  autoUpdater.checkForUpdates().catch(() => {});

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
