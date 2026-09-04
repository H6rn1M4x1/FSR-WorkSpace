import { db, auth } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { setStoredDataSilent, addDeletedId, getDeletedIds } from "./storage";

export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item));
  }
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) {
      clean[key] = null;
    } else if (typeof val !== "function") {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean;
}

const DEFAULT_USER_ID = "hernanmaximiliano10@gmail.com";

// Session device ID to avoid self-triggering refetches on the device that made the change
const getSessionDeviceId = (): string => {
  if (typeof window !== "undefined") {
    if (!(window as any).__sessionDeviceId) {
      (window as any).__sessionDeviceId =
        "dev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    }
    return (window as any).__sessionDeviceId;
  }
  return "device_server";
};

export function getEffectiveUserId(userId?: string): string {
  let target = "";
  if (
    userId &&
    userId.trim() &&
    !userId.startsWith("ya29.") &&
    !userId.startsWith("eyJ") &&
    !userId.includes(" ") &&
    userId.length < 80
  ) {
    target = userId.trim();
  } else if (auth.currentUser?.email) {
    target = auth.currentUser.email;
  } else if (auth.currentUser?.uid) {
    target = auth.currentUser.uid;
  } else {
    target = DEFAULT_USER_ID;
  }
  return target.toLowerCase();
}

type CategoryCallback = (items: any[]) => void;

interface SubscriptionGroup {
  callbacks: Set<CategoryCallback>;
  lastData: any[] | null;
}

const activeSubscriptions: Record<string, SubscriptionGroup> = {};

// Global single-document sync listener state
let currentSyncUser = "";
let unsubSyncStatus: Unsubscribe | null = null;
let lastProcessedSyncTime = 0;

// Debouncing for sync status writes
let touchSyncTimer: any = null;
const pendingUpdatedCategories = new Set<string>();

/**
 * Debounced update to the light sync document: users/{userId}/sync/status
 * Prevents rapid consecutive writes to Firestore metadata (300-500ms debounce)
 */
export function touchSyncStatus(userId: string, category?: string): void {
  const effectiveUserId = getEffectiveUserId(userId);
  if (category) {
    pendingUpdatedCategories.add(category);
  }

  if (touchSyncTimer) {
    clearTimeout(touchSyncTimer);
  }

  touchSyncTimer = setTimeout(async () => {
    touchSyncTimer = null;
    const catsToNotify = Array.from(pendingUpdatedCategories);
    pendingUpdatedCategories.clear();

    const catPayload = catsToNotify.length === 1 ? catsToNotify[0] : "all";
    const statusRef = doc(db, "users", effectiveUserId, "sync", "status");
    const deviceId = getSessionDeviceId();
    const now = Date.now();
    lastProcessedSyncTime = now;

    try {
      await setDoc(
        statusRef,
        {
          lastUpdated: now,
          category: catPayload,
          updatedCategories: catsToNotify,
          deviceId: deviceId
        },
        { merge: true }
      );
      console.log(`[FirestoreSync] Updated sync status for user ${effectiveUserId} (cats: ${catPayload})`);
    } catch (err) {
      console.warn(`[FirestoreSync] Failed to update sync status:`, err);
    }
  }, 400); // 400ms debounce
}

/**
 * Initializes the lightweight SINGLE-DOCUMENT listener for real-time multi-device sync.
 * Listens ONLY to users/{userId}/sync/status document.
 */
export function initGlobalSyncListener(userId: string): void {
  const effectiveUserId = getEffectiveUserId(userId);

  if (currentSyncUser === effectiveUserId && unsubSyncStatus) {
    return; // Already listening to this user's sync status
  }

  if (unsubSyncStatus) {
    try {
      unsubSyncStatus();
    } catch (_) {}
    unsubSyncStatus = null;
  }

  currentSyncUser = effectiveUserId;
  const statusRef = doc(db, "users", effectiveUserId, "sync", "status");

  console.log(`[FirestoreSync] Initializing single-document sync listener on users/${effectiveUserId}/sync/status`);

  unsubSyncStatus = onSnapshot(
    statusRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (!data || !data.lastUpdated) return;

      const deviceId = getSessionDeviceId();

      // If this change was made by the CURRENT device, ignore it (already updated optimistically)
      if (data.deviceId === deviceId) {
        lastProcessedSyncTime = data.lastUpdated;
        return;
      }

      // If timestamp is not newer than what we last processed, ignore
      if (data.lastUpdated <= lastProcessedSyncTime) {
        return;
      }

      lastProcessedSyncTime = data.lastUpdated;
      console.log(`[FirestoreSync] Remote change detected from device ${data.deviceId}. Refetching updated data...`);

      const catPayload = data.category || "all";
      const catList: string[] = Array.isArray(data.updatedCategories) && data.updatedCategories.length > 0
        ? data.updatedCategories
        : catPayload !== "all" ? [catPayload] : [];

      if (catList.length > 0) {
        catList.forEach((cat) => {
          refetchCategory(effectiveUserId, cat, true);
        });
      } else {
        // Refetch all active subscribed categories
        Object.keys(activeSubscriptions).forEach((subKey) => {
          const prefix = `${effectiveUserId}_`;
          if (subKey.startsWith(prefix)) {
            const catName = subKey.replace(prefix, "");
            refetchCategory(effectiveUserId, catName, true);
          }
        });
      }
    },
    (error) => {
      console.warn(`[FirestoreSync] Single-document sync listener error:`, error?.message || error);
    }
  );
}

