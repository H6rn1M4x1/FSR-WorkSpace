import { WorkspaceService } from "./workspace";

export interface AutoSyncEventData {
  title: string;
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  time?: string;
}

/**
 * Crea o actualiza en el lugar el evento de Google Calendar vinculado a un item que acaba de
 * guardarse (turno, pago, examen, tarea, comida planificada, etc.), replicando el patrón ya
 * probado en AppointmentsView.tsx para Turnos y Compromisos: si el item ya tiene un
 * `googleCalendarEventId` se actualiza ese evento in-place; si ese id ya no existe en Calendar
 * (borrado a mano ahí) o el item nunca tuvo uno, se crea uno nuevo.
 *
 * Fire-and-forget por diseño: el guardado real (Firestore) ya ocurrió antes de llamar a esto, así
 * que un fallo acá nunca debe revertir ni bloquear esa operación — solo se loggea. Sin token (el
 * usuario no iniciό sesión con Google o ese permiso no está disponible ahora mismo) se omite en
 * silencio, igual que en Turnos y Compromisos.
 *
 * @param idPrefix corto y fijo por tipo de item (ej. "pago", "examen", "tarea") — junto con el id
 *   real arma el id temporal que usa syncCalendarEvents para devolver el nuevo googleEventId.
 * @returns el nuevo `googleCalendarEventId` a persistir en el item, o `undefined` si no cambió
 *   (se actualizó in-place, o la sync falló/se omitió).
 */
export async function autoSyncToGoogleCalendar(
  token: string | null | undefined,
  idPrefix: string,
  itemId: string,
  existingGoogleEventId: string | null | undefined,
  eventData: AutoSyncEventData,
): Promise<string | undefined> {
  if (!token) return undefined;
  try {
    if (existingGoogleEventId) {
      const result = await WorkspaceService.updateCalendarEvent(existingGoogleEventId, eventData, token);
      if (!result.notFound) return undefined;
      // No encontrado (se borró a mano en Calendar) — sigue abajo y lo recrea.
    }
    const tempId = `${idPrefix}-${itemId}`;
    // syncCalendarEvents (a diferencia de updateCalendarEvent) pide `description` como string
    // obligatorio — se completa con "" cuando el item no tiene descripción propia.
    const created = await WorkspaceService.syncCalendarEvents(
      [{ ...eventData, description: eventData.description || "", id: tempId }],
      token,
    );
    return created.eventIds?.[tempId];
  } catch (err) {
    console.error(`Error sincronizando "${idPrefix}-${itemId}" con Google Calendar:`, err);
    return undefined;
  }
}

/** Borra el evento de Google Calendar vinculado a un item que se acaba de eliminar. Mismo
 *  fire-and-forget silencioso que autoSyncToGoogleCalendar: nunca lanza. */
export async function autoDeleteFromGoogleCalendar(
  token: string | null | undefined,
  googleEventId: string | null | undefined,
): Promise<void> {
  if (!token || !googleEventId) return;
  try {
    await WorkspaceService.deleteCalendarEvent(googleEventId, token);
  } catch (err) {
    console.error("Error borrando evento de Google Calendar:", err);
  }
}
