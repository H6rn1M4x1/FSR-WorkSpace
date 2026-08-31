const parseTimestamp = (val: any): number => {
  if (typeof val === "number" && !isNaN(val) && val > 0) return val;
  if (typeof val === "string" && val.trim().length > 0) {
    const t = new Date(val).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
};

export function reconcileCollection<T extends { id?: string | number; updatedAt?: string | number }>(
  localList: T[] | undefined | null,
  serverList: T[] | undefined | null,
  options?: {
    deletedIds?: Set<string | number> | (string | number)[];
    isLocalAction?: boolean;
  }
): { merged: T[]; hasLocalOnly: boolean } {
  const safeLocal = Array.isArray(localList) ? localList : [];
  const safeServer = Array.isArray(serverList) ? serverList : [];

  const deletedSet = new Set<string>();
  if (options?.deletedIds) {
    if (options.deletedIds instanceof Set) {
      options.deletedIds.forEach(id => deletedSet.add(String(id)));
    } else if (Array.isArray(options.deletedIds)) {
      options.deletedIds.forEach(id => deletedSet.add(String(id)));
    }
  }

  // Filter out any deleted items right away
  const cleanLocal = safeLocal.filter(item => item && item.id != null && !deletedSet.has(String(item.id)));
  const cleanServer = safeServer.filter(item => item && item.id != null && !deletedSet.has(String(item.id)));

  if (cleanServer.length === 0 && cleanLocal.length === 0) {
    return { merged: [], hasLocalOnly: false };
  }

  const now = Date.now();

  if (cleanServer.length === 0) {
    const stampedLocal = cleanLocal.map(item => ({
      ...item,
      updatedAt: parseTimestamp((item as any).updatedAt) || now,
    }));
    return {
      merged: stampedLocal,
      hasLocalOnly: stampedLocal.length > 0,
    };
  }

  if (cleanLocal.length === 0) {
    if (options?.isLocalAction) {
      // Local explicit action emptied the list, respect local empty state
      return { merged: [], hasLocalOnly: false };
    }
    const stampedServer = cleanServer.map(item => ({
      ...item,
      updatedAt: parseTimestamp((item as any).updatedAt) || now,
    }));
    return {
      merged: stampedServer,
      hasLocalOnly: false,
    };
  }

  const serverMap = new Map<string, T>();
  cleanServer.forEach((item) => {
    const key = String(item.id || "");
    if (key) serverMap.set(key, item);
  });

  let hasLocalOnly = false;
  const mergedMap = new Map<string, T>();

  // Process local items first
  cleanLocal.forEach((localItem) => {
    const key = String(localItem.id || "");
    if (!key) {
      const generatedKey = `local_${Math.random().toString(36).substring(2)}`;
      mergedMap.set(generatedKey, {
        ...localItem,
        updatedAt: parseTimestamp((localItem as any).updatedAt) || now,
      });
      hasLocalOnly = true;
      return;
    }

    if (!serverMap.has(key)) {
      mergedMap.set(key, {
        ...localItem,
        updatedAt: parseTimestamp((localItem as any).updatedAt) || now,
      });
      hasLocalOnly = true;
    } else {
      const serverItem = serverMap.get(key)!;
      const localTime = parseTimestamp((localItem as any).updatedAt) || now;
      const serverTime = parseTimestamp((serverItem as any).updatedAt) || now;

      if (localTime >= serverTime) {
        mergedMap.set(key, {
          ...localItem,
          updatedAt: localTime,
        });
      } else {
        mergedMap.set(key, {
          ...serverItem,
          updatedAt: serverTime,
        });
      }
    }
  });

  // Process server items that are NOT in local list
  cleanServer.forEach((serverItem) => {
    const key = String(serverItem.id || "");
    if (!key || mergedMap.has(key)) return;

    if (deletedSet.has(key)) return;

    // If local list was updated via active local action, do not re-inject omitted server items
    if (options?.isLocalAction) {
      return;
    }

    mergedMap.set(key, {
      ...serverItem,
      updatedAt: parseTimestamp((serverItem as any).updatedAt) || now,
    });
  });

  // Final sanity check: ensure no deleted items remain and every item has a numerical updatedAt
  const merged = Array.from(mergedMap.values())
    .filter(item => item && item.id != null && !deletedSet.has(String(item.id)))
    .map(item => ({
      ...item,
      updatedAt: typeof (item as any).updatedAt === "number" && (item as any).updatedAt > 0
        ? (item as any).updatedAt
        : (parseTimestamp((item as any).updatedAt) || now)
    }));

  return { merged, hasLocalOnly };
}

/**
 * Sanitizes and optimizes sync payloads to keep payload sizes lean and avoid HTTP 413 or Socket buffer errors.
 * - Strips non-data transient aesthetic state properties
 * - Truncates excessively large base64 strings (over 150KB per item string)
 */
export function sanitizeSyncPayload(data: any): any {
  if (data === null || data === undefined) return data;

  const MAX_BASE64_LENGTH = 150000; // ~150KB limit per base64 image field for socket/sync payloads

  if (typeof data === "string") {
    if (data.startsWith("data:") && data.includes(";base64,") && data.length > MAX_BASE64_LENGTH) {
      return data.substring(0, 80) + "...[BASE64_OPTIMIZED_FOR_SYNC]";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSyncPayload(item));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, any> = {};
    const AESTHETIC_KEYS = new Set([
      "themeColor", "theme_color", "backgroundStyle", "liquid_background_style",
      "darkMode", "dark_mode", "menuVisibility", "app_menu_visibility",
      "sidebarOpen", "activeSubTab", "currentTab"
    ]);

    for (const key of Object.keys(data)) {
      if (AESTHETIC_KEYS.has(key)) continue;
      sanitized[key] = sanitizeSyncPayload(data[key]);
    }
    return sanitized;
  }

  return data;
}

/**
 * Helper to perform fetch requests with an AbortController timeout (default 5000ms).
 * Prevents requests from hanging indefinitely or causing browser resource exhaustion (ERR_INSUFFICIENT_RESOURCES).
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ensures clean relative URLs without malformed formatting or double slashes,
 * preventing net::ERR_INVALID_URL errors in fetch calls.
 */
export function cleanRelativeUrl(endpoint: string): string {
  if (!endpoint) return "/";
  let cleaned = endpoint.trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      const parsed = new URL(cleaned);
      cleaned = parsed.pathname + parsed.search;
    } catch (_) {
      cleaned = "/" + cleaned.replace(/^https?:\/\/[^/]+/, "");
    }
  }
  if (!cleaned.startsWith("/")) {
    cleaned = "/" + cleaned;
  }
  return cleaned.replace(/\/+/g, "/");
}

