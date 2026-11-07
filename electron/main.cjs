const { app, BrowserWindow, shell, ipcMain, Tray, Menu, screen, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
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
const DOCK_DEFAULT_SIZE = { width: 200, height: 40 };

// En qué monitor va el dock (punto 6 pedido por el usuario) — se guarda en un JSON propio en vez
// de depender de localStorage (eso vive del lado del renderer, y acá hace falta leerlo ANTES de
// crear la ventana, desde el proceso principal). getPath() necesita que la app ya esté lista, así
// que la ruta se arma recién cuando hace falta en vez de una sola vez al cargar el archivo.
function getDockPrefsPath() {
  return path.join(app.getPath("userData"), "dock-prefs.json");
}

function readDockPrefs() {
  try {
    return JSON.parse(fs.readFileSync(getDockPrefsPath(), "utf-8"));
  } catch {
    return {};
  }
}

function writeDockPrefs(prefs) {
  try {
    const prefsPath = getDockPrefsPath();
    fs.mkdirSync(path.dirname(prefsPath), { recursive: true });
    fs.writeFileSync(prefsPath, JSON.stringify(prefs));
  } catch {
    // Si no se pudo guardar, el dock simplemente vuelve al monitor principal la próxima vez —
    // no es crítico como para interrumpir nada.
  }
}

function getDockDisplay() {
  const prefs = readDockPrefs();
  const displays = screen.getAllDisplays();
  const found = prefs.displayId ? displays.find((d) => d.id === prefs.displayId) : null;
  return found || screen.getPrimaryDisplay();
}

// y=0 (pegado al borde superior) cuando está colapsado — como la "pestaña" de Troko, que cuelga
// justo del borde de la pantalla — y con un margen cuando está expandido, como una tarjeta propia
// que flota debajo (ver DockApp.tsx).
function positionDockWindow(win, width, height, collapsed) {
  const display = getDockDisplay();
  const { x: areaX, y: areaY, width: areaWidth } = display.workArea;
  const x = Math.round(areaX + (areaWidth - width) / 2);
  const y = areaY + (collapsed ? 0 : 12);
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
  positionDockWindow(dockWindow, DOCK_DEFAULT_SIZE.width, DOCK_DEFAULT_SIZE.height, true);
  dockWindow.loadURL("app://-/?mode=dock");

  dockWindow.on("closed", () => {
    dockWindow = undefined;
  });
}

// Esconde el dock cuando la propia ventana principal está maximizada y enfocada (ahí ya estás
// mirando toda esa misma data a pantalla completa, el dock solo taparía algo). Dejamos pendiente
// detectar OTRAS apps por encima (punto 5 pedido): hacerlo bien requeriría un módulo nativo para
// consultar qué ventana del sistema operativo está realmente arriba, que no agregamos todavía
// para no sumarle riesgo al empaquetado — ver la respuesta al usuario.
function updateDockAutoHide() {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  const shouldHide = Boolean(
    mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && mainWindow.isMaximized() && mainWindow.isFocused()
  );
  if (shouldHide) {
    dockWindow.hide();
  } else if (!dockWindow.isVisible()) {
    dockWindow.showInactive();
  }
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
    positionDockWindow(dockWindow, size.width, size.height, Boolean(size.collapsed));
  }
});

ipcMain.on("dock-open-main", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Selector de monitor (punto 6 pedido por el usuario) — el dock pide la lista y manda el id
// elegido; acá se persiste y se reposiciona ya mismo con el tamaño que la ventana tenga en ese
// momento (si está colapsada o expandida).
ipcMain.handle("dock-get-displays", () => {
  const prefs = readDockPrefs();
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: `Monitor ${i + 1}${d.id === screen.getPrimaryDisplay().id ? " (principal)" : ""}`,
    selected: prefs.displayId ? d.id === prefs.displayId : d.id === screen.getPrimaryDisplay().id,
  }));
});

ipcMain.on("dock-set-display", (_event, displayId) => {
  writeDockPrefs({ ...readDockPrefs(), displayId });
  if (dockWindow && !dockWindow.isDestroyed()) {
    const bounds = dockWindow.getBounds();
    const collapsed = bounds.height <= DOCK_DEFAULT_SIZE.height;
    positionDockWindow(dockWindow, bounds.width, bounds.height, collapsed);
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

  ["maximize", "unmaximize", "focus", "blur", "show", "hide", "minimize", "restore"].forEach((ev) =>
    mainWindow.on(ev, updateDockAutoHide)
  );

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
