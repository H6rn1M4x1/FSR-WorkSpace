/**
 * Persistence for note folders ("Carpetas" de Notas Rápidas). Mismo patrón de "category" que
 * notesService.ts: cada carpeta es un documento bajo users/{email}/noteFolders/{id}, sincronizado
 * en vivo entre dispositivos.
 */
import {
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToCategory,
} from "./firestoreSyncService";
import type { NoteFolder } from "../types";

const CATEGORY = "noteFolders";

export function subscribeNoteFolders(userId: string, onUpdate: (folders: NoteFolder[]) => void) {
  return subscribeToCategory(userId, CATEGORY, (items) => onUpdate((items as NoteFolder[]) || []));
}

export async function saveNoteFolder(userId: string, folder: NoteFolder): Promise<void> {
  await saveItemToFirestore(userId, CATEGORY, folder);
}

export async function deleteNoteFolder(userId: string, id: string): Promise<void> {
  await deleteItemFromFirestore(userId, CATEGORY, id);
}
