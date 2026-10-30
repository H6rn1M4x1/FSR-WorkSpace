import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeNoteFolders, saveNoteFolder, deleteNoteFolder as deleteNoteFolderDoc } from "../lib/noteFoldersService";
import type { NoteFolder } from "../types";

interface UseNoteFoldersResult {
  folders: NoteFolder[]; // ordenadas por "order"
  addFolder: (name: string, color: string) => Promise<NoteFolder | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  recolorFolder: (id: string, color: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
}

export function useNoteFolders(userId: string | null | undefined): UseNoteFoldersResult {
  const [folders, setFolders] = useState<NoteFolder[]>([]);

  useEffect(() => {
    if (!userId) {
      setFolders([]);
      return;
    }
    return subscribeNoteFolders(userId, setFolders);
  }, [userId]);

  const addFolder = useCallback(
    async (name: string, color: string): Promise<NoteFolder | null> => {
      const trimmed = name.trim();
      if (!userId || !trimmed) return null;
      const now = Date.now();
      const highestOrder = folders.reduce((max, f) => Math.max(max, f.order ?? 0), -1);
      const folder: NoteFolder = {
        id: `nfolder_${now}_${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        color,
        order: highestOrder + 1,
        createdAt: now,
        updatedAt: now,
      };
      await saveNoteFolder(userId, folder);
      return folder;
    },
    [userId, folders]
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!userId || !trimmed) return;
      const existing = folders.find((f) => f.id === id);
      if (!existing) return;
      await saveNoteFolder(userId, { ...existing, name: trimmed, updatedAt: Date.now() });
    },
    [userId, folders]
  );

  const recolorFolder = useCallback(
    async (id: string, color: string) => {
      if (!userId) return;
      const existing = folders.find((f) => f.id === id);
      if (!existing) return;
      await saveNoteFolder(userId, { ...existing, color, updatedAt: Date.now() });
    },
    [userId, folders]
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      if (!userId) return;
      await deleteNoteFolderDoc(userId, id);
    },
    [userId]
  );

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [folders]
  );

  return useMemo(
    () => ({ folders: sortedFolders, addFolder, renameFolder, recolorFolder, deleteFolder }),
    [sortedFolders, addFolder, renameFolder, recolorFolder, deleteFolder]
  );
}
