import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Hace que la barra de estado (reloj/batería/red arriba) sea transparente y muestre el fondo
 * real de la app detrás en vez del scrim gris que Android dibuja por defecto en apps "edge to
 * edge" sin manejo propio de insets (enforceStatusBarContrast). El color de los íconos (claros u
 * oscuros) se ajusta según el tema real de la app (negro/blanco), no el del sistema, porque el
 * usuario elige el tema desde dentro de la app.
 */
export async function syncNativeStatusBar(darkMode: boolean) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: darkMode ? Style.Dark : Style.Light });
  } catch {
    // No-op en plataformas sin soporte (iOS no instalado, web, etc).
  }
}
