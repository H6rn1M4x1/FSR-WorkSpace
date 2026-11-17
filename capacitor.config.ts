import type { CapacitorConfig } from "@capacitor/cli";

// App empaquetada para Android (y eventualmente iOS) a partir del mismo build web (dist/) que
// despliega Netlify — ver src/lib/apiBase.ts para el detalle de por qué las llamadas a las
// funciones de Netlify necesitan la URL absoluta del sitio acá adentro.
const config: CapacitorConfig = {
  appId: "com.fsrworkspace.app",
  appName: "FSR Workspace",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Capacitor 8 trae su propio plugin nativo SystemBars que, por defecto ("css"), acolchona
    // el WebView lejos de la barra de estado y la de gestos y pinta ese hueco con el fondo gris
    // del tema Android — "native" deja que el WebView (y su fondo animado) se extienda debajo de
    // ambas barras de verdad, confiando en env(safe-area-inset-*) (ya usado en la app) en vez de
    // las variables CSS propias que inyecta el modo "css".
    SystemBars: {
      insetsHandling: "native",
    },
  },
};

export default config;
