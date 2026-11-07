// Resumen liviano para el dock flotante de Electron (ver electron/main.cjs y DockApp.tsx). Se
// arma acá, en vez de reutilizar la lógica de "agenda de hoy" de HomeView, porque esa está pensada
// para la ventana principal (con toda la data ya cargada en memoria) y corre un motor de
// notificaciones con ventanas de tiempo (2h/1h/exacto) bastante más elaborado de lo que necesita
// un vistazo rápido en el dock. Esto es deliberadamente más simple: "qué vence hoy o pronto".
import type {
  AcademicTask,
  DetailedPayment,
  ExamenItem,
  Invoice,
  MedicamentoDetallado,
  TurnoCompromiso,
} from "../types";
import { getLocalDateString } from "../utils/date";

export interface DockItem {
  id: string;
  title: string;
  subtitle: string;
  overdue: boolean;
  isToday: boolean;
}

export interface DockSnapshot {
  generatedAt: number;
  finanzas: DockItem[];
  turnos: DockItem[];
  salud: DockItem[];
  academico: DockItem[];
  urgentCount: number;
  // Totales reales (sin el recorte a MAX_ITEMS de arriba) para los contadores de cada sección en
  // el dock — así una sección con más de 5 pendientes no muestra "5" como si fuera el total.
  counts: { finanzas: number; turnos: number; salud: number; academico: number };
  // El dock es una ventana/renderer aparte: no monta App.tsx, así que no tiene forma propia de
  // enterarse del color de acento, el modo oscuro ni quién es el usuario — viaja todo acá adentro
  // en vez de depender de que lea localStorage por su cuenta (ver DockApp.tsx).
  themeColor: string;
  darkMode: boolean;
  profile: { name: string; photoURL: string | null };
}

const MAX_ITEMS = 5;

function dateOnlyOf(raw?: string): string {
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function windowStatus(
  raw: string | undefined,
  todayStr: string,
  daysAhead: number
): { include: boolean; overdue: boolean; isToday: boolean; dateOnly: string } {
  const dateOnly = dateOnlyOf(raw);
  if (!dateOnly) return { include: false, overdue: false, isToday: false, dateOnly: "" };
  if (dateOnly < todayStr) return { include: true, overdue: true, isToday: false, dateOnly };
  if (dateOnly === todayStr) return { include: true, overdue: false, isToday: true, dateOnly };
  const diffDays = (new Date(dateOnly).getTime() - new Date(todayStr).getTime()) / 86400000;
  return { include: diffDays > 0 && diffDays <= daysAhead, overdue: false, isToday: false, dateOnly };
}

function formatMonto(n?: number): string {
  if (n === undefined || n === null) return "";
  return `AR$${Number(n).toLocaleString("es-AR")}`;
}

function formatFecha(dateOnly: string): string {
  const [y, m, d] = dateOnly.split("-");
  return d && m && y ? `${d}/${m}/${y}` : dateOnly;
}

interface SortableItem extends DockItem {
  _sortKey: string;
}

function sortAndTrim(items: SortableItem[]): DockItem[] {
  return items
    .sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
      return a._sortKey.localeCompare(b._sortKey);
    })
    .slice(0, MAX_ITEMS)
    .map(({ _sortKey, ...rest }) => rest);
}

