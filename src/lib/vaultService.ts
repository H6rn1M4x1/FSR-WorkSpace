/**
 * Persistence layer for the password vault. This module ONLY moves already-encrypted
 * blobs in and out of Firestore — it never sees a plaintext password, the master
 * password, the recovery phrase, or the unwrapped master encryption key. All of that
 * lives exclusively in memory on the client (see vaultCrypto.ts and useVault.ts).
 */
import {
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToCategory,
  refetchCategory,
} from "./firestoreSyncService";
import type { VaultConfig, VaultItemEncrypted } from "../types";

const CONFIG_CATEGORY = "vault_config";
const ITEMS_CATEGORY = "vault_items";

/** Fetches the vault config document once (null if the vault was never set up). */
export async function fetchVaultConfig(userId: string): Promise<VaultConfig | null> {
  const items = await refetchCategory(userId, CONFIG_CATEGORY);
  const doc = items.find((i) => i.id === userId) || items[0];
  return (doc as VaultConfig) || null;
}

/** Subscribes to the vault config document (fires again if it changes on another device). */
export function subscribeVaultConfig(
  userId: string,
  onUpdate: (config: VaultConfig | null) => void
) {
  return subscribeToCategory(userId, CONFIG_CATEGORY, (items) => {
    const doc = items.find((i) => i.id === userId) || items[0] || null;
    onUpdate(doc as VaultConfig | null);
  });
}

export async function saveVaultConfig(userId: string, config: VaultConfig): Promise<void> {
  await saveItemToFirestore(userId, CONFIG_CATEGORY, { ...config, id: userId });
}

/** Subscribes to the list of encrypted vault items. */
export function subscribeVaultItems(
  userId: string,
  onUpdate: (items: VaultItemEncrypted[]) => void
) {
  return subscribeToCategory(userId, ITEMS_CATEGORY, (items) => {
    onUpdate((items as VaultItemEncrypted[]) || []);
  });
}

export async function saveVaultItem(userId: string, item: VaultItemEncrypted): Promise<void> {
  await saveItemToFirestore(userId, ITEMS_CATEGORY, item);
}

export async function deleteVaultItem(userId: string, itemId: string): Promise<void> {
  await deleteItemFromFirestore(userId, ITEMS_CATEGORY, itemId);
}