/**
 * Refetches a category on demand using a single static getDocs call,
 * updating memory cache, local storage, and notifying all registered React state callbacks.
 */
export async function refetchCategory(userId: string, category: string, forceServer: boolean = false): Promise<any[]> {
  const effectiveUserId = getEffectiveUserId(userId);
  const subKey = `${effectiveUserId}_${category}`;
  const group = activeSubscriptions[subKey];

  const colRef = collection(db, "users", effectiveUserId, category);
  try {
    // When we KNOW something changed elsewhere (forceServer=true), bypass the local cache —
    // a plain getDocs() can return cached data first when the persistent local cache is
    // enabled, which would silently defeat the purpose of refetching. For the initial load
    // (forceServer=false) we keep using the fast, cache-friendly getDocs().
    const snapshot = forceServer ? await getDocsFromServer(colRef) : await getDocs(colRef);
    const deletedIds = getDeletedIds();
    const remoteItems: any[] = [];
    if (!snapshot.empty) {
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = String(data?.id || docSnap.id);
        if (data && !deletedIds.has(docId)) {
          remoteItems.push({
            ...data,
            id: docId
          });
        }
      });
    }

    if (group) {
      group.lastData = remoteItems;
      group.callbacks.forEach((cb) => {
        try {
          cb(remoteItems);
        } catch (e) {
          console.error(`[FirestoreSync] Callback error for category ${category}:`, e);
        }
      });
    }

    setStoredDataSilent(category, remoteItems);
    return remoteItems;
  } catch (error: any) {
    console.warn(`[FirestoreSync] Refetch error for ${category}:`, error?.message || error);
    return group?.lastData || [];
  }
}

/**
 * Optimistic save of a single item to Firestore:
 * 1. Immediately updates local React state callbacks and cache (Optimistic UI)
 * 2. Writes to Firestore in background
 * 3. Triggers debounced touchSyncStatus to notify other devices
 */
export async function saveItemToFirestore(
  userId: string,
  category: string,
  item: any
): Promise<boolean> {
  if (!item || item.id == null) {
    throw new Error("Elemento o ID no válido para guardar en Firestore.");
  }
  const effectiveUserId = getEffectiveUserId(userId);
  if (!effectiveUserId) {
    throw new Error("Usuario no identificado para guardar en Firestore.");
  }

  const docId = String(item.id);
  const docPath = `users/${effectiveUserId}/${category}/${docId}`;

  const sanitized = sanitizeForFirestore({
    ...item,
    updatedAt: item.updatedAt || Date.now()
  });

  // OPTIMISTIC UI UPDATE
  const subKey = `${effectiveUserId}_${category}`;
  const group = activeSubscriptions[subKey];
  const previousData = group?.lastData ? [...group.lastData] : null;

  if (group) {
    const currentList = group.lastData ? [...group.lastData] : [];
    const index = currentList.findIndex((i) => String(i.id) === docId);
    if (index >= 0) {
      currentList[index] = sanitized;
    } else {
      currentList.push(sanitized);
    }
    group.lastData = currentList;
    setStoredDataSilent(category, currentList);

    // Trigger local React state callbacks immediately (Instant UI)
    group.callbacks.forEach((cb) => {
      try {
        cb(currentList);
      } catch (e) {
        console.error(`[FirestoreSync] Optimistic callback error for ${category}:`, e);
      }
    });
  }

  try {
    const docRef = doc(db, "users", effectiveUserId, category, docId);
    await setDoc(docRef, sanitized, { merge: true });

    // Touch sync status document so other devices know data changed
    touchSyncStatus(effectiveUserId, category);
    return true;
  } catch (error: any) {
    console.error(`[FirestoreSync] Error in saveItemToFirestore (${docPath}):`, error);

    // REVERT OPTIMISTIC UPDATE ON ERROR
    if (group && previousData !== null) {
      group.lastData = previousData;
      setStoredDataSilent(category, previousData);
      group.callbacks.forEach((cb) => {
        try { cb(previousData); } catch (_) {}
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sync_save_error", {
          detail: { error: error?.message || "Error al guardar en servidor" }
        })
      );
    }
    throw error;
  }
}

/**
 * Optimistic delete of a single item from Firestore:
 * 1. Immediately updates local React state callbacks and cache (Optimistic UI)
 * 2. Deletes from Firestore in background
 * 3. Triggers debounced touchSyncStatus to notify other devices
 */
