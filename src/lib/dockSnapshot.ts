// Resumen liviano para el dock flotante de Electron (ver electron/main.cjs y DockApp.tsx). Se
// arma acá, en vez de reutilizar la lógica de "agenda de hoy" de HomeView, porque esa está pensada
// para la ventana principal (con toda la data ya cargada en memoria) y corre un motor de
// notificaciones con ventanas de tiempo (2h/1h/exacto) bastante más elaborado de lo que necesita
// un vistazo rápido en el dock. Esto es deliberadamente más simple.
//
// A diferencia de la primera versión, acá NO se recorta ni se preselecciona "lo más próximo": se
// manda TODO lo pendiente/no pagado de cada categoría con su fecha, y es el dock (DockApp.tsx) el
// que filtra por el día elegido en su mini calendario — por default, hoy (ver punto 4 pedido por
// el usuario: "siempre pendientes de hoy, excepto que seleccione otro día").
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
  // Fecha puntual (YYYY-MM-DD) del ítem, o "" cuando no aplica una fecha concreta (ej. Salud: un
  // medicamento "en tratamiento" no vence un día puntual, se considera vigente solo para "hoy").
  dateOnly: string;
  overdue: boolean;
  isToday: boolean;
}

export interface DockSnapshot {
  generatedAt: number;
  finanzas: DockItem[];
  turnos: DockItem[];
  salud: DockItem[];
  academico: DockItem[];
  // El dock es una ventana/renderer aparte: no monta App.tsx, así que no tiene forma propia de
  // enterarse del color de acento, el modo oscuro ni quién es el usuario — viaja todo acá adentro
  // en vez de depender de que lea localStorage por su cuenta (ver DockApp.tsx).
  themeColor: string;
  darkMode: boolean;
  profile: { name: string; photoURL: string | null };
}

function dateOnlyOf(raw?: string): string {
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function classify(dateOnly: string, todayStr: string): { overdue: boolean; isToday: boolean } {
  if (!dateOnly) return { overdue: false, isToday: false };
  if (dateOnly < todayStr) return { overdue: true, isToday: false };
  if (dateOnly === todayStr) return { overdue: false, isToday: true };
  return { overdue: false, isToday: false };
}

function formatMonto(n?: number): string {
  if (n === undefined || n === null) return "";
  return `AR$${Number(n).toLocaleString("es-AR")}`;
}

function formatFecha(dateOnly: string): string {
  if (!dateOnly) return "";
  const [y, m, d] = dateOnly.split("-");
  return d && m && y ? `${d}/${m}/${y}` : dateOnly;
}

function byDate(a: DockItem, b: DockItem): number {
  return (a.dateOnly || "9999-99-99").localeCompare(b.dateOnly || "9999-99-99");
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

  const finanzas: DockItem[] = [];
  for (const p of params.detailedPayments) {
    if (p.pago) continue;
    const dateOnly = dateOnlyOf(p.fechaVencimiento);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    finanzas.push({
      id: p.id,
      title: p.descripcion || "Pago",
      subtitle: [formatMonto(p.montoAPagar), dateOnly ? `vence ${formatFecha(dateOnly)}` : ""].filter(Boolean).join(" · "),
      dateOnly,
      overdue,
      isToday,
    });
  }
  for (const inv of params.invoices) {
    if (inv.paid) continue;
    const dateOnly = dateOnlyOf(inv.dueDate);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    finanzas.push({
      id: inv.id,
      title: inv.title || "Factura",
      subtitle: [formatMonto(inv.amount), dateOnly ? `vence ${formatFecha(dateOnly)}` : ""].filter(Boolean).join(" · "),
      dateOnly,
      overdue,
      isToday,
    });
  }
  finanzas.sort(byDate);

  const turnos: DockItem[] = [];
  for (const t of params.turnosCompromisos) {
    if (t.estatus) continue; // ya completado
    const dateOnly = dateOnlyOf(t.fecha);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    const hora = (t.fecha || "").includes("T") ? t.fecha.split("T")[1]?.slice(0, 5) : "";
    turnos.push({
      id: t.id,
      title: t.descripcion || "Turno",
      subtitle: [hora && hora !== "00:00" ? `${hora} hs` : "", t.lugar].filter(Boolean).join(" · "),
      dateOnly,
      overdue,
      isToday,
    });
  }
  turnos.sort(byDate);

  // Sin fecha propia: un medicamento "en tratamiento" es vigente hoy, no un día puntual futuro.
  const salud: DockItem[] = params.medicamentosDetallados
    .filter((m) => m.estado === "Consumiendo")
    .map((m) => ({
      id: m.id,
      title: `${m.marca}${m.mg ? ` ${m.mg}mg` : ""}`,
      subtitle: m.consumoDiario ? `${m.consumoDiario}/día` : "En tratamiento",
      dateOnly: "",
      overdue: false,
      isToday: false,
    }));

  const academico: DockItem[] = [];
  for (const e of params.examenes) {
    const dateOnly = dateOnlyOf(e.fecha);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    academico.push({
      id: e.id,
      title: `${e.materia}${e.estado ? ` (${e.estado})` : ""}`,
      subtitle: e.aula ? `Aula ${e.aula}` : "",
      dateOnly,
      overdue,
      isToday,
    });
  }
  for (const t of params.tasks) {
    if (t.completed) continue;
    const dateOnly = dateOnlyOf(t.dueDate);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    academico.push({
      id: t.id,
      title: `${t.type}: ${t.title}`,
      subtitle: "",
      dateOnly,
      overdue,
      isToday,
    });
  }
  academico.sort(byDate);

  return {
    generatedAt: Date.now(),
    finanzas,
    turnos,
    salud,
    academico,
    themeColor: params.themeColor,
    darkMode: params.darkMode,
    profile: params.profile,
  };
}
