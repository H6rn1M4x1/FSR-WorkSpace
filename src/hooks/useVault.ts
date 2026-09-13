import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateMEK,
  wrapMEK,
  unwrapMEK,
  generateRecoveryPhrase,
  normalizeSecret,
  encryptJSON,
  decryptJSON,
} from "../lib/vaultCrypto";
import {
  fetchVaultConfig,
  subscribeVaultConfig,
  saveVaultConfig,
  subscribeVaultItems,
  saveVaultItem,
  deleteVaultItem,
} from "../lib/vaultService";
import type { VaultConfig, VaultItemDecrypted, VaultItemEncrypted } from "../types";

const AUTO_LOCK_MS = 5 * 60 * 1000; // lock after 5 minutes of inactivity

export type VaultStatus = "loading" | "not_setup" | "locked" | "unlocked";

interface UseVaultResult {
  status: VaultStatus;
  config: VaultConfig | null;
  items: VaultItemDecrypted[];
  error: string | null;
  setupVault: (masterPassword: string) => Promise<{ recoveryPhrase: string } | null>;
  unlockWithPassword: (masterPassword: string) => Promise<boolean>;
  unlockWithRecoveryPhrase: (phrase: string) => Promise<boolean>;
  changeMasterPassword: (newPassword: string) => Promise<boolean>;
  lock: () => void;
  saveItem: (item: Omit<VaultItemDecrypted, "createdAt" | "updatedAt"> & { createdAt?: number }) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setRequireTotpToReveal: (value: boolean) => Promise<void>;
}

/**
 * Owns the vault's unlock state and the master encryption key (MEK), which lives
 * ONLY in a React ref in memory — never in localStorage, never sent to the server.
 * Locking (explicit, on inactivity, or on tab close) simply drops that ref.
 */
