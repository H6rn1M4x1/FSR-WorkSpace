import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from "firebase/firestore";
import { generateUniqueId } from "../utils/id";
import { subscribeToCategory } from "./firestoreSyncService";

/**
 * The native Firestore write promise only resolves once the backend acknowledges it, so a
 * flaky connection (mobile network hiccup, a stalled long-polling channel, an
 * ad-blocker/proxy interfering) can leave it pending far longer than feels reasonable —
 * that's what showed up as sharing "hanging" with no error and no result. Racing it
 * against a short timeout means we never block the UI on it: if it's still pending after
 * a few seconds we let the caller move on (the write keeps retrying in the background and
 * will still land once the connection recovers), instead of pretending it failed.
 */
const WRITE_TIMEOUT_MS = 8_000;
const TIMEOUT_MARKER = Symbol("firestore-write-still-pending");

function withWriteTimeout<T>(promise: Promise<T>, label: string): Promise<T | typeof TIMEOUT_MARKER> {
  return Promise.race([
    promise,
    new Promise<typeof TIMEOUT_MARKER>((resolve) => {
      setTimeout(() => {
        console.warn(`[Sharing v2] ${label} is taking longer than expected; continuing in the background.`);
        resolve(TIMEOUT_MARKER);
      }, WRITE_TIMEOUT_MS);
    })
  ]);
}

/**
 * Item-level sharing, v2.
 *
 * Unlike the previous system (which COPIED a snapshot of the shared data into the share
 * document — so edits on either side drifted apart), this stores only a REFERENCE:
 * "item X, of category Y, owned by A, is shared with B".
 *
 * The recipient's app then reads the item straight from the owner's own collection, which
 * means:
 *   - either side editing it edits the same underlying record
 *   - no duplicated data, nothing to keep in sync
 *   - unsharing is just deleting the reference; no data is lost
 *
 * Shares live in a single top-level collection: shared_items/{shareId}
 */

export interface SharedItemRef {
  id: string;
  ownerEmail: string;
  sharedWithEmail: string;
  category: string; // e.g. "turnos_compromisos", "detailed_payments"
  itemId: string;
  itemLabel?: string; // human-readable, just for showing in lists
  createdAt: number;
}

const SHARED_ITEMS = "shared_items";

function norm(email: string): string {
  return (email || "").trim().toLowerCase();
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

  // Deterministic id so re-sharing the same item to the same person doesn't duplicate.
  const shareId = `${owner}__${target}__${category}__${itemId}`.replace(/[^a-zA-Z0-9_@.-]/g, "_");

  const payload: SharedItemRef = {
    id: shareId,
    ownerEmail: owner,
    sharedWithEmail: target,
    category,
    itemId,
    itemLabel: itemLabel || "",
    createdAt: Date.now(),
  };

  try {
    const writePromise = setDoc(doc(db, SHARED_ITEMS, shareId), payload, { merge: true });
    const result = await withWriteTimeout(writePromise, "shareItemWith");
    if (result === TIMEOUT_MARKER) {
      writePromise
        .then(() => console.log("[Sharing v2] shareItemWith: delayed write succeeded", shareId))
        .catch((err) => console.error("[Sharing v2] shareItemWith: delayed write FAILED", shareId, err));
      return;
    }
  } catch (err) {
    console.error("[Sharing v2] shareItemWith: write FAILED", shareId, err);
    throw err;
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
  try {
    const deletePromise = deleteDoc(doc(db, SHARED_ITEMS, shareId));
    const result = await withWriteTimeout(deletePromise, "unshareItem");
    if (result === TIMEOUT_MARKER) {
      deletePromise
        .then(() => console.log("[Sharing v2] unshareItem: delayed delete succeeded", shareId))
        .catch((err) => console.error("[Sharing v2] unshareItem: delayed delete FAILED", shareId, err));
      return;
    }
  } catch (err) {
    console.error("[Sharing v2] unshareItem: delete FAILED", shareId, err);
    throw err;
  }
}

/** Live list of everything OTHER people have shared with me. */
export function subscribeToItemsSharedWithMe(
  myEmail: string,
  onUpdate: (refs: SharedItemRef[]) => void
): Unsubscribe {
  const me = norm(myEmail);
  if (!me) return () => {};

  const q = query(collection(db, SHARED_ITEMS), where("sharedWithEmail", "==", me));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as SharedItemRef));
    },
    (err) => {
      console.error("[Sharing v2] Error listening to items shared with me:", err);
      onUpdate([]);
    }
  );
}

/** Live list of everything I have shared out to others. */
export function subscribeToItemsIShared(
  myEmail: string,
  onUpdate: (refs: SharedItemRef[]) => void
): Unsubscribe {
  const me = norm(myEmail);
  if (!me) return () => {};

  const q = query(collection(db, SHARED_ITEMS), where("ownerEmail", "==", me));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => d.data() as SharedItemRef));
    },
    (err) => {
      console.error("[Sharing v2] Error listening to items I shared:", err);
      onUpdate([]);
    }
  );
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

  // Resolve each distinct owner's display name once. user_profile never migrated to
  // Supabase, so this stays a direct Firestore read.
  const distinctOwners = Array.from(new Set(refs.map((r) => r.ownerEmail)));
  for (const ownerEmail of distinctOwners) {
    const profileRef = doc(db, "users", ownerEmail, "user_profile", ownerEmail);
    const unsubProfile = onSnapshot(
      profileRef,
      (snap) => {
        const data = snap.data() as any;
        if (data?.displayName) {
          ownerNames[ownerEmail] = data.displayName;
          emit();
        }
      },
      () => {
        // No profile access/doc — the email fallback is fine.
      }
    );
    unsubs.push(unsubProfile);
  }

  // Group refs by owner+category: one live subscription per pair, through the same
  // Supabase/Firestore dispatch every other reader uses (subscribeToCategory). Reading the
  // owner's item straight from Firestore (the old approach) went stale the moment that
  // category's real data moved to Supabase — sharing kept pointing at a doc nobody writes
  // to anymore.
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
