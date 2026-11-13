import { supabase } from "./supabase";

/**
 * Piloto de migración Firebase -> Supabase, sección Turnos.
 *
 * Reemplaza, SOLO para estas 5 categorías, el backend de firestoreSyncService.ts (que sigue
 * siendo el que usan las ~40 categorías restantes de la app). El resto del código no sabe que
 * esto existe: firestoreSyncService.ts delega acá por nombre de categoría, así que
 * AppointmentsView.tsx y App.tsx no cambiaron sus imports ni sus llamadas.
 *
 * A diferencia de Firestore acá, cada categoría tiene su propia tabla con columnas reales
 * (en vez de un blob jsonb genérico) para poder consultarlas con SQL normal más adelante.
 */

export const SUPABASE_MIGRATED_CATEGORIES = new Set([
  "turnos_compromisos",
  "appointments",
  "routines",
  "turno_categorias",
  "address_book",
]);

type Row = Record<string, any>;

interface TableConfig {
  table: string;
  // Nombre de la columna que identifica al item dentro de la tabla (siempre "id" acá,
  // pero la clave primaria real es compuesta (user_id, id) para que dos usuarios distintos
  // puedan tener el mismo id de item sin pisarse).
  toRow: (item: Row, userId: string) => Row;
  fromRow: (row: Row) => Row;
}

// Solo agrega al objeto destino la clave `dest` si `value` no es null/undefined — así replica
// el estilo de Firestore de no guardar campos opcionales ausentes, en vez de dejarlos en null.
function put(obj: Row, dest: string, value: any) {
  if (value !== null && value !== undefined) obj[dest] = value;
}

const TABLES: Record<string, TableConfig> = {
  turnos_compromisos: {
    table: "turnos_compromisos",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      estatus: !!item.estatus,
      descripcion: item.descripcion ?? "",
      categoria: item.categoria ?? "",
      fecha: item.fecha ?? null,
      lugar: item.lugar ?? null,
      estudio_informe_doc: item.estudioInformeDoc ?? null,
      pedido_documento: item.pedidoDocumento ?? null,
      doctor: item.doctor ?? null,
      lat: item.lat ?? null,
      lon: item.lon ?? null,
      medical_record_id: item.medicalRecordId ?? null,
      informacion_personalizada: item.informacionPersonalizada ?? null,
      archivos_necesarios: item.archivosNecesarios ?? [],
      transcripcion_automatica: item.transcripcionAutomatica ?? null,
      medicamentos_a_pedir: item.medicamentosAPedir ?? [],
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, estatus: !!row.estatus, descripcion: row.descripcion ?? "", categoria: row.categoria ?? "" };
      put(out, "fecha", row.fecha);
      put(out, "lugar", row.lugar);
      put(out, "estudioInformeDoc", row.estudio_informe_doc);
      put(out, "pedidoDocumento", row.pedido_documento);
      put(out, "doctor", row.doctor);
      put(out, "lat", row.lat);
      put(out, "lon", row.lon);
      put(out, "medicalRecordId", row.medical_record_id);
      put(out, "informacionPersonalizada", row.informacion_personalizada);
      if (Array.isArray(row.archivos_necesarios) && row.archivos_necesarios.length > 0) {
        out.archivosNecesarios = row.archivos_necesarios;
      }
      put(out, "transcripcionAutomatica", row.transcripcion_automatica);
      if (Array.isArray(row.medicamentos_a_pedir) && row.medicamentos_a_pedir.length > 0) {
        out.medicamentosAPedir = row.medicamentos_a_pedir;
      }
      return out;
    },
  },
  appointments: {
    table: "appointments",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      title: item.title ?? null,
      date: item.date ?? null,
      time: item.time ?? null,
      location: item.location ?? null,
      notes: item.notes ?? null,
      doctor_name: item.doctorName ?? null,
      specialty: item.specialty ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id };
      put(out, "title", row.title);
      put(out, "date", row.date);
      put(out, "time", row.time);
      put(out, "location", row.location);
      put(out, "notes", row.notes);
      put(out, "doctorName", row.doctor_name);
      put(out, "specialty", row.specialty);
      return out;
    },
  },
  routines: {
    table: "routines",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      title: item.title ?? null,
      frequency: item.frequency ?? null,
      completed_dates: item.completedDates ?? [],
      streak: item.streak ?? 0,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, completedDates: row.completed_dates ?? [], streak: row.streak ?? 0 };
      put(out, "title", row.title);
      put(out, "frequency", row.frequency);
      return out;
    },
  },
  turno_categorias: {
    table: "turno_categorias",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      label: item.label ?? null,
      icon: item.icon ?? null,
      is_default: !!item.isDefault,
      order: item.order ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id };
      put(out, "label", row.label);
      put(out, "icon", row.icon);
      if (row.is_default) out.isDefault = true;
      put(out, "order", row.order);
      return out;
    },
  },
  address_book: {
    table: "address_book",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
      address: item.address ?? null,
      lat: item.lat ?? null,
      lon: item.lon ?? null,
      notes: item.notes ?? null,
      is_favorite: !!item.isFavorite,
      order: item.order ?? null,
      last_used_at: item.lastUsedAt ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id };
      put(out, "name", row.name);
      put(out, "address", row.address);
      put(out, "lat", row.lat);
      put(out, "lon", row.lon);
      put(out, "notes", row.notes);
      if (row.is_favorite) out.isFavorite = true;
      put(out, "order", row.order);
      put(out, "lastUsedAt", row.last_used_at);
      return out;
    },
  },
};