// Global state save queue, cooldown, and debounce manager
let pendingSaveBatch: Record<string, any> = {};
let debouncedSaveTimer: any = null;
let activeUserId = "hernanmaximiliano10@gmail.com";

let emergencySaveCooldownUntil = 0;
const EMERGENCY_COOLDOWN_MS = 10000; // 10 seconds strict cooldown on force-save failure
let hasDispatchedFailureNotification = false;

// Attach user activity listeners to reset failure notification state on user action
if (typeof window !== "undefined") {
  const handleUserActivity = () => {
    hasDispatchedFailureNotification = false;
  };
  window.addEventListener("pointerdown", handleUserActivity, { passive: true });
  window.addEventListener("keydown", handleUserActivity, { passive: true });
}

/**
 * Sends lightweight individual mutations or chunked payloads to /api/mutations REST endpoint
 * with AbortController 5000ms timeout.
 */
export async function postGranularMutation(
  userId: string,
  category: string,
  action: string,
  payload: any,
  senderId?: string,
  itemId?: string | number,
  chunkInfo?: { chunkIndex: number; totalChunks: number }
): Promise<{ success: boolean; message?: string }> {
  try {
    const targetUrl = cleanRelativeUrl("/api/mutations");
    const res = await fetchWithTimeout(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        category,
        action,
        payload,
        itemId,
        senderId: senderId || "client_mutation",
        chunkIndex: chunkInfo?.chunkIndex,
        totalChunks: chunkInfo?.totalChunks,
      }),
    }, 5000);

    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        return { success: true, message: json.message };
      }
    }
    return { success: false, message: `Mutation failed with HTTP ${res.status}` };
  } catch (err: any) {
    console.error("[Sync] Granular mutation request error:", err);
    return { success: false, message: err?.message || "Mutation network error" };
  }
}