export async function deleteItemFromFirestore(
  userId: string,
  category: string,
  itemId: string | number
): Promise<boolean> {
  if (itemId == null || itemId === "" || itemId === "undefined") {
    return false;
  }
  const effectiveUserId = getEffectiveUserId(userId);
  if (!effectiveUserId) return false;

  const docId = String(itemId);
  const docPath = `users/${effectiveUserId}/${category}/${docId}`;

  // Record deleted ID immediately so background refetches/syncs will not resurrect it
  addDeletedId(docId);

  // OPTIMISTIC UI UPDATE
  const subKey = `${effectiveUserId}_${category}`;
  const group = activeSubscriptions[subKey];
  const previousData = group?.lastData ? [...group.lastData] : null;

  if (group && group.lastData) {
    const updatedList = group.lastData.filter((i) => String(i.id) !== docId);
    group.lastData = updatedList;
    setStoredDataSilent(category, updatedList);

    group.callbacks.forEach((cb) => {
      try {
        cb(updatedList);
      } catch (e) {
        console.error(`[FirestoreSync] Optimistic delete callback error for ${category}:`, e);
      }
    });
  }

  try {
    const docRef = doc(db, "users", effectiveUserId, category, docId);
    await deleteDoc(docRef);

    // Touch sync status document so other devices know data changed
    touchSyncStatus(effectiveUserId, category);
    return true;
  } catch (error: any) {
    console.warn(`[FirestoreSync] Error in deleteItemFromFirestore (${docPath}):`, error);

    // REVERT OPTIMISTIC UPDATE ON ERROR
    if (group && previousData !== null) {
      group.lastData = previousData;
      setStoredDataSilent(category, previousData);
      group.callbacks.forEach((cb) => {
        try { cb(previousData); } catch (_) {}
      });
    }
    return false;
  }
}

/**
 * Saves an entire category to Firestore. Deletes removed documents.
 */
export async function saveCategoryToFirestore(
  userId: string,
  category: string,
  items: any[],
  previousItems?: any[]
): Promise<boolean> {
  if (!Array.isArray(items)) return false;
  const effectiveUserId = getEffectiveUserId(userId);

  try {
    const newDocIds = new Set<string>();
    const savePromises = items.map((item) => {
      if (item && item.id != null) {
        newDocIds.add(String(item.id));
        return saveItemToFirestore(effectiveUserId, category, item);
      }
      return Promise.resolve(true);
    });

    const deletePromises: Promise<boolean>[] = [];
    if (Array.isArray(previousItems)) {
      previousItems.forEach((oldItem) => {
        const oldId = oldItem?.id != null ? String(oldItem.id) : null;
        if (oldId && !newDocIds.has(oldId)) {
          deletePromises.push(deleteItemFromFirestore(effectiveUserId, category, oldId));
        }
      });
    }

    await Promise.all([...savePromises, ...deletePromises]);
    return true;
  } catch (error) {
    console.error(`[FirestoreSync] Error saving category ${category}:`, error);
    return false;
  }
}

/**
 * Subscribes a React component / state callback to a data category.
 * - Ensures single-document global sync listener is running for this user.
 * - Runs initial static fetch or serves cached data immediately.
 * - Registers callback to be updated whenever local changes or remote device sync events occur.
 */
export function subscribeToCategory(
  userId: string,
  category: string,
  onUpdate: CategoryCallback
): Unsubscribe {
  const effectiveUserId = getEffectiveUserId(userId);
  const subKey = `${effectiveUserId}_${category}`;

  // Ensure global single-document listener is active for this user
  initGlobalSyncListener(effectiveUserId);

  if (!activeSubscriptions[subKey]) {
    const callbacks = new Set<CategoryCallback>();
    callbacks.add(onUpdate);

    const group: SubscriptionGroup = {
      callbacks,
      lastData: null
    };

    activeSubscriptions[subKey] = group;

    // Fetch initial static snapshot for this category
    refetchCategory(effectiveUserId, category);
  } else {
    const group = activeSubscriptions[subKey];
    group.callbacks.add(onUpdate);

    // If cached data exists, immediately notify new subscriber
    if (group.lastData !== null) {
      try {
        onUpdate(group.lastData);
      } catch (e) {
        console.error(`[FirestoreSync] Initial callback error for category ${category}:`, e);
      }
    }
  }

  return () => {
    const group = activeSubscriptions[subKey];
    if (group) {
      group.callbacks.delete(onUpdate);
      if (group.callbacks.size === 0) {
        delete activeSubscriptions[subKey];
      }
    }
  };
}

/**
 * Unsubscribes all active listeners and cleans up the global sync listener.
 */
export function unsubscribeAllCategories(): void {
  Object.keys(activeSubscriptions).forEach((key) => {
    delete activeSubscriptions[key];
  });

  if (unsubSyncStatus) {
    try {
      unsubSyncStatus();
    } catch (_) {}
    unsubSyncStatus = null;
  }
  currentSyncUser = "";
}

