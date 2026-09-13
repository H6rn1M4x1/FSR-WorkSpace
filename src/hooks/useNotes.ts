import { useCallback, useEffect, useMemo, useState } from "react";
import { subscribeNotes, saveNote, deleteNote as deleteNoteDoc } from "../lib/notesService";
import {
  shareItemWith,
  unshareItem,
  subscribeToItemsSharedWithMe,
  subscribeToItemsIShared,
  subscribeToSharedItemData,
  type SharedItemRef,
} from "../lib/itemSharingService";
import type { StickyNote } from "../types";

const CATEGORY = "notes";

function stripHtml(html: string): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
}

interface UseNotesResult {
  notes: StickyNote[]; // own notes + notes shared with me, merged
  addNote: (html: string, color: string, attachments?: { name: string; url: string }[]) => Promise<void>;
  updateNote: (id: string, patch: Partial<Pick<StickyNote, "text" | "color" | "pinned" | "attachments">>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  shareNote: (id: string, email: string) => Promise<void>;
  unshareNote: (id: string, email: string) => Promise<void>;
  getRecipients: (id: string) => string[];
  getAllRecipients: () => string[];
}

export function useNotes(userId: string | null | undefined): UseNotesResult {
  const [ownNotes, setOwnNotes] = useState<StickyNote[]>([]);
  const [sharedInRefs, setSharedInRefs] = useState<SharedItemRef[]>([]);
  const [sharedInNotes, setSharedInNotes] = useState<StickyNote[]>([]);
  const [sharedOutRefs, setSharedOutRefs] = useState<SharedItemRef[]>([]);

  useEffect(() => {
    if (!userId) {
      setOwnNotes([]);
      return;
    }
    return subscribeNotes(userId, setOwnNotes);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSharedInRefs([]);
      setSharedOutRefs([]);
      return;
    }
    const unsubIn = subscribeToItemsSharedWithMe(userId, (refs) =>
      setSharedInRefs(refs.filter((r) => r.category === CATEGORY))
    );
    const unsubOut = subscribeToItemsIShared(userId, (refs) =>
      setSharedOutRefs(refs.filter((r) => r.category === CATEGORY))
    );
    return () => {
      unsubIn();
      unsubOut();
    };
  }, [userId]);

  useEffect(() => {
    return subscribeToSharedItemData(sharedInRefs, (byCategory) => {
      setSharedInNotes((byCategory[CATEGORY] || []) as StickyNote[]);
    });
  }, [sharedInRefs]);

  const addNote = useCallback(
    async (html: string, color: string, attachments?: { name: string; url: string }[]) => {
      if (!userId) return;
      if (!stripHtml(html) && !(attachments && attachments.length)) return;
      const now = Date.now();
      const note: StickyNote = {
        id: `note_${now}_${Math.random().toString(36).slice(2, 8)}`,
        text: html,
        color,
        pinned: false,
        attachments: attachments || [],
        createdAt: now,
        updatedAt: now,
      };
      await saveNote(userId, note);
    },
    [userId]
  );

  const findNote = useCallback(
    (id: string): StickyNote | undefined => ownNotes.find((n) => n.id === id) || sharedInNotes.find((n) => n.id === id),
    [ownNotes, sharedInNotes]
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Pick<StickyNote, "text" | "color" | "pinned" | "attachments">>) => {
      const existing = findNote(id);
      if (!existing) return;
      const ownerEmail = existing.__sharedByEmail || userId;
      if (!ownerEmail) return;
      const { __sharedByEmail, __sharedByName, ...clean } = existing as StickyNote;
      await saveNote(ownerEmail, { ...clean, ...patch, updatedAt: Date.now() });
    },
    [findNote, userId]
  );

  const removeNote = useCallback(
    async (id: string) => {
      if (!userId) return;
      const existing = findNote(id);
      if (!existing) return;
      if (existing.__sharedByEmail) {
        // Not mine to delete — just stop sharing it with me, the owner's note is untouched.
        await unshareItem(existing.__sharedByEmail, userId, CATEGORY, id);
      } else {
        await deleteNoteDoc(userId, id);
      }
    },
    [findNote, userId]
  );

  const togglePin = useCallback(
    async (id: string) => {
      const existing = findNote(id);
      if (!existing) return;
      await updateNote(id, { pinned: !existing.pinned });
    },
    [findNote, updateNote]
  );

  const shareNote = useCallback(
    async (id: string, email: string) => {
      if (!userId) return;
      const existing = findNote(id);
      const preview = existing ? stripHtml(existing.text).slice(0, 40) : "";
      await shareItemWith(userId, email, CATEGORY, id, preview);
    },
    [userId, findNote]
  );

  const unshareNote = useCallback(
    async (id: string, email: string) => {
      if (!userId) return;
      await unshareItem(userId, email, CATEGORY, id);
    },
    [userId]
  );

  const getRecipients = useCallback(
    (id: string) => sharedOutRefs.filter((r) => r.itemId === id).map((r) => r.sharedWithEmail),
    [sharedOutRefs]
  );

  // Every email I've ever shared a note with, most-recent first — lets the share panel
  // offer a quick pick instead of retyping an address you've already used.
  const getAllRecipients = useCallback(() => {
    const seen = new Set<string>();
    const emails: string[] = [];
    [...sharedOutRefs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((r) => {
        if (!seen.has(r.sharedWithEmail)) {
          seen.add(r.sharedWithEmail);
          emails.push(r.sharedWithEmail);
        }
      });
    return emails;
  }, [sharedOutRefs]);

  const notes = useMemo(() => [...ownNotes, ...sharedInNotes], [ownNotes, sharedInNotes]);

  return useMemo(
    () => ({
      notes,
      addNote,
      updateNote,
      deleteNote: removeNote,
      togglePin,
      shareNote,
      unshareNote,
      getRecipients,
      getAllRecipients,
    }),
    [notes, addNote, updateNote, removeNote, togglePin, shareNote, unshareNote, getRecipients, getAllRecipients]
  );
}
