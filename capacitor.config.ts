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
};

export default config;
