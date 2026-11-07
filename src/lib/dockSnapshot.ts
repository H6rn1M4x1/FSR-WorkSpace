// Resumen liviano para el dock flotante de Electron (ver electron/main.cjs y DockApp.tsx). Se
// arma acá, en vez de reutilizar la lógica de "agenda de hoy" de HomeView, porque esa está pensada
// para la ventana principal (con toda la data ya cargada en memoria) y corre un motor de
// notificaciones con ventanas de tiempo (2h/1h/exacto) bastante más elaborado de lo que necesita
// un vistazo rápido en el dock. Esto es deliberadamente más simple.
//
// Acá NO se recorta ni se preselecciona "lo más próximo": se manda TODO lo pendiente/no resuelto
// de cada categoría con su fecha, y es el dock (DockApp.tsx) el que filtra por el día elegido en
// su mini calendario — por default, hoy.
import type {
  AcademicTask,
  DetailedPayment,
  ExamenItem,
  Invoice,
  MedicamentoDetallado,
  TurnoCompromiso,
} from "../types";
import { getLocalDateString } from "../utils/date";

// De qué colección real viene cada ítem — de esto depende qué se puede hacer con él desde el dock
// (tildarlo, editarlo, borrarlo): no todas las colecciones tienen hoy el mismo nivel de soporte
// (ver DOCK_ITEM_CAPABILITIES más abajo).
export type DockItemKind = "detailedPayment" | "invoice" | "turno" | "examen" | "task" | "medicamento";

export type DockSectionKey = "finanzas" | "turnos" | "salud" | "academico";

// A qué formulario de edición (QUICK_ADD_TARGETS en App.tsx) corresponde cada kind — null cuando
// no hay ninguno armado todavía (forzar uno ahí abriría el ítem equivocado, o no abriría nada).
export type DockEditCategory = "finanzas" | "turno" | "universidad" | null;

export interface DockItemCapabilities {
  // Si tocar el ítem puede llevar a la ventana principal a su formulario de edición real.
  editable: boolean;
  editCategory: DockEditCategory;
  // Si tiene un campo simple de "resuelto/no resuelto" que se puede tildar desde el dock mismo
  // (Pagar, Marcar realizado, Marcar hecha) sin pasar por la ventana principal.
  toggleable: boolean;
  toggleLabel?: string;
  // Si se puede borrar de verdad desde el dock (con el mismo guardado/sync que usa la app).
  deletable: boolean;
}

export const DOCK_ITEM_CAPABILITIES: Record<DockItemKind, DockItemCapabilities> = {
  detailedPayment: { editable: true, editCategory: "finanzas", toggleable: true, toggleLabel: "Pagar", deletable: true },
  // Colección más simple/vieja, sin su propio formulario de edición armado — pero el campo "paid"
  // y el borrado sí son iguales de simples que en DetailedPayment, así que esos sí se habilitan.
  invoice: { editable: false, editCategory: null, toggleable: true, toggleLabel: "Pagar", deletable: true },
  turno: { editable: true, editCategory: "turno", toggleable: true, toggleLabel: "Marcar realizado", deletable: true },
  // Un examen no tiene un campo de "resuelto" simple (se carga una nota en otro lado) — solo
  // editar/borrar.
  examen: { editable: true, editCategory: "universidad", toggleable: false, deletable: true },
  // Sin editor deep-link propio todavía (el de Académico solo busca en exámenes y horarios), pero
  // "completed" y el borrado son iguales de simples que en cualquier otra colección.
  task: { editable: false, editCategory: null, toggleable: true, toggleLabel: "Marcar hecha", deletable: true },
  // Un medicamento "en tratamiento" no es un pendiente puntual con un campo para tildar ni un
  // registro que tenga sentido borrar desde acá (es la ficha del medicamento, no un evento).
  medicamento: { editable: false, editCategory: null, toggleable: false, deletable: false },
};

