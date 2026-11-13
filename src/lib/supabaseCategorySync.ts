import { supabase } from "./supabase";

/**
 * Motor genérico para migrar categorías de Firestore a Supabase, una sección a la vez (ver
 * supabaseTurnosSync.ts, supabaseFinanzasSync.ts). Cada sección solo define sus tablas y el
 * mapeo de campos (TableConfig); esta capa pone en común la suscripción realtime, el guardado/
 * borrado optimista y la importación masiva única.
 */

export type Row = Record<string, any>;

export interface TableConfig {
  table: string;
  toRow: (item: Row, userId: string) => Row;
  fromRow: (row: Row) => Row;
}

type CategoryCallback = (items: any[]) => void;

interface SubscriptionGroup {
  callbacks: Set<CategoryCallback>;
  lastData: any[];
  channel: ReturnType<typeof supabase.channel> | null;
}

// Agrega `dest` al objeto solo si `value` no es null/undefined — replica el estilo de Firestore
// de no guardar campos opcionales ausentes, en vez de dejarlos en null.
export function put(obj: Row, dest: string, value: any) {
  if (value !== null && value !== undefined) obj[dest] = value;
}

export interface CategorySyncModule {
  SUPABASE_MIGRATED_CATEGORIES: Set<string>;
  refetchCategorySupabase: (userId: string, category: string) => Promise<any[]>;
  saveItemToSupabase: (userId: string, category: string, item: any) => Promise<boolean>;
  deleteItemFromSupabase: (userId: string, category: string, itemId: string | number) => Promise<boolean>;
  subscribeToCategorySupabase: (userId: string, category: string, onUpdate: CategoryCallback) => () => void;
  bulkImportFromFirestore: (userId: string, category: string, items: Row[]) => Promise<number>;
}

export function createCategorySync(tables: Record<string, TableConfig>): CategorySyncModule {
  const SUPABASE_MIGRATED_CATEGORIES = new Set(Object.keys(tables));
  const activeSubscriptions: Record<string, SubscriptionGroup> = {};

  async function fetchAll(userId: string, category: string): Promise<any[]> {
    const cfg = tables[category];
    const { data, error } = await supabase.from(cfg.table).select("*").eq("user_id", userId);
    if (error) {
      console.warn(`[SupabaseSync] Error fetching ${category}:`, error.message);
      return [];
    }
    return (data || []).map(cfg.fromRow);
  }

  async function refetchCategorySupabase(userId: string, category: string): Promise<any[]> {
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

  async function saveItemToSupabase(userId: string, category: string, item: any): Promise<boolean> {
    if (!item || item.id == null) throw new Error("Elemento o ID no válido para guardar en Supabase.");
    const cfg = tables[category];
    const row = cfg.toRow(item, userId);

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

  async function deleteItemFromSupabase(userId: string, category: string, itemId: string | number): Promise<boolean> {
    if (itemId == null || itemId === "") return false;
    const cfg = tables[category];
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

  function subscribeToCategorySupabase(userId: string, category: string, onUpdate: CategoryCallback): () => void {
    const subKey = `${userId}_${category}`;
    const cfg = tables[category];

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

      // Realtime: a diferencia del listener de un solo documento que usa Firestore (para
      // ahorrar lecturas), acá cada cambio llega directo por websocket con la fila ya adentro
      // del payload — no hace falta refetch extra ni el truco de "sync status".
      group.channel = supabase
        .channel(`sync-${category}-${subKey}`)
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

  // Migración única de datos ya existentes en Firestore. Pensada para correrse desde el
  // navegador del usuario ya logueado — usa la sesión de Firestore que la app ya tiene abierta,
  // no necesita credenciales de administrador.
  async function bulkImportFromFirestore(userId: string, category: string, items: Row[]): Promise<number> {
    if (!items || items.length === 0) return 0;
    const cfg = tables[category];
    const rows = items.filter((item) => item && item.id != null).map((item) => cfg.toRow(item, userId));
    if (rows.length === 0) return 0;
    const { error } = await supabase.from(cfg.table).upsert(rows, { onConflict: "user_id,id" });
    if (error) {
      console.error(`[SupabaseSync] Error importando ${category}:`, error.message);
      throw error;
    }
    return rows.length;
  }

  return {
    SUPABASE_MIGRATED_CATEGORIES,
    refetchCategorySupabase,
    saveItemToSupabase,
    deleteItemFromSupabase,
    subscribeToCategorySupabase,
    bulkImportFromFirestore,
  };
}
