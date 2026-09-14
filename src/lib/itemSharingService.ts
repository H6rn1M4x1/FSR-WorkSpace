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

  // TEMP diagnostic logging — remove once the sharing propagation bug is confirmed fixed.
  console.log("[Sharing v2] shareItemWith: writing", { shareId, payload });
  try {
    await setDoc(doc(db, SHARED_ITEMS, shareId), payload, { merge: true });
    console.log("[Sharing v2] shareItemWith: write succeeded", shareId);
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
  await deleteDoc(doc(db, SHARED_ITEMS, shareId));
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
      const refs = snap.docs.map((d) => d.data() as SharedItemRef);
      // TEMP diagnostic logging — remove once the sharing propagation bug is confirmed fixed.
      console.log(`[Sharing v2] subscribeToItemsSharedWithMe(${me}): ${refs.length} ref(s)`, refs);
      onUpdate(refs);
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

  // Resolve each distinct owner's display name once.
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

  for (const ref of refs) {
    const path = `users/${ref.ownerEmail}/${ref.category}/${ref.itemId}`;
    const itemDoc = doc(db, "users", ref.ownerEmail, ref.category, ref.itemId);
    const unsub = onSnapshot(
      itemDoc,
      (snap) => {
        if (!store[ref.category]) store[ref.category] = {};
        // TEMP diagnostic logging — remove once the sharing propagation bug is confirmed fixed.
        console.log(`[Sharing v2] subscribeToSharedItemData: read ${path} -> exists=${snap.exists()}`, snap.data());
        if (snap.exists()) {
          store[ref.category][ref.itemId] = {
            ...snap.data(),
            id: ref.itemId,
            __sharedByEmail: ref.ownerEmail, // marks it as shared-in, for the badge + write-back
          };
        } else {
          delete store[ref.category][ref.itemId];
        }
        emit();
      },
      (err) => {
        console.error(`[Sharing v2] Error reading shared item at ${path}:`, err);
      }
    );
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
