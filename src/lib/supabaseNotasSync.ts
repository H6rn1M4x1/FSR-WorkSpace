import { createCategorySync, put, Row, TableConfig } from "./supabaseCategorySync";

/**
 * Piloto de migración Firebase -> Supabase, sección Notas (mismo patrón que Turnos, Finanzas,
 * Universidad, Salud y Comidas — ver supabaseTurnosSync.ts). Reemplaza, solo para estas 2
 * categorías, el backend de firestoreSyncService.ts.
 *
 * La categoría "notes" también la usaba un bloque MUERTO en AcademicView.tsx (AcademicNote,
 * shape distinto) — no hay ningún botón que lo invoque, así que el único escritor real es
 * notesService.ts (StickyNote), que es el shape que mapea esta tabla.
 */

const TABLES: Record<string, TableConfig> = {
  notes: {
    table: "notes",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      title: item.title ?? null,
      text_content: item.text ?? null,
      color: item.color ?? null,
      pinned: !!item.pinned,
      order_num: item.order ?? null,
      folder_id: item.folderId ?? null,
      attachments: item.attachments ?? [],
      created_at_client: item.createdAt ?? null,
      updated_at_client: item.updatedAt ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        text: row.text_content ?? "",
        color: row.color ?? "default",
        pinned: !!row.pinned,
        createdAt: row.created_at_client ?? 0,
        updatedAt: row.updated_at_client ?? 0,
      };
      put(out, "title", row.title);
      put(out, "order", row.order_num);
      put(out, "folderId", row.folder_id);
      if (Array.isArray(row.attachments) && row.attachments.length > 0) {
        out.attachments = row.attachments;
      }
      return out;
    },
  },
  noteFolders: {
    table: "note_folders",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      name: item.name ?? null,
      icon: item.icon ?? null,
      order_num: item.order ?? null,
      created_at_client: item.createdAt ?? null,
      updated_at_client: item.updatedAt ?? null,
    }),
    fromRow: (row) => {
      const out: Row = {
        id: row.id,
        name: row.name ?? "",
        icon: row.icon ?? "folder",
        createdAt: row.created_at_client ?? 0,
        updatedAt: row.updated_at_client ?? 0,
      };
      put(out, "order", row.order_num);
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
