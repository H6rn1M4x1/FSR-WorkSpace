import { supabase } from "./supabase";
import { subscribeToCategory } from "./firestoreSyncService";
import { generateUniqueId } from "../utils/id";

/**
 * Item-level sharing, v2 — migrado a Supabase (antes vivía en la colección Firestore
 * "shared_items"). Mismo diseño de siempre: solo se guarda una REFERENCIA ("item X, de la
 * categoría Y, de A, compartido con B"), nunca una copia del dato — así:
 *   - cualquiera de los dos lados que lo edite, edita el mismo registro real
 *   - no hay nada duplicado que mantener sincronizado
 *   - dejar de compartir es solo borrar la referencia; el dato nunca se pierde
 *
 * Las referencias viven en la tabla public.shared_items, con RLS que solo deja ver/tocar una
 * fila al dueño o al destinatario (ver migración sharing_pilot_schema).
 */

export type Unsubscribe = () => void;

export interface SharedItemRef {
  id: string;
  ownerEmail: string;
  sharedWithEmail: string;
  category: string; // e.g. "turnos_compromisos", "detailed_payments"
  itemId: string;
  itemLabel?: string; // human-readable, just for showing in lists
  createdAt: number;
}

function norm(email: string): string {
  return (email || "").trim().toLowerCase();
}

function rowToRef(row: any): SharedItemRef {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    sharedWithEmail: row.shared_with_email,
    category: row.category,
    itemId: row.item_id,
    itemLabel: row.item_label || "",
    createdAt: row.created_at ?? 0,
  };
}

/** Shares one item with another user. Safe to call repeatedly (same id = idempotent). */
export async function shareItemWith(
  ownerEmail: string,
  sharedWithEmail: string,
  category: string,
  itemId: string,
  itemLabel?: string
): Promise<void> {
  const owner = norm(ownerEmail);
  const target = norm(sharedWithEmail);
  if (!owner || !target) throw new Error("Faltan los correos para compartir.");
  if (owner === target) throw new Error("No podés compartir algo con vos mismo.");

  // Id determinístico: re-compartir el mismo ítem con la misma persona no duplica la fila.
  const shareId = `${owner}__${target}__${category}__${itemId}`.replace(/[^a-zA-Z0-9_@.-]/g, "_");

  const row = {
    id: shareId,
    owner_email: owner,
    shared_with_email: target,
    category,
    item_id: itemId,
    item_label: itemLabel || "",
    created_at: Date.now(),
  };

  const { error } = await supabase.from("shared_items").upsert(row, { onConflict: "id" });
  if (error) {
    console.error("[Sharing v2] shareItemWith: write FAILED", shareId, error);
    throw error;
  }
}

/** Stops sharing one item with one person. The item itself is never deleted. */
export async function unshareItem(
  ownerEmail: string,
  sharedWithEmail: string,
  category: string,
  itemId: string
): Promise<void> {
  const owner = norm(ownerEmail);
  const target = norm(sharedWithEmail);
  const shareId = `${owner}__${target}__${category}__${itemId}`.replace(/[^a-zA-Z0-9_@.-]/g, "_");

  const { error } = await supabase.from("shared_items").delete().eq("id", shareId);
  if (error) {
    console.error("[Sharing v2] unshareItem: delete FAILED", shareId, error);
    throw error;
  }
}

