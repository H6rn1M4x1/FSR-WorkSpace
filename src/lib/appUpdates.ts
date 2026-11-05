import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

// Inyectada por vite.config.ts desde package.json#version — bumpear ahí antes de cada build de
// Android/Windows para que esta comparación tenga sentido.
export const APP_VERSION = __APP_VERSION__;

// Mismo sitio que ya sirve el resto de la web — ver public/downloads/version.json, que hay que
// actualizar a mano en cada release (ver también electron:build:win, que sube el instalador y el
// latest.yml de electron-updater a public/downloads/win/ para el Electron de Windows).
const VERSION_CHECK_URL = "https://fsrworkspace.netlify.app/downloads/version.json";

interface RemoteVersionInfo {
  version: string;
  apkUrl?: string;
}

function isNewerVersion(remote: string, current: string): boolean {
  const toParts = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const r = toParts(remote);
  const c = toParts(current);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    if ((r[i] ?? 0) !== (c[i] ?? 0)) return (r[i] ?? 0) > (c[i] ?? 0);
  }
  return false;
}

export type AndroidUpdateCheckResult =
  | { status: "up-to-date" }
  | { status: "update-available"; version: string }
  | { status: "error"; message: string };

// Android no tiene forma de autoactualizarse sin pasar por Play Store — esto compara contra
// version.json y, si hay una versión nueva, abre el navegador in-app apuntando directo al .apk:
// Android lo baja con su Administrador de Descargas de siempre, y el usuario lo instala tocando
// la notificación de descarga completada (el instalador de paquetes del sistema se encarga solo,
// sin permisos extra de nuestro lado).
export async function checkForAndroidUpdate(): Promise<AndroidUpdateCheckResult> {
  try {
    const res = await fetch(VERSION_CHECK_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info: RemoteVersionInfo = await res.json();
    if (info.version && isNewerVersion(info.version, APP_VERSION)) {
      if (info.apkUrl) {
        await Browser.open({ url: info.apkUrl });
      }
      return { status: "update-available", version: info.version };
    }
    return { status: "up-to-date" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }
}

export function isRunningInElectron(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { FSR_ELECTRON?: boolean }).FSR_ELECTRON);
}

export function isRunningInCapacitor(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Tipo de la ventana puente que preload.cjs expone en Electron (ver electron/preload.cjs).
export interface ElectronUpdatesBridge {
  getVersion: () => Promise<string>;
  check: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  onStatus: (callback: (data: { status: string; version?: string; percent?: number; message?: string }) => void) => () => void;
}

export function getElectronUpdatesBridge(): ElectronUpdatesBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { FSR_ELECTRON_UPDATES?: ElectronUpdatesBridge }).FSR_ELECTRON_UPDATES ?? null;
}