export interface DockItem {
  id: string;
  title: string;
  subtitle: string;
  // Fecha puntual (YYYY-MM-DD) del ítem, o "" cuando no aplica una fecha concreta (ej. Salud: un
  // medicamento "en tratamiento" no vence un día puntual, se considera vigente solo para "hoy").
  dateOnly: string;
  // "overdue" nunca es true si el ítem ya está resuelto (done=true) — vencido solo tiene sentido
  // para algo que sigue pendiente.
  overdue: boolean;
  isToday: boolean;
  // Ya resuelto (pago/estatus/completed en true) — a diferencia de la versión anterior, estos
  // ítems NO se descartan: si vencían/caían hoy se siguen mostrando en "Inicio" (con el check ya
  // tildado), para que no parezca que "faltan" cosas que en realidad ya se hicieron hoy mismo.
  done: boolean;
  kind: DockItemKind;
  section: DockSectionKey;
  // Monto en pesos, solo cuando el ítem es de Finanzas — para mostrarlo destacado en la tarjeta de
  // detalle (ver DockApp.tsx), igual que la referencia que pasó el usuario.
  amount?: number;
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
    const dateOnly = dateOnlyOf(p.fechaVencimiento);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    finanzas.push({
      id: p.id,
      title: p.descripcion || "Pago",
      subtitle: [formatMonto(p.montoAPagar), dateOnly ? `vence ${formatFecha(dateOnly)}` : ""].filter(Boolean).join(" · "),
      dateOnly,
      overdue: overdue && !p.pago,
      isToday,
      done: p.pago,
      kind: "detailedPayment",
      section: "finanzas",
      amount: p.montoAPagar,
    });
  }
  for (const inv of params.invoices) {
    const dateOnly = dateOnlyOf(inv.dueDate);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    finanzas.push({
      id: inv.id,
      title: inv.title || "Factura",
      subtitle: [formatMonto(inv.amount), dateOnly ? `vence ${formatFecha(dateOnly)}` : ""].filter(Boolean).join(" · "),
      dateOnly,
      overdue: overdue && !inv.paid,
      isToday,
      done: inv.paid,
      kind: "invoice",
      section: "finanzas",
      amount: inv.amount,
    });
  }
  finanzas.sort(byDate);

  const turnos: DockItem[] = [];
  for (const t of params.turnosCompromisos) {
    const dateOnly = dateOnlyOf(t.fecha);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    const hora = (t.fecha || "").includes("T") ? t.fecha.split("T")[1]?.slice(0, 5) : "";
    turnos.push({
      id: t.id,
      title: t.descripcion || "Turno",
      subtitle: [hora && hora !== "00:00" ? `${hora} hs` : "", t.lugar].filter(Boolean).join(" · "),
      dateOnly,
      overdue: overdue && !t.estatus,
      isToday,
      done: t.estatus,
      kind: "turno",
      section: "turnos",
    });
  }
  turnos.sort(byDate);

  // Sin fecha propia: un medicamento "en tratamiento" es vigente hoy, no un día puntual futuro.
  // "done" no aplica acá (no es un pendiente puntual con un estado resuelto/no resuelto).
  const salud: DockItem[] = params.medicamentosDetallados
    .filter((m) => m.estado === "Consumiendo")
    .map((m) => ({
      id: m.id,
      title: `${m.marca}${m.mg ? ` ${m.mg}mg` : ""}`,
      subtitle: m.consumoDiario ? `${m.consumoDiario}/día` : "En tratamiento",
      dateOnly: "",
      overdue: false,
      isToday: false,
      done: false,
      kind: "medicamento" as const,
      section: "salud" as const,
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
      done: false, // un examen no tiene un estado "resuelto/no resuelto" simple
      kind: "examen",
      section: "academico",
    });
  }
  for (const t of params.tasks) {
    const dateOnly = dateOnlyOf(t.dueDate);
    const { overdue, isToday } = classify(dateOnly, todayStr);
    academico.push({
      id: t.id,
      title: `${t.type}: ${t.title}`,
      subtitle: "",
      dateOnly,
      overdue: overdue && !t.completed,
      isToday,
      done: t.completed,
      kind: "task",
      section: "academico",
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