export function useVault(userId: string | null | undefined): UseVaultResult {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [encryptedItems, setEncryptedItems] = useState<VaultItemEncrypted[]>([]);
  const [decryptedItems, setDecryptedItems] = useState<VaultItemDecrypted[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mekRef = useRef<Uint8Array | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    mekRef.current = null;
    setDecryptedItems([]);
    setStatus((prev) => (prev === "unlocked" ? "locked" : prev));
  }, []);

  const armAutoLock = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(lock, AUTO_LOCK_MS);
  }, [lock]);

  // Reset the inactivity timer on user interaction while unlocked.
  useEffect(() => {
    if (status !== "unlocked") return;
    const bump = () => armAutoLock();
    bump();
    window.addEventListener("mousedown", bump);
    window.addEventListener("keydown", bump);
    window.addEventListener("visibilitychange", bump);
    return () => {
      window.removeEventListener("mousedown", bump);
      window.removeEventListener("keydown", bump);
      window.removeEventListener("visibilitychange", bump);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [status, armAutoLock]);

  // Always lock when the tab/app is closed or the user logs out.
  useEffect(() => {
    const onUnload = () => lock();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [lock]);

  useEffect(() => {
    mekRef.current = null;
    setDecryptedItems([]);
    if (!userId) {
      setStatus("loading");
      return;
    }
    setStatus("loading");
    let cancelled = false;
    fetchVaultConfig(userId).then((cfg) => {
      if (cancelled) return;
      setConfig(cfg);
      setStatus(cfg ? "locked" : "not_setup");
    });
    const unsubConfig = subscribeVaultConfig(userId, (cfg) => {
      setConfig(cfg);
      setStatus((prev) => {
        if (prev === "unlocked") return prev; // don't yank an open session
        return cfg ? "locked" : "not_setup";
      });
    });
    const unsubItems = subscribeVaultItems(userId, setEncryptedItems);
    return () => {
      cancelled = true;
      unsubConfig();
      unsubItems();
    };
  }, [userId]);

  // Whenever the encrypted list changes while unlocked, re-decrypt in place.
  useEffect(() => {
    const mek = mekRef.current;
    if (status !== "unlocked" || !mek) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        encryptedItems.map(async (enc) => {
          const plain = await decryptJSON<Omit<VaultItemDecrypted, "id" | "createdAt" | "updatedAt">>(mek, enc);
          if (!plain) return null;
          return { ...plain, id: enc.id, createdAt: enc.createdAt, updatedAt: enc.updatedAt } as VaultItemDecrypted;
        })
      );
      if (!cancelled) {
        setDecryptedItems(results.filter((x): x is VaultItemDecrypted => x !== null));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encryptedItems, status]);

  const setupVault = useCallback(
    async (masterPassword: string) => {
      if (!userId) return null;
      setError(null);
      try {
        const mek = generateMEK();
        const recoveryPhrase = generateRecoveryPhrase(12);
        const wrappedByPassword = await wrapMEK(mek, normalizeSecret(masterPassword));
        const wrappedByRecovery = await wrapMEK(mek, normalizeSecret(recoveryPhrase));
        const now = Date.now();
        const newConfig: VaultConfig = {
          id: userId,
          wrappedByPassword,
          wrappedByRecovery,
          requireTotpToReveal: false,
          createdAt: now,
          updatedAt: now,
        };
        await saveVaultConfig(userId, newConfig);
        mekRef.current = mek;
        setConfig(newConfig);
        setStatus("unlocked");
        return { recoveryPhrase };
      } catch (err: any) {
        setError(err?.message || "No se pudo crear la caja fuerte.");
        return null;
      }
    },
    [userId]
  );

  const unlockWithPassword = useCallback(
    async (masterPassword: string) => {
      if (!config) return false;
      setError(null);
      const mek = await unwrapMEK(config.wrappedByPassword, normalizeSecret(masterPassword));
      if (!mek) {
        setError("Clave maestra incorrecta.");
        return false;
      }
      mekRef.current = mek;
      setStatus("unlocked");
      return true;
    },
    [config]
  );

  const unlockWithRecoveryPhrase = useCallback(
    async (phrase: string) => {
      if (!config) return false;
      setError(null);
      const mek = await unwrapMEK(config.wrappedByRecovery, normalizeSecret(phrase));
      if (!mek) {
        setError("Frase de recuperación incorrecta.");
        return false;
      }
      mekRef.current = mek;
      setStatus("unlocked");
      return true;
    },
    [config]
  );

  const changeMasterPassword = useCallback(
    async (newPassword: string) => {
      if (!userId || !config || !mekRef.current) return false;
      setError(null);
      try {
        const wrappedByPassword = await wrapMEK(mekRef.current, normalizeSecret(newPassword));
        const updated: VaultConfig = { ...config, wrappedByPassword, updatedAt: Date.now() };
        await saveVaultConfig(userId, updated);
        setConfig(updated);
        return true;
      } catch (err: any) {
        setError(err?.message || "No se pudo cambiar la clave maestra.");
        return false;
      }
    },
    [userId, config]
  );

  const setRequireTotpToReveal = useCallback(
    async (value: boolean) => {
      if (!userId || !config) return;
      const updated: VaultConfig = { ...config, requireTotpToReveal: value, updatedAt: Date.now() };
      await saveVaultConfig(userId, updated);
      setConfig(updated);
    },
    [userId, config]
  );

  const saveItem = useCallback(
    async (item: Omit<VaultItemDecrypted, "createdAt" | "updatedAt"> & { createdAt?: number }) => {
      if (!userId || !mekRef.current) throw new Error("La caja fuerte está bloqueada.");
      const now = Date.now();
      const { id, ...rest } = item;
      const blob = await encryptJSON(mekRef.current, rest);
      const encrypted: VaultItemEncrypted = {
        id,
        ...blob,
        createdAt: item.createdAt || now,
        updatedAt: now,
      };
      await saveVaultItem(userId, encrypted);
    },
    [userId]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!userId) return;
      await deleteVaultItem(userId, id);
    },
    [userId]
  );

  return useMemo(
    () => ({
      status,
      config,
      items: decryptedItems,
      error,
      setupVault,
      unlockWithPassword,
      unlockWithRecoveryPhrase,
      changeMasterPassword,
      lock,
      saveItem,
      deleteItem,
      setRequireTotpToReveal,
    }),
    [
      status,
      config,
      decryptedItems,
      error,
      setupVault,
      unlockWithPassword,
      unlockWithRecoveryPhrase,
      changeMasterPassword,
      lock,
      saveItem,
      deleteItem,
      setRequireTotpToReveal,
    ]
  );
}
