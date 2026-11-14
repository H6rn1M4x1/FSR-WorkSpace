import { createCategorySync, put, Row, TableConfig } from "./supabaseCategorySync";

/**
 * Piloto de migración Firebase -> Supabase, Caja Fuerte (Notas > Caja Fuerte). Reemplaza, solo
 * para estas 2 categorías, el backend de firestoreSyncService.ts. Todo lo que pasa por acá ya
 * viene encriptado del lado del cliente (ver vaultCrypto.ts/vaultService.ts) — esta capa solo
 * mueve blobs opacos (iv/data) y metadata de envoltura (salt/iterations), nunca contraseñas en
 * texto plano ni la clave maestra sin envolver.
 */

const TABLES: Record<string, TableConfig> = {
  vault_config: {
    table: "vault_config",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      wrapped_by_password_iv: item.wrappedByPassword?.iv ?? null,
      wrapped_by_password_data: item.wrappedByPassword?.data ?? null,
      wrapped_by_password_salt: item.wrappedByPassword?.salt ?? null,
      wrapped_by_password_iterations: item.wrappedByPassword?.iterations ?? null,
      wrapped_by_recovery_iv: item.wrappedByRecovery?.iv ?? null,
      wrapped_by_recovery_data: item.wrappedByRecovery?.data ?? null,
      wrapped_by_recovery_salt: item.wrappedByRecovery?.salt ?? null,
      wrapped_by_recovery_iterations: item.wrappedByRecovery?.iterations ?? null,
      require_totp_to_reveal: !!item.requireTotpToReveal,
      created_at_client: item.createdAt ?? null,
      updated_at_client: item.updatedAt ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      wrappedByPassword: {
        iv: row.wrapped_by_password_iv ?? "",
        data: row.wrapped_by_password_data ?? "",
        salt: row.wrapped_by_password_salt ?? "",
        iterations: row.wrapped_by_password_iterations ?? 0,
      },
      wrappedByRecovery: {
        iv: row.wrapped_by_recovery_iv ?? "",
        data: row.wrapped_by_recovery_data ?? "",
        salt: row.wrapped_by_recovery_salt ?? "",
        iterations: row.wrapped_by_recovery_iterations ?? 0,
      },
      requireTotpToReveal: !!row.require_totp_to_reveal,
      createdAt: row.created_at_client ?? 0,
      updatedAt: row.updated_at_client ?? 0,
    }),
  },
  vault_items: {
    table: "vault_items",
    toRow: (item, userId) => ({
      id: String(item.id),
      user_id: userId,
      iv: item.iv ?? null,
      data: item.data ?? null,
      created_at_client: item.createdAt ?? null,
      updated_at_client: item.updatedAt ?? null,
    }),
    fromRow: (row) => ({
      id: row.id,
      iv: row.iv ?? "",
      data: row.data ?? "",
      createdAt: row.created_at_client ?? 0,
      updatedAt: row.updated_at_client ?? 0,
    }),
  },
};

const sync = createCategorySync(TABLES);

export const SUPABASE_MIGRATED_CATEGORIES = sync.SUPABASE_MIGRATED_CATEGORIES;
export const refetchCategorySupabase = sync.refetchCategorySupabase;
export const saveItemToSupabase = sync.saveItemToSupabase;
export const deleteItemFromSupabase = sync.deleteItemFromSupabase;
export const subscribeToCategorySupabase = sync.subscribeToCategorySupabase;
export const bulkImportFromFirestore = sync.bulkImportFromFirestore;
