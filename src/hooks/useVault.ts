import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateMEK,
  wrapMEK,
  unwrapMEK,
  generateRecoveryPhrase,
  normalizeSecret,
  encryptJSON,
  decryptJSON,
  persistVaultUnlock,
  loadPersistedVaultUnlock,
  clearPersistedVaultUnlock,
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
 * Owns the vault's unlock state and the master encryption key (MEK).
 *
 * By request, the vault should only ask for the master password again after an
 * explicit logout or an explicit "Bloquear" — not on every reload, tab close,
 * or idle period (that was the annoying part). So once unlocked, the MEK is
 * cached in localStorage (see persistVaultUnlock in vaultCrypto.ts) and
 * rehydrated on mount, instead of living only in a memory ref. It's removed
 * from storage by lock() and by the caller on logout.
 */
export function useVault(userId: string | null | undefined): UseVaultResult {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [config, setConfig] = useState<VaultConfig | null>(null);
  const [encryptedItems, setEncryptedItems] = useState<VaultItemEncrypted[]>([]);
  const [decryptedItems, setDecryptedItems] = useState<VaultItemDecrypted[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mekRef = useRef<Uint8Array | null>(null);
  const userIdRef = useRef<string | null | undefined>(userId);
  userIdRef.current = userId;

  const lock = useCallback(() => {
    mekRef.current = null;
    setDecryptedItems([]);
    if (userIdRef.current) clearPersistedVaultUnlock(userIdRef.current);
    setStatus((prev) => (prev === "unlocked" ? "locked" : prev));
  }, []);

  useEffect(() => {
    setDecryptedItems([]);
    if (!userId) {
      mekRef.current = null;
      setStatus("loading");
      return;
    }
    setStatus("loading");
    let cancelled = false;
    const persistedMek = loadPersistedVaultUnlock(userId);
    fetchVaultConfig(userId).then((cfg) => {
      if (cancelled) return;
      setConfig(cfg);
      if (!cfg) {
        // Vault was never set up (or was reset elsewhere) — nothing valid to stay unlocked with.
        mekRef.current = null;
        clearPersistedVaultUnlock(userId);
        setStatus("not_setup");
      } else if (persistedMek) {
        mekRef.current = persistedMek;
        setStatus("unlocked");
      } else {
        mekRef.current = null;
        setStatus("locked");
      }
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
        persistVaultUnlock(userId, mek);
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
      if (userId) persistVaultUnlock(userId, mek);
      setStatus("unlocked");
      return true;
    },
    [config, userId]
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
      if (userId) persistVaultUnlock(userId, mek);
      setStatus("unlocked");
      return true;
    },
    [config, userId]
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
