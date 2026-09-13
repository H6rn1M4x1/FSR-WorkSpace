import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeNotes, saveNote, deleteNote } from "../lib/notesService";
import type { StickyNote } from "../types";

interface UseNotesResult {
  notes: StickyNote[];
  addNote: (text: string, color: string) => Promise<void>;
  updateNote: (id: string, patch: Partial<Pick<StickyNote, "text" | "color" | "pinned">>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
}

export function useNotes(userId: string | null | undefined): UseNotesResult {
  const [notes, setNotes] = useState<StickyNote[]>([]);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      return;
    }
    const unsub = subscribeNotes(userId, setNotes);
    return () => unsub();
  }, [userId]);

  const addNote = useCallback(
    async (text: string, color: string) => {
      if (!userId || !text.trim()) return;
      const now = Date.now();
      const note: StickyNote = {
        id: `note_${now}_${Math.random().toString(36).slice(2, 8)}`,
        text: text.trim(),
        color,
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      await saveNote(userId, note);
    },
    [userId]
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Pick<StickyNote, "text" | "color" | "pinned">>) => {
      if (!userId) return;
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;
      await saveNote(userId, { ...existing, ...patch, updatedAt: Date.now() });
    },
    [userId, notes]
  );

  const removeNote = useCallback(
    async (id: string) => {
      if (!userId) return;
      await deleteNote(userId, id);
    },
    [userId]
  );

  const togglePin = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;
      await updateNote(id, { pinned: !existing.pinned });
    },
    [notes, updateNote]
  );

  return useMemo(
    () => ({ notes, addNote, updateNote, deleteNote: removeNote, togglePin }),
    [notes, addNote, updateNote, removeNote, togglePin]
  );
}