type CategoryCallback = (items: any[]) => void;

interface SubscriptionGroup {
  callbacks: Set<CategoryCallback>;
  lastData: any[];
  channel: ReturnType<typeof supabase.channel> | null;
}

const activeSubscriptions: Record<string, SubscriptionGroup> = {};

async function fetchAll(userId: string, category: string): Promise<any[]> {
  const cfg = TABLES[category];
  const { data, error } = await supabase.from(cfg.table).select("*").eq("user_id", userId);
  if (error) {
    console.warn(`[SupabaseSync] Error fetching ${category}:`, error.message);
    return [];
  }
  return (data || []).map(cfg.fromRow);
}

export async function refetchCategorySupabase(userId: string, category: string): Promise<any[]> {
  const items = await fetchAll(userId, category);
  const subKey = `${userId}_${category}`;
  const group = activeSubscriptions[subKey];
  if (group) {
    group.lastData = items;
    group.callbacks.forEach((cb) => {
      try {
        cb(items);
      } catch (e) {
        console.error(`[SupabaseSync] Callback error for ${category}:`, e);
      }
    });
  }
  return items;
}

export async function saveItemToSupabase(userId: string, category: string, item: any): Promise<boolean> {
  if (!item || item.id == null) throw new Error("Elemento o ID no válido para guardar en Supabase.");
  const cfg = TABLES[category];
  const row = cfg.toRow(item, userId);

  // OPTIMISTIC UI UPDATE (mismo patrón que firestoreSyncService.saveItemToFirestore).
  const subKey = `${userId}_${category}`;
  const group = activeSubscriptions[subKey];
  if (group) {
    const currentList = [...group.lastData];
    const index = currentList.findIndex((i) => String(i.id) === String(item.id));
    const optimisticItem = cfg.fromRow(row);
    if (index >= 0) currentList[index] = optimisticItem;
    else currentList.push(optimisticItem);
    group.lastData = currentList;
    group.callbacks.forEach((cb) => {
      try {
        cb(currentList);
      } catch (e) {
        console.error(`[SupabaseSync] Optimistic callback error for ${category}:`, e);
      }
    });
  }

  const { error } = await supabase.from(cfg.table).upsert(row, { onConflict: "user_id,id" });
  if (error) {
    console.error(`[SupabaseSync] Error saving ${category}/${item.id}:`, error.message);
    throw error;
  }
  return true;
}