export function buildDockSnapshot(params: {
  detailedPayments: DetailedPayment[];
  invoices: Invoice[];
  turnosCompromisos: TurnoCompromiso[];
  medicamentosDetallados: MedicamentoDetallado[];
  examenes: ExamenItem[];
  tasks: AcademicTask[];
  themeColor: string;
  darkMode: boolean;
  profile: { name: string; photoURL: string | null };
}): DockSnapshot {
  const todayStr = getLocalDateString();

  const finanzasRaw: SortableItem[] = [];
  for (const p of params.detailedPayments) {
    if (p.pago) continue;
    const w = windowStatus(p.fechaVencimiento, todayStr, 7);
    if (!w.include) continue;
    finanzasRaw.push({
      id: p.id,
      title: p.descripcion || "Pago",
      subtitle: [formatMonto(p.montoAPagar), `vence ${formatFecha(w.dateOnly)}`].filter(Boolean).join(" · "),
      overdue: w.overdue,
      isToday: w.isToday,
      _sortKey: w.dateOnly,
    });
  }
  for (const inv of params.invoices) {
    if (inv.paid) continue;
    const w = windowStatus(inv.dueDate, todayStr, 7);
    if (!w.include) continue;
    finanzasRaw.push({
      id: inv.id,
      title: inv.title || "Factura",
      subtitle: [formatMonto(inv.amount), `vence ${formatFecha(w.dateOnly)}`].filter(Boolean).join(" · "),
      overdue: w.overdue,
      isToday: w.isToday,
      _sortKey: w.dateOnly,
    });
  }

  const turnosRaw: SortableItem[] = [];
  for (const t of params.turnosCompromisos) {
    if (t.estatus) continue; // ya completado
    const w = windowStatus(t.fecha, todayStr, 14);
    if (!w.include || w.overdue) continue; // turnos vencidos no aportan nada útil acá
    const hora = (t.fecha || "").includes("T") ? t.fecha.split("T")[1]?.slice(0, 5) : "";
    turnosRaw.push({
      id: t.id,
      title: t.descripcion || "Turno",
      subtitle: [formatFecha(w.dateOnly), hora && hora !== "00:00" ? `${hora} hs` : "", t.lugar]
        .filter(Boolean)
        .join(" · "),
      overdue: false,
      isToday: w.isToday,
      _sortKey: w.dateOnly,
    });
  }

  const saludRaw: SortableItem[] = params.medicamentosDetallados
    .filter((m) => m.estado === "Consumiendo")
    .map((m) => ({
      id: m.id,
      title: `${m.marca}${m.mg ? ` ${m.mg}mg` : ""}`,
      subtitle: m.consumoDiario ? `${m.consumoDiario}/día` : "En tratamiento",
      overdue: false,
      isToday: true,
      _sortKey: m.marca,
    }));

  const academicoRaw: SortableItem[] = [];
  for (const e of params.examenes) {
    const w = windowStatus(e.fecha, todayStr, 14);
    if (!w.include || w.overdue) continue;
    academicoRaw.push({
      id: e.id,
      title: `${e.materia}${e.estado ? ` (${e.estado})` : ""}`,
      subtitle: [formatFecha(w.dateOnly), e.aula ? `Aula ${e.aula}` : ""].filter(Boolean).join(" · "),
      overdue: false,
      isToday: w.isToday,
      _sortKey: w.dateOnly,
    });
  }
  for (const t of params.tasks) {
    if (t.completed) continue;
    const w = windowStatus(t.dueDate, todayStr, 14);
    if (!w.include) continue;
    academicoRaw.push({
      id: t.id,
      title: `${t.type}: ${t.title}`,
      subtitle: formatFecha(w.dateOnly),
      overdue: w.overdue,
      isToday: w.isToday,
      _sortKey: w.dateOnly,
    });
  }

  const urgentCount = [...finanzasRaw, ...turnosRaw, ...academicoRaw].filter((i) => i.overdue || i.isToday).length;

  return {
    generatedAt: Date.now(),
    finanzas: sortAndTrim(finanzasRaw),
    turnos: sortAndTrim(turnosRaw),
    salud: sortAndTrim(saludRaw),
    academico: sortAndTrim(academicoRaw),
    urgentCount,
    counts: {
      finanzas: finanzasRaw.length,
      turnos: turnosRaw.length,
      salud: saludRaw.length,
      academico: academicoRaw.length,
    },
    themeColor: params.themeColor,
    darkMode: params.darkMode,
    profile: params.profile,
  };
}
