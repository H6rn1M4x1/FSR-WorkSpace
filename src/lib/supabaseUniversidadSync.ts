import { createCategorySync, put, Row, TableConfig } from "./supabaseCategorySync";

/**
 * Piloto de migración Firebase -> Supabase, sección Universidad/Académico (mismo patrón que
 * Turnos y Finanzas — ver supabaseTurnosSync.ts). Reemplaza, solo para estas 9 categorías, el
 * backend de firestoreSyncService.ts.
 *
 * Se deja afuera "notes" (AcademicNote): esa categoría la comparte con las notas sueltas de la
 * sección Notas (useNotes.ts, misma colección "notes" con una forma de dato distinta) — migrarla
 * requiere resolver antes esa mezcla, no es parte de este piloto.
 */

const TABLES: Record<string, TableConfig> = {
  subjects: {
    table: "subjects",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
      professor: item.professor ?? null,
      classroom: item.classroom ?? null,
      schedule: item.schedule ?? null,
      color: item.color ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, name: row.name ?? "", schedule: row.schedule ?? "", color: row.color ?? "" };
      put(out, "professor", row.professor);
      put(out, "classroom", row.classroom);
      return out;
    },
  },
  tasks: {
    table: "tasks",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      subject_id: item.subjectId ?? null,
      title: item.title ?? null,
      description: item.description ?? null,
      due_date: item.dueDate ?? null,
      type: item.type ?? null,
      grade: item.grade ?? null,
      completed: !!item.completed,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, subjectId: row.subject_id ?? "", title: row.title ?? "", dueDate: row.due_date ?? "", type: row.type ?? "", completed: !!row.completed };
      put(out, "description", row.description);
      put(out, "grade", row.grade);
      return out;
    },
  },
  materias_info: {
    table: "materias_info",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      estado: item.estado ?? null,
      materia: item.materia ?? null,
      ano_cursado: item.anoCursado ?? null,
      cuatrimestre: item.cuatrimestre ?? null,
      cursado_debil: item.cursadoDebil ?? null,
      cursado_fuerte: item.cursadoFuerte ?? null,
      rendir_fuerte: item.rendirFuerte ?? null,
      fecha_regularidad: item.fechaRegularidad ?? null,
      fecha_vencimiento: item.fechaVencimiento ?? null,
      fecha_aprobado: item.fechaAprobado ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        estado: row.estado ?? "Sin empezar",
        materia: row.materia ?? "",
        anoCursado: row.ano_cursado ?? "",
        cuatrimestre: row.cuatrimestre ?? "",
        cursadoDebil: row.cursado_debil ?? "",
        cursadoFuerte: row.cursado_fuerte ?? "",
        rendirFuerte: row.rendir_fuerte ?? "",
      };
      put(out, "fechaRegularidad", row.fecha_regularidad);
      put(out, "fechaVencimiento", row.fecha_vencimiento);
      put(out, "fechaAprobado", row.fecha_aprobado);
      return out;
    },
  },
  horarios: {
    table: "horarios",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      dia: item.dia ?? null,
      hora_inicio: item.horaInicio ?? null,
      hora_fin: item.horaFin ?? null,
      materia: item.materia ?? null,
      aulas: item.aulas ?? null,
      profesores: item.profesores ?? null,
      comision: item.comision ?? null,
      modalidad: item.modalidad ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        dia: row.dia ?? "",
        horaInicio: row.hora_inicio ?? "",
        horaFin: row.hora_fin ?? "",
        materia: row.materia ?? "",
        aulas: row.aulas ?? "",
        profesores: row.profesores ?? "",
      };
      put(out, "comision", row.comision);
      put(out, "modalidad", row.modalidad);
      return out;
    },
  },
  examenes: {
    table: "examenes",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      materia: item.materia ?? null,
      fecha: item.fecha ?? null,
      estado: item.estado ?? null,
      instancia: item.instancia ?? null,
      aula: item.aula ?? null,
      hora: item.hora ?? null,
      nota: item.nota ?? null,
      contenidos: item.contenidos ?? null,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, materia: row.materia ?? "", fecha: row.fecha ?? "", estado: row.estado ?? "", aula: row.aula ?? "" };
      put(out, "instancia", row.instancia);
      put(out, "hora", row.hora);
      put(out, "nota", row.nota);
      put(out, "contenidos", row.contenidos);
      return out;
    },
  },
  pinned_study_folders: {
    table: "pinned_study_folders",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      folder_id: item.folderId ?? null,
      folder_name: item.folderName ?? null,
      materia_name: item.materiaName ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      folderId: row.folder_id ?? "",
      folderName: row.folder_name ?? "",
      materiaName: row.materia_name ?? "",
    }),
  },
  completed_study_files: {
    table: "completed_study_files",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      file_id: item.fileId ?? null,
      pinned_folder_id: item.pinnedFolderId ?? null,
      completed: !!item.completed,
    }),
    fromRow: (row) => {
      const out: Row = { id: row.id, fileId: row.file_id ?? "", completed: !!row.completed };
      put(out, "pinnedFolderId", row.pinned_folder_id);
      return out;
    },
  },
  study_plan_tree: {
    table: "study_plan_tree",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      folder_id: item.folderId ?? null,
      nodes: item.nodes ?? [],
      source_file_id: item.sourceFileId ?? null,
      source_file_name: item.sourceFileName ?? null,
      tree_updated_at: item.updatedAt ?? null,
      attachments: item.attachments ?? {},
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        folderId: row.folder_id ?? "",
        nodes: row.nodes ?? [],
        sourceFileId: row.source_file_id ?? "",
        sourceFileName: row.source_file_name ?? "",
        updatedAt: row.tree_updated_at ?? "",
      };
      if (row.attachments && Object.keys(row.attachments).length > 0) {
        out.attachments = row.attachments;
      }
      return out;
    },
  },
  ai_exams: {
    table: "ai_exams",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      folder_id: item.folderId ?? null,
      folder_name: item.folderName ?? null,
      name: item.name ?? null,
      instancia: item.instancia ?? null,
      source_files: item.sourceFiles ?? [],
      questions: item.questions ?? [],
      answers: item.answers ?? [],
      result: item.result ?? null,
      status: item.status ?? null,
      created_at_client: item.createdAt ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        folderId: row.folder_id ?? "",
        folderName: row.folder_name ?? "",
        name: row.name ?? "",
        sourceFiles: row.source_files ?? [],
        questions: row.questions ?? [],
        status: row.status ?? "generated",
        createdAt: row.created_at_client ?? "",
      };
      put(out, "instancia", row.instancia);
      if (Array.isArray(row.answers) && row.answers.length > 0) out.answers = row.answers;
      put(out, "result", row.result);
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