export async function deleteItemFromSupabase(userId: string, category: string, itemId: string | number): Promise<boolean> {
  if (itemId == null || itemId === "") return false;
  const cfg = TABLES[category];
  const docId = String(itemId);

  const subKey = `${userId}_${category}`;
  const group = activeSubscriptions[subKey];
  if (group) {
    group.lastData = group.lastData.filter((i) => String(i.id) !== docId);
    group.callbacks.forEach((cb) => {
      try {
        cb(group.lastData);
      } catch (e) {
        console.error(`[SupabaseSync] Optimistic delete callback error for ${category}:`, e);
      }
    });
  }

  const { error } = await supabase.from(cfg.table).delete().eq("user_id", userId).eq("id", docId);
  if (error) {
    console.warn(`[SupabaseSync] Error deleting ${category}/${docId}:`, error.message);
    return false;
  }
  return true;
}

// Migración única de datos ya existentes en Firestore hacia estas tablas. Pensada para
// correrse una sola vez desde el navegador del usuario ya logueado (ver botón temporal en
// AppointmentsView.tsx) — no necesita credenciales de administrador porque usa la sesión de
// Firestore que la app ya tiene abierta.
export async function bulkImportFromFirestore(userId: string, category: string, items: Row[]): Promise<number> {
  if (!items || items.length === 0) return 0;
  const cfg = TABLES[category];
  const rows = items.filter((item) => item && item.id != null).map((item) => cfg.toRow(item, userId));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from(cfg.table).upsert(rows, { onConflict: "user_id,id" });
  if (error) {
    console.error(`[SupabaseSync] Error importando ${category}:`, error.message);
    throw error;
  }
  return rows.length;
}

export function subscribeToCategorySupabase(userId: string, category: string, onUpdate: CategoryCallback): () => void {
  const subKey = `${userId}_${category}`;
  const cfg = TABLES[category];

  if (!activeSubscriptions[subKey]) {
    const group: SubscriptionGroup = { callbacks: new Set([onUpdate]), lastData: [], channel: null };
    activeSubscriptions[subKey] = group;

    fetchAll(userId, category).then((items) => {
      group.lastData = items;
      group.callbacks.forEach((cb) => {
        try {
          cb(items);
        } catch (e) {
          console.error(`[SupabaseSync] Initial callback error for ${category}:`, e);
        }
      });
    });

    // Realtime: a diferencia del listener de un solo documento que usa Firestore (para ahorrar
    // lecturas), acá cada cambio llega directo por websocket con la fila ya adentro del payload
    // — no hace falta un refetch extra ni el truco de "sync status".
    group.channel = supabase
      .channel(`turnos-sync-${subKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: cfg.table, filter: `user_id=eq.${userId}` },
        (payload) => {
          const current = [...group.lastData];
          if (payload.eventType === "DELETE") {
            const oldId = String((payload.old as Row)?.id);
            group.lastData = current.filter((i) => String(i.id) !== oldId);
          } else {
            const item = cfg.fromRow(payload.new as Row);
            const index = current.findIndex((i) => String(i.id) === String(item.id));
            if (index >= 0) current[index] = item;
            else current.push(item);
            group.lastData = current;
          }
          group.callbacks.forEach((cb) => {
            try {
              cb(group.lastData);
            } catch (e) {
              console.error(`[SupabaseSync] Realtime callback error for ${category}:`, e);
            }
          });
        }
      )
      .subscribe();
  } else {
    const group = activeSubscriptions[subKey];
    group.callbacks.add(onUpdate);
    if (group.lastData) {
      try {
        onUpdate(group.lastData);
      } catch (e) {
        console.error(`[SupabaseSync] Initial callback error for ${category}:`, e);
      }
    }
  }

  return () => {
    const group = activeSubscriptions[subKey];
    if (!group) return;
    group.callbacks.delete(onUpdate);
    if (group.callbacks.size === 0) {
      if (group.channel) supabase.removeChannel(group.channel);
      delete activeSubscriptions[subKey];
    }
  };
}
