import { Capacitor } from "@capacitor/core";

// Dominio real donde Netlify sirve las funciones serverless (netlify/functions/*) — el mismo
// sitio al que apunta siteId 06d76105-f745-48f4-bd23-4fe0dfc0db85.
const NETLIFY_ORIGIN = "https://fsrworkspace.netlify.app";

// En la web, el navegador ya está parado en ese mismo dominio, así que una ruta relativa
// ("/.netlify/functions/x") alcanza. Pero la app de Android (Capacitor sirve el bundle desde un
// origen local propio) y la de Windows (Electron la sirve vía electron-serve) NO están paradas en
// ese dominio, así que ahí hace falta anteponer la URL completa de Netlify o el fetch no
// encuentra nada.
function isPackagedApp(): boolean {
  if (typeof window !== "undefined" && (window as unknown as { FSR_ELECTRON?: boolean }).FSR_ELECTRON) {
    return true;
  }
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Envolver cada fetch("/.netlify/functions/...") con netlifyFn(...) en vez de tipear la ruta
// relativa a mano, para que ande igual en la web, en el APK y en el exe de Windows.
export function netlifyFn(path: string): string {
  return isPackagedApp() ? `${NETLIFY_ORIGIN}${path}` : path;
}