/**
 * Emergency direct disk save fallback when primary socket or HTTP endpoint fails.
 * Throttled to 1 attempt max with 10-second cooldown on failure and 5000ms AbortController timeout.
 */
export async function forceEmergencySave(
  userId: string,
  payload: any,
  category: string = "emergency",
  senderId?: string
): Promise<{ success: boolean; message?: string }> {
  const now = Date.now();
  if (now < emergencySaveCooldownUntil) {
    console.warn(`[Sync] Force-save in cooldown (${Math.ceil((emergencySaveCooldownUntil - now) / 1000)}s remaining). Skipping request.`);
    return { success: false, message: "Conexión inestable: los cambios se mantendrán localmente" };
  }

  try {
    const cleanPayload = sanitizeSyncPayload(payload);
    const targetUrl = cleanRelativeUrl("/api/workspace/force-save");
    const res = await fetchWithTimeout(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        payload: cleanPayload,
        category,
        senderId: senderId || "client_force_save",
      }),
    }, 5000);

    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        return { success: true, message: json.message };
      }
    }

    // On non-OK HTTP status, trigger 10-second cooldown
    emergencySaveCooldownUntil = Date.now() + EMERGENCY_COOLDOWN_MS;
    dispatchFailureToast("Conexión inestable: los cambios se mantendrán localmente", category);
    return { success: false, message: `Emergency save failed with HTTP ${res.status}` };
  } catch (err: any) {
    console.error("[Sync] Emergency save request failed:", err);
    emergencySaveCooldownUntil = Date.now() + EMERGENCY_COOLDOWN_MS;
    dispatchFailureToast("Conexión inestable: los cambios se mantendrán localmente", category);
    return { success: false, message: err?.message || "Emergency save network error" };
  }
}

/**
 * Single-dispatch notification helper to prevent spamming toasts in loops
 */
function dispatchFailureToast(message: string, category: string) {
  if (typeof window !== "undefined" && !hasDispatchedFailureNotification) {
    hasDispatchedFailureNotification = true;
    window.dispatchEvent(
      new CustomEvent("sync_save_error", {
        detail: {
          error: message,
          category,
        },
      })
    );
  }
}

/**
 * Saves state payload to /api/sync/state with 5000ms AbortController timeout, chunking, and throttled emergency fallback.
 * NEVER deletes or clears local state on error.
 */
