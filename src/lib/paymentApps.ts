import type { InstalledApp } from "./paymentListenerPlugin";

/**
 * Catálogo liviano SOLO para agrupar y pre-sugerir apps en el selector — nunca para
 * identificarlas. El selector siempre lista las apps reales del dispositivo (nombre visible y
 * paquete que da el propio Android, ver listInstalledApps en paymentListenerPlugin.ts); no hay
 * ningún nombre de paquete adivinado acá, alcanza con reconocer el nombre visible de la app.
 */

export type PaymentAppGroup = "Bancos" | "Billeteras y Fintech" | "Exchanges de cripto" | "Otras";

const CATALOG: Array<{ keywords: string[]; group: PaymentAppGroup }> = [
  { keywords: ["santander"], group: "Bancos" },
  { keywords: ["bbva"], group: "Bancos" },
  { keywords: ["hipotecario"], group: "Bancos" },
  { keywords: ["naranja"], group: "Bancos" },
  { keywords: ["brubank"], group: "Bancos" },
  { keywords: ["modo"], group: "Billeteras y Fintech" },
  { keywords: ["mercado pago", "mercadopago"], group: "Billeteras y Fintech" },
  { keywords: ["ualá", "uala"], group: "Billeteras y Fintech" },
  { keywords: ["lemon"], group: "Billeteras y Fintech" },
  { keywords: ["astropay"], group: "Billeteras y Fintech" },
  { keywords: ["google pay", "google wallet", "wallet"], group: "Billeteras y Fintech" },
  { keywords: ["paypal"], group: "Billeteras y Fintech" },
  { keywords: ["go cuotas"], group: "Billeteras y Fintech" },
  { keywords: ["lb finanzas"], group: "Billeteras y Fintech" },
  { keywords: ["binance"], group: "Exchanges de cripto" },
  { keywords: ["nexo"], group: "Exchanges de cripto" },
  { keywords: ["okx"], group: "Exchanges de cripto" },
  { keywords: ["coinex"], group: "Exchanges de cripto" },
  { keywords: ["pionex"], group: "Exchanges de cripto" },
  { keywords: ["mexc"], group: "Exchanges de cripto" },
  { keywords: ["bybit"], group: "Exchanges de cripto" },
  { keywords: ["bitso"], group: "Exchanges de cripto" },
  { keywords: ["ripio"], group: "Exchanges de cripto" },
  { keywords: ["belo"], group: "Exchanges de cripto" },
];

export function categorizeAppLabel(label: string): PaymentAppGroup {
  const lower = (label || "").toLowerCase();
  for (const entry of CATALOG) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.group;
  }
  return "Otras";
}

/** true si el nombre visible de la app coincide con alguna de las que el usuario pidió seguir — se usa para pre-tildarla en el selector. */
export function isSuggestedApp(label: string): boolean {
  const lower = (label || "").toLowerCase();
  return CATALOG.some((entry) => entry.keywords.some((kw) => lower.includes(kw)));
}

const LABELS_CACHE_KEY = "payment_listener_app_labels";

/** Guarda {paquete -> nombre visible} de las apps elegidas, para poder mostrar un "metodo" legible en los gastos auto-detectados sin tener que volver a consultar Android. */
export function cacheMonitoredAppLabels(apps: InstalledApp[]): void {
  try {
    const map: Record<string, string> = {};
    apps.forEach((app) => {
      map[app.packageName] = app.label;
    });
    localStorage.setItem(LABELS_CACHE_KEY, JSON.stringify(map));
  } catch (_) {
    // localStorage no disponible — simplemente no habrá nombre bonito, se usa el paquete crudo.
  }
}

export function getCachedAppLabel(packageName: string): string {
  try {
    const raw = localStorage.getItem(LABELS_CACHE_KEY);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, string>;
      if (map[packageName]) return map[packageName];
    }
  } catch (_) {}
  return packageName;
}
