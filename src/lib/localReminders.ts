import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type {
  TurnoCompromiso,
  DetailedPayment,
  ExamenItem,
  MedicamentoDetallado,
  DisponibilidadMedicamento,
  OrganizacionSemanalItem,
  PlatoItem,
} from "../types";

// Réplica, del lado del cliente, de los mismos avisos que netlify/functions/check-appointment-
// reminders.ts calcula en el servidor — necesaria porque el WebView de Android no soporta push
// (ver src/lib/pushNotifications.ts) y, sin Firebase disponible para FCM, la única forma de que
// el APK avise con la app cerrada es que el propio sistema operativo dispare la notificación en
// el momento exacto. En vez de que un servidor "revise cada 10 min y empuje", acá la app arma de
// antemano TODO el calendario de avisos futuros cada vez que corre (al abrir/reanudar, o cuando
// cambian los datos), y Android se encarga de dispararlos en su horario, aunque la app esté
// cerrada o el celu bloqueado.
//
// No se replican los resúmenes diarios (7am / adelanto de las 22hs) del servidor — son un digest
// agregado de varias secciones a la vez, mucho más compleja de recalcular "por adelantado" sin
// un cron real; los avisos individuales de acá abajo ya cubren la misma información, solo que
// en el momento puntual de cada ítem en vez de en una lista diaria.

const FINANZAS_REMINDER_HOUR = 12;
const SALUD_REMINDER_HOUR = 10;
const COMIDAS_REMINDER_HOUR = 10;
const REMINDER_MINUTES_BEFORE = 120; // "al menos 2 horas antes" para turnos/exámenes

// IDs estables: @capacitor/local-notifications pide un número, y volver a programar con el mismo
// ID reemplaza el aviso anterior en vez de duplicarlo — así cada corrida puede simplemente
// reprogramar todo sin acumular reprogramaciones viejas.
function stableId(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
  }
  return (hash % 2147483000) + 1; // > 0, dentro de rango int32
}

function friendlyDateTime(d: Date): { date: string; time: string } {
  const date = d.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return { date: date.charAt(0).toUpperCase() + date.slice(1), time };
}

function atLocalTime(dateStr: string, hour: number): Date {
  // dateStr: "YYYY-MM-DD" (o con hora pegada atrás, se ignora) — arma esa fecha a la hora pedida
  // en la zona horaria del propio dispositivo (a diferencia del servidor, acá no hace falta forzar
  // un offset de Argentina: el celu del usuario YA está en su zona horaria real).
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hour, 0, 0, 0);
}

interface PlannedNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
}

interface LocalRemindersData {
  turnos: TurnoCompromiso[];
  payments: DetailedPayment[];
  examenes: ExamenItem[];
  medicamentos: MedicamentoDetallado[];
  disponibilidad: DisponibilidadMedicamento[];
  organizacionSemanal: OrganizacionSemanalItem[];
  platos: PlatoItem[];
}