export async function saveStateToServer(
  userId: string,
  payload: any,
  category: string = "global",
  senderId?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const cleanPayload = sanitizeSyncPayload(payload);
    const strPayload = JSON.stringify(cleanPayload);
    const PAYLOAD_MAX_BYTES = 500 * 1024; // 500KB strict threshold to prevent HTTP 413

    // 1. Fragment payload into chunked REST mutations if total string length exceeds 500KB
    if (strPayload.length > PAYLOAD_MAX_BYTES) {
      console.warn(`[Sync] Payload size (${strPayload.length} bytes) exceeds 500KB limit. Fragmenting payload into REST mutations...`);

      if (typeof cleanPayload === "object" && cleanPayload !== null && !Array.isArray(cleanPayload)) {
        let allSucceeded = true;
        const categories = Object.keys(cleanPayload);

        for (const cat of categories) {
          const catData = cleanPayload[cat];
          const catStr = JSON.stringify(catData);

          if (Array.isArray(catData) && catStr.length > 250 * 1024) {
            const CHUNK_SIZE = 30;
            const totalChunks = Math.ceil(catData.length / CHUNK_SIZE);

            for (let i = 0; i < totalChunks; i++) {
              const chunk = catData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              const mutRes = await postGranularMutation(
                userId,
                cat,
                "CHUNK_UPDATE",
                chunk,
                senderId,
                undefined,
                { chunkIndex: i, totalChunks }
              );
              if (!mutRes.success) {
                allSucceeded = false;
              }
            }
          } else {
            const mutRes = await postGranularMutation(userId, cat, "UPDATE", catData, senderId);
            if (!mutRes.success) {
              allSucceeded = false;
            }
          }
        }

        if (allSucceeded) {
          return { success: true, message: "Estado fragmentado y guardado correctamente por partes." };
        }
      }
    }

    // 2. Primary HTTP save via /api/sync/state with 5000ms timeout
    const targetUrl = cleanRelativeUrl("/api/sync/state");
    const res = await fetchWithTimeout(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        payload: cleanPayload,
        category,
        senderId: senderId || "client_http",
      }),
    }, 5000);

    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && json.success) {
        return { success: true, message: json.message };
      }
    }

    // 3. Fallback to emergency direct disk save endpoint (throttled)
    console.warn(`[Sync] POST /api/sync/state returned non-OK status (${res.status}). Triggering throttled emergency force-save...`);
    const emergencyRes = await forceEmergencySave(userId, cleanPayload, category, senderId);

    if (emergencyRes.success) {
      return emergencyRes;
    }

    dispatchFailureToast("Conexión inestable: los cambios se mantendrán localmente", category);
    return {
      success: false,
      message: `No se pudo guardar en servidor (HTTP ${res.status}). Datos conservados en local.`,
    };
  } catch (err: any) {
    console.error("[Sync] Network error in saveStateToServer, attempting emergency force-save...", err);
    const emergencyRes = await forceEmergencySave(userId, payload, category, senderId);

    if (!emergencyRes.success) {
      dispatchFailureToast("Conexión inestable: los cambios se mantendrán localmente", category);
    }

    return emergencyRes.success
      ? emergencyRes
      : {
          success: false,
          message: err?.message || "Error de red al guardar. Los datos permanecen guardados localmente.",
        };
  }
}

/**
 * Queues and debounces state saving (500ms-1000ms, default 750ms) to prevent server spam.
 * Respects cooldown to prevent background loops when connection fails.
 */
export function saveStateWithDebounce(
  userId: string,
  category: string,
  payload: any,
  senderId?: string,
  delayMs: number = 750
): void {
  activeUserId = userId || activeUserId;

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    pendingSaveBatch = { ...pendingSaveBatch, ...payload };
  } else if (category) {
    pendingSaveBatch[category] = payload;
  }

  if (debouncedSaveTimer) {
    clearTimeout(debouncedSaveTimer);
  }

  debouncedSaveTimer = setTimeout(async () => {
    const now = Date.now();
    if (now < emergencySaveCooldownUntil) {
      console.warn("[Sync] Skipping debounced save due to active cooldown window.");
      debouncedSaveTimer = null;
      return;
    }

    const dataToSend = { ...pendingSaveBatch };
    pendingSaveBatch = {};
    debouncedSaveTimer = null;

    if (Object.keys(dataToSend).length > 0) {
      const cat = Object.keys(dataToSend).length === 1 ? Object.keys(dataToSend)[0] : category || "debounced_sync";
      await saveStateToServer(activeUserId, dataToSend, cat, senderId);
    }
  }, delayMs);
}


