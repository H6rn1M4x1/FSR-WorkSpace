import { createCategorySync, put, Row, TableConfig } from "./supabaseCategorySync";

/**
 * Piloto de migración Firebase -> Supabase, sección Turnos.
 *
 * Reemplaza, SOLO para estas 5 categorías, el backend de firestoreSyncService.ts (que sigue
 * siendo el que usan el resto de las categorías). El resto del código no sabe que esto existe:
 * firestoreSyncService.ts delega acá por nombre de categoría, así que AppointmentsView.tsx y
 * App.tsx no cambiaron sus imports ni sus llamadas.
 *
 * A diferencia de Firestore, cada categoría tiene su propia tabla con columnas reales (en vez
 * de un blob jsonb genérico) para poder consultarlas con SQL normal más adelante.
 */

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

const sync = createCategorySync(TABLES);

export const SUPABASE_MIGRATED_CATEGORIES = sync.SUPABASE_MIGRATED_CATEGORIES;
export const refetchCategorySupabase = sync.refetchCategorySupabase;
export const saveItemToSupabase = sync.saveItemToSupabase;
export const deleteItemFromSupabase = sync.deleteItemFromSupabase;
export const subscribeToCategorySupabase = sync.subscribeToCategorySupabase;
export const bulkImportFromFirestore = sync.bulkImportFromFirestore;