function buildPlannedNotifications(data: LocalRemindersData, now: Date): PlannedNotification[] {
  const planned: PlannedNotification[] = [];

  // --- Turnos: 2hs antes ---
  for (const tc of data.turnos) {
    if (tc.estatus || !tc.fecha || !tc.fecha.includes("T")) continue;
    const eventTime = new Date(tc.fecha);
    if (isNaN(eventTime.getTime())) continue;
    const reminderAt = new Date(eventTime.getTime() - REMINDER_MINUTES_BEFORE * 60000);
    if (reminderAt <= now || eventTime <= now) continue;
    const { date, time } = friendlyDateTime(eventTime);
    const lugarPart = tc.lugar ? ` en ${tc.lugar}` : "";
    const doctorPart = tc.doctor ? ` con ${tc.doctor}` : "";
    planned.push({
      id: stableId(`turno:${tc.id}`),
      title: "⏰ Recordatorio (Turnos)",
      body: `${tc.descripcion}${lugarPart} el ${date} a las ${time}hs${doctorPart}.`,
      at: reminderAt,
    });
  }

  // --- Exámenes: 2hs antes ---
  for (const ex of data.examenes) {
    if (!ex.fecha || !ex.hora) continue;
    const eventTime = new Date(`${ex.fecha.split("T")[0]}T${ex.hora}`);
    if (isNaN(eventTime.getTime())) continue;
    const reminderAt = new Date(eventTime.getTime() - REMINDER_MINUTES_BEFORE * 60000);
    if (reminderAt <= now || eventTime <= now) continue;
    const { date, time } = friendlyDateTime(eventTime);
    const aulaPart = ex.aula ? ` en ${ex.aula}` : "";
    planned.push({
      id: stableId(`examen:${ex.id}`),
      title: "⏰ Recordatorio (Universidad)",
      body: `Examen de ${ex.materia}${aulaPart} el ${date} a las ${time}hs.`,
      at: reminderAt,
    });
  }

  // --- Finanzas: mediodía del día de vencimiento ---
  for (const p of data.payments) {
    if (p.pago || !p.fechaVencimiento) continue;
    const at = atLocalTime(p.fechaVencimiento, FINANZAS_REMINDER_HOUR);
    if (at <= now) continue;
    planned.push({
      id: stableId(`pago:${p.id}`),
      title: "💵 Recordatorio (Finanzas)",
      body: `Hoy vence: ${p.descripcion} - $${(p.montoAPagar || 0).toLocaleString("es-AR")} (${p.categoria || "General"}).`,
      at,
    });
  }

  // --- Comidas: 10am del día planificado ---
  for (const o of data.organizacionSemanal) {
    if (!o.fecha) continue;
    const at = atLocalTime(o.fecha, COMIDAS_REMINDER_HOUR);
    if (at <= now) continue;
    const nombrePlato = data.platos.find((pl) => pl.id === o.platoId)?.nombrePlato || "Comida planificada";
    planned.push({
      id: stableId(`comida:${o.id}`),
      title: "🍽️ Recordatorio (Comidas)",
      body: `Hoy tenés planificado: ${nombrePlato}.`,
      at,
    });
  }

  // --- Salud: proyecta cuándo el stock va a quedar en <= 1 día y avisa a las 10am de ese día ---
  for (const med of data.medicamentos) {
    if (med.estado !== "Consumiendo") continue;
    const entries = data.disponibilidad.filter((d) => d.medicamentoId === med.id);
    if (entries.length === 0) continue;
    const latest = entries.sort((a, b) => String(b.fechaRegistro).localeCompare(String(a.fechaRegistro)))[0];
    const cd = med.consumoDiario || 1;
    const cantReg = latest.cantidadRegistrada || 0;
    if (cd <= 0) continue;
    // disponibleParaDias(diffDays) = (cantReg - cd*diffDays) / cd <= 1  =>  diffDays >= cantReg/cd - 1
    const minDiffDays = Math.ceil(cantReg / cd - 1);
    const regDate = atLocalTime(latest.fechaRegistro, 0);
    const targetDate = new Date(regDate.getTime() + Math.max(0, minDiffDays) * 86400000);
    const at = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), SALUD_REMINDER_HOUR, 0, 0, 0);
    if (at <= now) continue;
    const nombre = med.droga || med.marca || "Medicamento";
    planned.push({
      id: stableId(`salud:${med.id}`),
      title: "💊 Recordatorio (Salud)",
      body: `${nombre} se termina hoy o mañana — te queda menos de un día de stock.`,
      at,
    });
  }

  return planned;
}

let scheduling = false;
let pendingRerun = false;

// Llamar cada vez que cambien los datos relevantes (ver el useEffect debounced en App.tsx). Es
// una reconciliación completa: cancela lo que ya no corresponde y (re)programa todo lo vigente —
// no hace falta llevar un registro propio de "ya avisado", los IDs estables se encargan.
export async function scheduleLocalReminders(data: LocalRemindersData): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (scheduling) {
    pendingRerun = true;
    return;
  }
  scheduling = true;
  try {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== "granted") return;

    const planned = buildPlannedNotifications(data, new Date());
    const desiredIds = new Set(planned.map((p) => p.id));

    const pending = await LocalNotifications.getPending();
    const toCancel = pending.notifications.filter((n) => !desiredIds.has(n.id));
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel.map((n) => ({ id: n.id })) });
    }

    if (planned.length > 0) {
      await LocalNotifications.schedule({
        notifications: planned.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body,
          schedule: { at: p.at },
        })),
      });
    }
  } catch (err) {
    console.error("Error programando recordatorios locales:", err);
  } finally {
    scheduling = false;
    if (pendingRerun) {
      pendingRerun = false;
      scheduleLocalReminders(data);
    }
  }
}

export async function cancelAllLocalReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
}
