/**
 * Insignia visual (iniciales + color) para bancos y billeteras virtuales en la "billetera" de
 * Pagos Mensuales. icons.com.ar (la fuente de íconos pedida) resultó ser un sitio renderizado por
 * JS sin URLs de ícono accesibles desde un fetch estático, y el único texto legal encontrado en su
 * pie de página fue "los logos y marcas son propiedad de sus respectivos dueños" — un aviso de
 * propiedad, no una licencia de uso. Para no hotlinkear/redistribuir logos de marcas registradas
 * sin permiso claro, se usa esta insignia local (iniciales + color aproximado de marca) en su
 * lugar. Cualquier banco/billetera no listado cae en un color generado a partir del nombre, así
 * que el campo de texto libre sigue funcionando igual de bien con cualquier entidad.
 */
const BANK_COLORS: Record<string, string> = {
  "banco nación": "#5ab031",
  "banco provincia": "#e30613",
  "banco galicia": "#ff6600",
  "banco santander": "#ec0000",
  bbva: "#004481",
  "banco macro": "#7a1fa2",
  "banco supervielle": "#003057",
  "banco credicoop": "#00833e",
  "banco ciudad": "#f2a900",
  "banco patagonia": "#00a0df",
  "banco comafi": "#003366",
  "banco hipotecario": "#004b87",
  "banco san juan": "#00529b",
  icbc: "#c7000b",
  hsbc: "#db0011",
  "banco columbia": "#1b1464",
  brubank: "#6c2eb9",
  "mercado pago": "#00aaff",
  ualá: "#6938ef",
  uala: "#6938ef",
  "naranja x": "#ff5100",
  "banco del sol": "#ffb600",
  lemon: "#f4e400",
  "personal pay": "#742f8e",
  modo: "#ff3366",
  "cuenta dni": "#0f4c81",
  belo: "#00d09c",
  prex: "#1dd3b0",
  rebanking: "#111827",
  "cocos pay": "#111111",
};

const FALLBACK_PALETTE = ["#0ea5e9", "#f97316", "#8b5cf6", "#ec4899", "#10b981", "#eab308", "#ef4444", "#14b8a6"];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

export function getBankBadge(name: string): { initials: string; color: string; textDark: boolean } {
  const key = name.trim().toLowerCase();
  const color = BANK_COLORS[key] || hashColor(key || "?");
  return { initials: initialsOf(name), color, textDark: isLight(color) };
}