/** Live list of everything OTHER people have shared with me. */
export function subscribeToItemsSharedWithMe(
  myEmail: string,
  onUpdate: (refs: SharedItemRef[]) => void
): Unsubscribe {
  const me = norm(myEmail);
  if (!me) return () => {};

  let cancelled = false;
  const fetchAndEmit = async () => {
    const { data, error } = await supabase.from("shared_items").select("*").eq("shared_with_email", me);
    if (cancelled) return;
    if (error) {
      console.error("[Sharing v2] Error listening to items shared with me:", error.message);
      onUpdate([]);
      return;
    }
    onUpdate((data || []).map(rowToRef));
  };
  fetchAndEmit();

  // El nombre del canal lleva un sufijo único: supabase.channel(topic) devuelve el MISMO
  // objeto si ya existe uno con ese topic — y removeChannel() es async (espera el unsubscribe
  // de red antes de desengancharlo), así que un remount rápido (entrar/salir de la pantalla)
  // podía encontrar el canal viejo todavía "unido" y tirar una excepción real al llamar
  // .on() sobre él ("cannot add callbacks... after subscribe()"), rompiendo toda la app.
  const channel = supabase
    .channel(`shared-items-with-me-${me}-${generateUniqueId()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shared_items", filter: `shared_with_email=eq.${me}` },
      fetchAndEmit
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

/** Live list of everything I have shared out to others. */
export function subscribeToItemsIShared(
  myEmail: string,
  onUpdate: (refs: SharedItemRef[]) => void
): Unsubscribe {
  const me = norm(myEmail);
  if (!me) return () => {};

  let cancelled = false;
  const fetchAndEmit = async () => {
    const { data, error } = await supabase.from("shared_items").select("*").eq("owner_email", me);
    if (cancelled) return;
    if (error) {
      console.error("[Sharing v2] Error listening to items I shared:", error.message);
      onUpdate([]);
      return;
    }
    onUpdate((data || []).map(rowToRef));
  };
  fetchAndEmit();

  const channel = supabase
    .channel(`shared-items-by-me-${me}-${generateUniqueId()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shared_items", filter: `owner_email=eq.${me}` },
      fetchAndEmit
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
}

/**
 * Live-reads the actual shared items from their owners' collections and hands back the
 * hydrated records, each tagged with who owns it (so the UI can show the "shared" badge
 * and know where to write edits back to).
 */
export function subscribeToSharedItemData(
  refs: SharedItemRef[],
  onUpdate: (itemsByCategory: Record<string, any[]>) => void
): Unsubscribe {
  if (refs.length === 0) {
    onUpdate({});
    return () => {};
  }

  const unsubs: Unsubscribe[] = [];
  // category -> itemId -> item
  const store: Record<string, Record<string, any>> = {};
  // ownerEmail -> display name (resolved async; falls back to the email until it arrives)
  const ownerNames: Record<string, string> = {};

  const emit = () => {
    const result: Record<string, any[]> = {};
    for (const cat of Object.keys(store)) {
      result[cat] = Object.values(store[cat]).map((item) => ({
        ...item,
        __sharedByName: ownerNames[item.__sharedByEmail] || item.__sharedByEmail,
      }));
    }
    onUpdate(result);
  };

  // Resolve each distinct owner's display name una vez — user_profile ya migró a Supabase, así
  // que esto pasa por el mismo despachador que todo lo demás (subscribeToCategory).
  const distinctOwners = Array.from(new Set(refs.map((r) => r.ownerEmail)));
  for (const ownerEmail of distinctOwners) {
    const unsubProfile = subscribeToCategory(ownerEmail, "user_profile", (items) => {
      const profile = Array.isArray(items) ? items[0] : null;
      if (profile?.displayName) {
        ownerNames[ownerEmail] = profile.displayName;
        emit();
      }
    });
    unsubs.push(unsubProfile);
  }

  // Group refs by owner+category: one live subscription por par, a través del mismo
  // despachador Supabase/Firestore que usa todo el resto de la app (subscribeToCategory).
  const groups = new Map<string, { ownerEmail: string; category: string; itemIds: Set<string> }>();
  for (const ref of refs) {
    const key = `${ref.ownerEmail}__${ref.category}`;
    if (!groups.has(key)) {
      groups.set(key, { ownerEmail: ref.ownerEmail, category: ref.category, itemIds: new Set() });
    }
    groups.get(key)!.itemIds.add(ref.itemId);
  }

  for (const { ownerEmail, category, itemIds } of groups.values()) {
    let previousIds = new Set<string>();
    const unsub = subscribeToCategory(ownerEmail, category, (items) => {
      if (!store[category]) store[category] = {};
      const currentIds = new Set<string>();
      if (Array.isArray(items)) {
        for (const item of items) {
          const id = item && item.id ? String(item.id) : "";
          if (id && itemIds.has(id)) {
            store[category][id] = { ...item, id, __sharedByEmail: ownerEmail };
            currentIds.add(id);
          }
        }
      }
      // Drop ids this group tracked before but that disappeared from the owner's
      // category (e.g. the owner deleted the item).
      for (const id of previousIds) {
        if (!currentIds.has(id) && store[category][id]?.__sharedByEmail === ownerEmail) {
          delete store[category][id];
        }
      }
      previousIds = currentIds;
      emit();
    });
    unsubs.push(unsub);
  }

  return () => {
    unsubs.forEach((u) => {
      try {
        u();
      } catch (_) {}
    });
  };
}
