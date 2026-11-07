const { app, BrowserWindow, shell, ipcMain, Tray, Menu, screen, nativeImage, session } = require("electron");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
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

// Siempre pegado al borde superior (y=0), colapsado o expandido — el panel expandido es "el dock
// cerrado, pero más grande", no una tarjeta aparte flotando con un margen debajo (ver DockApp.tsx).
function positionDockWindow(win, width, height) {
  const display = getDockDisplay();
  const { x: areaX, y: areaY, width: areaWidth } = display.workArea;
  const x = Math.round(areaX + (areaWidth - width) / 2);
  win.setBounds({ x, y: areaY, width, height }, true);
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

// Esconde el dock SOLO cuando hay algo en pantalla completa de verdad (punto 1 pedido) — no ya con
// cualquier ventana maximizada tapándolo de refilón, como antes.
//
// Hace falta preguntarle al sistema operativo qué ventana está realmente arriba y si ocupa el
// monitor entero — nada de esto lo sabe Electron solo. Se evaluó usar el paquete "active-win"
// (npm), pero es un complemento nativo (N-API) que: (1) es ESM puro, (2) descarga un binario
// prearmado DISTINTO por plataforma durante el install, así que el que se bajó acá (Linux) no
// sirve para el instalador de Windows, y habría que resolver ese binario de Windows aparte sin
// poder probar que arranca en un Windows real desde este entorno, y (3) trae ~114 paquetes
// transitivos con vulnerabilidades conocidas. Se descartó por ese riesgo de romper el empaquetado
// sin forma de verificarlo acá. En su lugar, esto usa PowerShell (ya viene con Windows, cero
// dependencias nuevas) para llamar a GetForegroundWindow/GetWindowRect de la API de Windows —
// mismo resultado, sin agregar nada al paquete.
const FOREGROUND_PROBE_SCRIPT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class FsrForegroundProbe {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
$h = [FsrForegroundProbe]::GetForegroundWindow()
$r = New-Object FsrForegroundProbe+RECT
[FsrForegroundProbe]::GetWindowRect($h, [ref]$r) | Out-Null
$min = [FsrForegroundProbe]::IsIconic($h)
Write-Output "$($r.Left),$($r.Top),$($r.Right),$($r.Bottom),$min"
`.trim();

// Si lo último que se sabe es que hay algo en pantalla completa tapando el monitor del dock.
// Arranca en false (nunca se asume tapado hasta que el sondeo diga lo contrario).
let fullscreenCovered = false;
let foregroundProbeTimer = null;
// Si el dock está revelado "a la fuerza" porque el usuario acercó el mouse al borde mientras algo
// estaba en pantalla completa (punto 1.1 pedido).
let dockRevealedOverFullscreen = false;
// Para no repetir llamadas idénticas a setOpacity/setIgnoreMouseEvents en cada tick.
let dockCurrentlyVisible = true;
// Hasta cuándo hay que mostrar el dock a la fuerza por una notificación nueva (punto 2 pedido,
// round 6), sin importar qué haya en pantalla completa tapándolo ni dónde esté el mouse — ver
// dock-notify más abajo. 0 = no hay ninguna notificación forzando nada ahora mismo.
let notifyForceVisibleUntil = 0;

function rectCoversDisplay(winRect, displayBounds) {
  const TOLERANCE = 2; // algunas apps dejan 1-2px de diferencia por el borde/sombra de la ventana
  return (
    winRect.left <= displayBounds.x + TOLERANCE &&
    winRect.top <= displayBounds.y + TOLERANCE &&
    winRect.right >= displayBounds.x + displayBounds.width - TOLERANCE &&
    winRect.bottom >= displayBounds.y + displayBounds.height - TOLERANCE
  );
}

function pointInRect(x, y, r) {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function applyDockVisibility(visible) {
  if (!dockWindow || dockWindow.isDestroyed() || dockCurrentlyVisible === visible) return;
  dockCurrentlyVisible = visible;
  dockWindow.setIgnoreMouseEvents(!visible, { forward: true });
  dockWindow.setOpacity(visible ? 1 : 0);
}

// Sondeo liviano (sin spawnear nada) de la posición del mouse — decide si hay que revelar el dock
// por encima de una app en pantalla completa (punto 1.1) o volver a esconderlo al alejar el mouse.
// Corre siempre (no solo cuando hay algo en pantalla completa) porque también es lo que restaura
// la visibilidad normal apenas "fullscreenCovered" vuelve a false.
function tickDockVisibility() {
  if (!dockWindow || dockWindow.isDestroyed()) return;

  // Una notificación nueva fuerza el dock visible un rato, pase lo que pase en pantalla y esté
  // donde esté el mouse (punto 2 pedido, round 6) — se evalúa antes que cualquier otra regla.
  if (Date.now() < notifyForceVisibleUntil) {
    dockRevealedOverFullscreen = true;
    applyDockVisibility(true);
    return;
  }

  if (!fullscreenCovered) {
    dockRevealedOverFullscreen = false;
    applyDockVisibility(true);
    return;
  }

  const cursor = screen.getCursorScreenPoint();

  if (!dockRevealedOverFullscreen) {
    // Franja sensible pegada al borde superior, del ancho del dock colapsado — alcanza con
    // acercar el mouse ahí (aunque el dock esté invisible) para que vuelva a aparecer.
    const display = getDockDisplay();
    const hotLeft = Math.round(display.workArea.x + (display.workArea.width - DOCK_DEFAULT_SIZE.width) / 2);
    const hotRect = { left: hotLeft, top: display.workArea.y, right: hotLeft + DOCK_DEFAULT_SIZE.width, bottom: display.workArea.y + 4 };
    if (pointInRect(cursor.x, cursor.y, hotRect)) {
      dockRevealedOverFullscreen = true;
      applyDockVisibility(true);
    } else {
      applyDockVisibility(false);
    }
  } else {
    // Ya revelado: se mantiene mientras el mouse siga cerca (con margen, para no parpadear apenas
    // se sale un pixel) — al alejarse de verdad, vuelve a esconderse.
    const b = dockWindow.getBounds();
    const margin = 24;
    const buffered = { left: b.x - margin, top: b.y - margin, right: b.x + b.width + margin, bottom: b.y + b.height + margin };
    if (pointInRect(cursor.x, cursor.y, buffered)) {
      applyDockVisibility(true);
    } else {
      dockRevealedOverFullscreen = false;
      applyDockVisibility(false);
    }
  }
}

// Solo tiene sentido en Windows — en otras plataformas no hay PowerShell, y de todos modos el
// instalador que se distribuye es exclusivamente para Windows.
function startForegroundWindowWatcher() {
  if (process.platform !== "win32") return;

  const poll = () => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", FOREGROUND_PROBE_SCRIPT],
      { windowsHide: true, timeout: 3000 },
      (err, stdout) => {
        if (!err && stdout && dockWindow && !dockWindow.isDestroyed()) {
          try {
            const [left, top, right, bottom, minStr] = stdout.trim().split(",");
            const minimized = minStr.trim().toLowerCase() === "true";
            const display = getDockDisplay();
            fullscreenCovered =
              !minimized &&
              rectCoversDisplay({ left: Number(left), top: Number(top), right: Number(right), bottom: Number(bottom) }, display.bounds);
          } catch {
            // Salida inesperada — se ignora este sondeo, se mantiene el último estado conocido.
          }
        }
        // Encadenado (no setInterval a secas): así, si una corrida tarda más de lo normal, no se
        // amontonan procesos de powershell.exe uno atrás del otro.
        foregroundProbeTimer = setTimeout(poll, 2500);
      }
    );
  };

  poll();
  // Más seguido que el sondeo de PowerShell (que es el que solo importa cada 2.5s) porque el
  // movimiento del mouse para revelar/esconder el dock tiene que sentirse inmediato.
  setInterval(tickDockVisibility, 150);
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
    // Punto 2 pedido (round 6): la notificación tiene que verse aunque el dock esté escondido por
    // algo en pantalla completa en ese momento — se fuerza visible un rato (más que lo que tarda
    // el aviso chico del lado del renderer en cerrarse solo, ver NOTIF_TOAST_MS en DockApp.tsx,
    // para no esconderlo de golpe mientras todavía se está mostrando).
    notifyForceVisibleUntil = Date.now() + 8000;
    dockRevealedOverFullscreen = true;
    applyDockVisibility(true);
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

// "Agregar" y "editar" desde el dock (puntos 3 y 5 pedidos): en vez de reconstruir los formularios
// de cada sección adentro del dock (con su propia lógica de guardado/sincronización), esto reusa
// el mecanismo que YA existe en App.tsx para el botón "Agendar"/lápiz de Inicio
// (handleQuickAdd/handleQuickEdit) — el dock solo le pide a la ventana principal que lo dispare.
// Así cualquier alta/edición hecha desde el dock pasa por el mismo guardado/sync de siempre, y se
// ve igual en la app, la web y Android sin duplicar nada.
ipcMain.on("dock-quick-add", (_event, category) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("dock-quick-add", category);
  }
});

ipcMain.on("dock-quick-edit", (_event, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("dock-quick-edit", payload);
  }
});

// Tildar (Pagar/Marcar realizado/Marcar hecha) y eliminar desde la tarjeta de detalle del dock:
// a diferencia de "editar", esto NO necesita mostrar la ventana principal — es un cambio simple
// (un booleano, o sacar el registro) que la ventana oculta puede guardar por su cuenta igual que
// si lo hubiera hecho el usuario desde la app (mismo guardado/sync, ver el efecto en App.tsx).
ipcMain.on("dock-quick-toggle", (_event, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("dock-quick-toggle", payload);
  }
});

ipcMain.on("dock-quick-delete", (_event, payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("dock-quick-delete", payload);
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
    positionDockWindow(dockWindow, bounds.width, bounds.height);
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
  // El clima de "Inicio" en el dock (ver src/components/DockApp.tsx) pide la ubicación real del
  // dispositivo con navigator.geolocation — sin esto, Electron la rechaza de entrada sin ni
  // siquiera mostrar un prompt, y el clima nunca llegaría a mostrarse.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "geolocation");
  });

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
  startForegroundWindowWatcher();
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
  if (foregroundProbeTimer) clearTimeout(foregroundProbeTimer);
});

app.on("window-all-closed", () => {
  // La ventana principal ahora se esconde en vez de destruirse (ver mainWindow.on("close")), así
  // que esto en la práctica solo dispara si el dock y la bandeja no llegaron a crearse. En macOS
  // nunca se cierra sola igual, como ya era antes.
  if (process.platform !== "darwin" && app.isQuitting) app.quit();
});
