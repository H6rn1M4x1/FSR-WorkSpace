/**
 * Persistence for perpetual sticky notes ("Notas"). Same "category" pattern used
 * throughout the app (see vaultService.ts / firestoreSyncService.ts): each note is
 * a document under users/{email}/notes/{id}, synced live across devices.
 */
import {
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToCategory,
} from "./firestoreSyncService";
import type { StickyNote } from "../types";

const CATEGORY = "notes";

export function subscribeNotes(userId: string, onUpdate: (notes: StickyNote[]) => void) {
  return subscribeToCategory(userId, CATEGORY, (items) => onUpdate((items as StickyNote[]) || []));
}

export async function saveNote(userId: string, note: StickyNote): Promise<void> {
  await saveItemToFirestore(userId, CATEGORY, note);
}

export async function deleteNote(userId: string, id: string): Promise<void> {
  await deleteItemFromFirestore(userId, CATEGORY, id);
}
