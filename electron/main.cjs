const { app, BrowserWindow, shell, ipcMain, Tray, Menu, screen, nativeImage } = require("electron");
const path = require("path");
// "electron-serve" es un paquete ESM puro ("type": "module") — al bundlearlo con esbuild a CJS,
// un require() directo trae el namespace del módulo (con el export default colgando de
// ".default"), no la función en sí, a diferencia de un "import serve from" en código ESM real.
const serve = require("electron-serve").default;
const { autoUpdater } = require("electron-updater");

// Sirve el mismo dist/ que genera "vite build" (el que también sube a Netlify) detrás de un
// protocolo local (app://-) en vez de file://, así las rutas absolutas ("/assets/...") del build
// resuelven igual que en la web real.
const loadURL = serve({ directory: path.join(__dirname, "..", "dist") });

let mainWindow;
let dockWindow;
let tray;

// Por default, cerrar la ventana principal (la X) la esconde en vez de cerrar la app entera —
// así el dock flotante y el ícono de la bandeja siguen vivos. Solo "Salir" del menú de la bandeja
// (o quitAndInstall de una actualización) debe cerrar todo de verdad.
app.isQuitting = false;

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
ipcMain.handle("app-quit-and-install", () => {
  app.isQuitting = true;
  autoUpdater.quitAndInstall();
});
ipcMain.handle("app-get-version", () => app.getVersion());

// ---------------------------------------------------------------------------------------------
// Dock flotante (ver src/components/DockApp.tsx, src/lib/dockSnapshot.ts y
// src/services/notificationService.ts). Es una segunda BrowserWindow, sin bordes y transparente,
// que carga la MISMA app (mismo dist/, mismo origen "app://-") con "?mode=dock" en la URL — así
// comparte sesión/localStorage con la ventana principal sin tener que duplicar el login.
// ---------------------------------------------------------------------------------------------
const DOCK_DEFAULT_SIZE = { width: 220, height: 48 };

function positionDockWindow(win, width, height) {
  const display = screen.getPrimaryDisplay();
  const { x: areaX, y: areaY, width: areaWidth } = display.workArea;
  const x = Math.round(areaX + (areaWidth - width) / 2);
  const y = areaY + 8;
  win.setBounds({ x, y, width, height }, true);
}

function createDockWindow() {
  dockWindow = new BrowserWindow({
    width: DOCK_DEFAULT_SIZE.width,
    height: DOCK_DEFAULT_SIZE.height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  dockWindow.setAlwaysOnTop(true, "screen-saver");
  positionDockWindow(dockWindow, DOCK_DEFAULT_SIZE.width, DOCK_DEFAULT_SIZE.height);
  dockWindow.loadURL("app://-/?mode=dock");

  dockWindow.on("closed", () => {
    dockWindow = undefined;
  });
}

function createTray() {
  // "dist/logo.png" (generado por scripts/generate-icons.js a partir de public/pwa-icon.svg) ya
  // viaja empaquetado dentro de "dist/**/*" (ver package.json#build.files) — no hace falta un
  // ícono aparte solo para la bandeja.
  const icon = nativeImage.createFromPath(path.join(__dirname, "..", "dist", "logo.png")).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip("FSR Workspace");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Abrir FSR Workspace",
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: "separator" },
      {
        label: "Salir",
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ])
  );
  tray.on("click", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

ipcMain.on("dock-snapshot", (_event, snapshot) => {
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send("dock-snapshot", snapshot);
  }
});

ipcMain.on("dock-notify", (_event, payload) => {
  if (dockWindow && !dockWindow.isDestroyed()) {
    dockWindow.webContents.send("dock-notify", payload);
  }
});

ipcMain.on("dock-resize", (_event, size) => {
  if (dockWindow && !dockWindow.isDestroyed() && size && size.width && size.height) {
    positionDockWindow(dockWindow, size.width, size.height);
  }
});

ipcMain.on("dock-open-main", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
});

function createMainWindow(startHidden) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 500,
    backgroundColor: "#09090b",
    autoHideMenuBar: true,
    show: !startHidden,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // La ventana principal arranca escondida (bandeja + dock) cuando Windows la abre sola al
      // inicio de sesión — sin esto Chromium le frena los setInterval/timers (como el chequeo de
      // notificaciones de HomeView, cada 60s) por no estar visible, y el dock nunca recibiría nada.
      backgroundThrottling: false,
    },
  });

  // Los links externos (ej. el popup de login de Google, o un enlace a Google Drive) se abren en
  // el navegador del sistema en vez de navegar la ventana de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Cerrar la ventana (la X) la minimiza a la bandeja en vez de cerrar la app — así el dock
  // flotante sigue recibiendo datos y notificaciones aunque la ventana principal no esté abierta.
  // Solo "Salir" desde la bandeja (o una actualización que se instala sola) cierra todo de verdad.
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  loadURL(mainWindow);
}

app.whenReady().then(() => {
  // Arranque automático con Windows: la app se relanza sola con "--dock" al iniciar sesión,
  // directo a la bandeja + dock flotante, sin mostrar la ventana principal (ver createMainWindow).
  // Solo tiene sentido en el instalador real (en desarrollo, process.execPath es el propio
  // binario de Electron, no el .exe empaquetado).
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true, path: process.execPath, args: ["--dock"] });
  }

  const loginSettings = app.getLoginItemSettings();
  const startHidden = app.isPackaged && (process.argv.includes("--dock") || loginSettings.wasOpenedAtLogin);

  createMainWindow(startHidden);
  createDockWindow();
  createTray();
  // Sin chequeo automático al arrancar por ahora: el instalador (~250MB) todavía no tiene un feed
  // real donde publicarse (ver package.json#build.publish y la Card de Configuración), así que
  // intentarlo solo generaría un error de "no encontrado" cada vez que se abre la app. El puente
  // de IPC (app-check-for-updates / app-quit-and-install) queda listo para cuando eso se resuelva.

  app.on("activate", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(false);
    }
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", () => {
  // La ventana principal ahora se esconde en vez de destruirse (ver mainWindow.on("close")), así
  // que esto en la práctica solo dispara si el dock y la bandeja no llegaron a crearse. En macOS
  // nunca se cierra sola igual, como ya era antes.
  if (process.platform !== "darwin" && app.isQuitting) app.quit();
});
