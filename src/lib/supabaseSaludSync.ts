import { createCategorySync, put, Row, TableConfig } from "./supabaseCategorySync";

/**
 * Piloto de migración Firebase -> Supabase, sección Salud (mismo patrón que Turnos, Finanzas y
 * Universidad — ver supabaseTurnosSync.ts). Reemplaza, solo para estas 13 categorías, el
 * backend de firestoreSyncService.ts: Control Clínico (medications, blood_pressure, doctors,
 * medical_records, medicamentos_detallados, disponibilidad_medicamentos), Gimnasio
 * (deportes_actividades, rutinas_gimnasio, registros_entrenamiento) e Historial Diario/métricas
 * (alimentacion_logs, hydration_logs, medidas_history, metabolic_profile).
 */

const TABLES: Record<string, TableConfig> = {
  medications: {
    table: "medications",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
      dosage: item.dosage ?? null,
      frequency: item.frequency ?? null,
      time: item.time ?? null,
      taken_today: !!item.takenToday,
      history: item.history ?? {},
    }),
    fromRow: (row) => ({
      id: row.id,
      name: row.name ?? "",
      dosage: row.dosage ?? "",
      frequency: row.frequency ?? "",
      time: row.time ?? "",
      takenToday: !!row.taken_today,
      history: row.history ?? {},
    }),
  },
  blood_pressure: {
    table: "blood_pressure",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      date: item.date ?? null,
      systolic: item.systolic ?? null,
      diastolic: item.diastolic ?? null,
      pulse: item.pulse ?? null,
      notes: item.notes ?? null,
      patient: item.patient ?? null,
      temperature: item.temperature ?? null,
      oxygen: item.oxygen ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, date: row.date ?? "", systolic: row.systolic ?? 0, diastolic: row.diastolic ?? 0, pulse: row.pulse ?? 0 };
      put(out, "notes", row.notes);
      put(out, "patient", row.patient);
      put(out, "temperature", row.temperature);
      put(out, "oxygen", row.oxygen);
      return out;
    },
  },
  doctors: {
    table: "doctors",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
      specialty: item.specialty ?? null,
      phone: item.phone ?? null,
      email: item.email ?? null,
      address: item.address ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, name: row.name ?? "", specialty: row.specialty ?? "", phone: row.phone ?? "" };
      put(out, "email", row.email);
      put(out, "address", row.address);
      return out;
    },
  },
  medical_records: {
    table: "medical_records",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      patient: item.patient ?? null,
      info: item.info ?? null,
      type: item.type ?? null,
      location: item.location ?? null,
      doctor_id: item.doctorId ?? null,
      file_name: item.fileName ?? null,
      file_data: item.fileData ?? null,
      study_date: item.studyDate ?? null,
      entry_date: item.entryDate ?? null,
      exit_date: item.exitDate ?? null,
      days_count: item.daysCount ?? null,
      report: item.report ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        patient: row.patient ?? "",
        info: row.info ?? "",
        type: row.type ?? "",
        location: row.location ?? "",
        doctorId: row.doctor_id ?? "",
        studyDate: row.study_date ?? "",
        report: row.report ?? "",
      };
      put(out, "fileName", row.file_name);
      put(out, "fileData", row.file_data);
      put(out, "entryDate", row.entry_date);
      put(out, "exitDate", row.exit_date);
      put(out, "daysCount", row.days_count);
      return out;
    },
  },
  medicamentos_detallados: {
    table: "medicamentos_detallados",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      marca: item.marca ?? null,
      droga: item.droga ?? null,
      mg: item.mg ?? null,
      unidad_medida: item.unidadMedida ?? null,
      consumo_diario: item.consumoDiario ?? null,
      cantidad: item.cantidad ?? null,
      imagen: item.imagen ?? null,
      estado: item.estado ?? null,
      funcion_tratamiento: item.funcionTratamiento ?? null,
      fecha_inicio: item.fechaInicio ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        marca: row.marca ?? "",
        droga: row.droga ?? "",
        mg: row.mg ?? 0,
        unidadMedida: row.unidad_medida ?? "Comprimidos",
        consumoDiario: row.consumo_diario ?? 0,
        cantidad: row.cantidad ?? 0,
        estado: row.estado ?? "Sin Determinacion de Consumo",
      };
      put(out, "imagen", row.imagen);
      put(out, "funcionTratamiento", row.funcion_tratamiento);
      put(out, "fechaInicio", row.fecha_inicio);
      return out;
    },
  },
  disponibilidad_medicamentos: {
    table: "disponibilidad_medicamentos",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      receta: !!item.receta,
      medicamento_id: item.medicamentoId ?? null,
      fecha_registro: item.fechaRegistro ?? null,
      cantidad_registrada: item.cantidadRegistrada ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      receta: !!row.receta,
      medicamentoId: row.medicamento_id ?? "",
      fechaRegistro: row.fecha_registro ?? "",
      cantidadRegistrada: row.cantidad_registrada ?? 0,
    }),
  },
  deportes_actividades: {
    table: "deportes_actividades",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      fecha_desde: item.fechaDesde ?? null,
      fecha_hasta: item.fechaHasta ?? null,
      informacion: item.informacion ?? null,
      calorias: item.calorias ?? null,
      pasos: item.pasos ?? null,
      distancia: item.distancia ?? null,
      tiempo_movimiento: item.tiempoMovimiento ?? null,
      frecuencia: item.frecuencia ?? null,
      puntos: item.puntos ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      fechaDesde: row.fecha_desde ?? "",
      fechaHasta: row.fecha_hasta ?? "",
      informacion: row.informacion ?? "",
      calorias: row.calorias ?? 0,
      pasos: row.pasos ?? 0,
      distancia: row.distancia ?? 0,
      tiempoMovimiento: row.tiempo_movimiento ?? "",
      frecuencia: row.frecuencia ?? "",
      puntos: row.puntos ?? 0,
    }),
  },
  rutinas_gimnasio: {
    table: "rutinas_gimnasio",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      nombre: item.nombre ?? null,
      descripcion: item.descripcion ?? null,
      grupo_muscular_principal: item.grupoMuscularPrincipal ?? null,
      grupos_musculares_secundarios: item.gruposMuscularesSecundarios ?? [],
      ejercicios: item.ejercicios ?? [],
      duracion_estimada_min: item.duracionEstimadaMin ?? null,
      fecha_creacion: item.fechaCreacion ?? null,
      ultima_edicion: item.ultimaEdicion ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, nombre: row.nombre ?? "", grupoMuscularPrincipal: row.grupo_muscular_principal ?? "", ejercicios: row.ejercicios ?? [] };
      put(out, "descripcion", row.descripcion);
      if (Array.isArray(row.grupos_musculares_secundarios) && row.grupos_musculares_secundarios.length > 0) {
        out.gruposMuscularesSecundarios = row.grupos_musculares_secundarios;
      }
      put(out, "duracionEstimadaMin", row.duracion_estimada_min);
      put(out, "fechaCreacion", row.fecha_creacion);
      put(out, "ultimaEdicion", row.ultima_edicion);
      return out;
    },
  },
  registros_entrenamiento: {
    table: "registros_entrenamiento",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      rutina_id: item.rutinaId ?? null,
      rutina_nombre: item.rutinaNombre ?? null,
      fecha: item.fecha ?? null,
      duracion_minutos: item.duracionMinutos ?? null,
      hora_inicio: item.horaInicio ?? null,
      hora_fin: item.horaFin ?? null,
      ejercicios_logs: item.ejerciciosLogs ?? [],
      volumen_total_sesion_kg: item.volumenTotalSesionKg ?? null,
      calorias_totales_sesion: item.caloriasTotalesSesion ?? null,
      notas: item.notas ?? null,
      sensacion_gral: item.sensacionGral ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        rutinaNombre: row.rutina_nombre ?? "",
        fecha: row.fecha ?? "",
        ejerciciosLogs: row.ejercicios_logs ?? [],
        volumenTotalSesionKg: row.volumen_total_sesion_kg ?? 0,
        caloriasTotalesSesion: row.calorias_totales_sesion ?? 0,
      };
      put(out, "rutinaId", row.rutina_id);
      put(out, "duracionMinutos", row.duracion_minutos);
      put(out, "horaInicio", row.hora_inicio);
      put(out, "horaFin", row.hora_fin);
      put(out, "notas", row.notas);
      put(out, "sensacionGral", row.sensacion_gral);
      return out;
    },
  },
  alimentacion_logs: {
    table: "alimentacion_logs",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      fecha: item.fecha ?? null,
      estado: item.estado ?? null,
      plato_id: item.platoId ?? null,
      cantidad: item.cantidad ?? null,
      ingredientes_consumidos: item.ingredientesConsumidos ?? [],
      calorias: item.calorias ?? null,
      valores_nutricionales: item.valoresNutricionales ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, fecha: row.fecha ?? "", estado: row.estado ?? "", platoId: row.plato_id ?? "", calorias: row.calorias ?? 0 };
      put(out, "cantidad", row.cantidad);
      if (Array.isArray(row.ingredientes_consumidos) && row.ingredientes_consumidos.length > 0) {
        out.ingredientesConsumidos = row.ingredientes_consumidos;
      }
      put(out, "valoresNutricionales", row.valores_nutricionales);
      return out;
    },
  },
  hydration_logs: {
    table: "hydration_logs",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      fecha: item.fecha ?? null,
      cantidad_vasos: item.cantidadVasos ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      fecha: row.fecha ?? "",
      cantidadVasos: row.cantidad_vasos ?? 0,
    }),
  },
  medidas_history: {
    table: "medidas_history",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      fecha: item.fecha ?? null,
      peso: item.peso ?? null,
      cintura: item.cintura ?? null,
      cadera: item.cadera ?? null,
      cuello: item.cuello ?? null,
      timestamp_ms: item.timestamp ?? null,
      created_at_client: item.createdAt ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, fecha: row.fecha ?? "", peso: row.peso ?? 0 };
      put(out, "cintura", row.cintura);
      put(out, "cadera", row.cadera);
      put(out, "cuello", row.cuello);
      put(out, "timestamp", row.timestamp_ms);
      put(out, "createdAt", row.created_at_client);
      return out;
    },
  },
  metabolic_profile: {
    table: "metabolic_profile",
    toRow: (item, userId) => ({
      id: String(item.id || "profile"),
      user_id: userId,
      edad: item.edad ?? null,
      altura: item.altura ?? null,
      peso_actual: item.pesoActual ?? null,
      genero: item.genero ?? null,
      objetivo: item.objetivo ?? null,
      cintura: item.cintura ?? null,
      cadera: item.cadera ?? null,
      cuello: item.cuello ?? null,
      factor_actividad: item.factorActividad ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        edad: row.edad ?? 28,
        altura: row.altura ?? 175,
        pesoActual: row.peso_actual ?? 70,
        genero: row.genero ?? "Masculino",
        objetivo: row.objetivo ?? "Mantenimiento",
        cintura: row.cintura ?? 82,
        cadera: row.cadera ?? 94,
        cuello: row.cuello ?? 38,
      };
      put(out, "factorActividad", row.factor_actividad);
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
