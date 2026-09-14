import React, { useEffect, useState } from "react";
import { StickyNote as StickyNoteIcon, Pin, Trash2, Plus, X, Send, Share2, Check } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { useToast } from "../context/ToastContext";
import { ConfirmationModal } from "./ConfirmationModal";
import { RichTextEditor } from "./RichTextEditor";
import { SharedBadge } from "./SharedBadge";
import type { StickyNote } from "../types";

interface NotesViewProps {
  userId: string;
  darkMode?: boolean;
}

const NOTE_COLORS: Record<string, { card: string; swatch: string; label: string }> = {
  default: {
    card: "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800",
    swatch: "bg-white dark:bg-zinc-900",
    label: "Sin color",
  },
  red: {
    card: "bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-900",
    swatch: "bg-red-300 dark:bg-red-700",
    label: "Rojo",
  },
  orange: {
    card: "bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-900",
    swatch: "bg-orange-300 dark:bg-orange-700",
    label: "Naranja",
  },
  yellow: {
    card: "bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
    swatch: "bg-amber-300 dark:bg-amber-700",
    label: "Amarillo",
  },
  green: {
    card: "bg-emerald-100 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900",
    swatch: "bg-emerald-300 dark:bg-emerald-700",
    label: "Verde",
  },
  sky: {
    card: "bg-sky-100 dark:bg-sky-950 border-sky-200 dark:border-sky-900",
    swatch: "bg-sky-300 dark:bg-sky-700",
    label: "Celeste",
  },
  blue: {
    card: "bg-blue-100 dark:bg-blue-950 border-blue-200 dark:border-blue-900",
    swatch: "bg-blue-300 dark:bg-blue-700",
    label: "Azul",
  },
  violet: {
    card: "bg-violet-100 dark:bg-violet-950 border-violet-200 dark:border-violet-900",
    swatch: "bg-violet-300 dark:bg-violet-700",
    label: "Violeta",
  },
  pink: {
    card: "bg-pink-100 dark:bg-pink-950 border-pink-200 dark:border-pink-900",
    swatch: "bg-pink-300 dark:bg-pink-700",
    label: "Rosa",
  },
};
const COLOR_KEYS = Object.keys(NOTE_COLORS);

// The dark, semi-transparent "floating pill" look requested for every icon toolbar and
// popover in this view, so icons never sit directly on a note's color with nothing behind them.
const DARK_PANEL = "bg-black/55 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg";

type NoteMenu = "format" | "color" | "list" | "share" | "bgcolor" | null;
type Draft = { title: string; text: string };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Own notes sort by their manual drag order; shared-in ones (which have no order of their own) fall back to most-recently-updated. */
function compareNotes(a: StickyNote, b: StickyNote): number {
  const aOrder = a.__sharedByEmail ? null : a.order;
  const bOrder = b.__sharedByEmail ? null : b.order;
  if (aOrder != null && bOrder != null) return aOrder - bOrder;
  if (aOrder != null) return -1;
  if (bOrder != null) return 1;
  return b.updatedAt - a.updatedAt;
}

function ColorPicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-20 bottom-full right-0 mb-1.5 p-2 flex flex-wrap gap-1.5 w-36 ${DARK_PANEL}`}
    >
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          title={NOTE_COLORS[key].label}
          onClick={() => {
            onChange(key);
            onClose();
          }}
          className={`w-6 h-6 rounded-full border border-white/20 cursor-pointer ${NOTE_COLORS[key].swatch} ${
            value === key ? "ring-2 ring-primary ring-offset-1 ring-offset-black" : ""
          }`}
        />
      ))}
    </div>
  );
}

/** Rendered INSIDE the RichTextEditor's own toolbar (as its "share" row) — same place/style as format/color/list. */
function ShareRowContent({
  recipients,
  allKnownRecipients,
  onShare,
  onUnshare,
}: {
  recipients: string[];
  allKnownRecipients: string[];
  onShare: (email: string) => Promise<void>;
  onUnshare: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const handleShare = async (target?: string) => {
    const value = (target ?? email).trim();
    setError(null);
    setConfirmed(null);
    if (!isValidEmail(value)) {
      setError("Ingresá un email válido.");
      return;
    }
    setBusy(true);
    try {
      await onShare(value);
      if (!target) setEmail("");
      setConfirmed(value);
      setTimeout(() => setConfirmed((c) => (c === value ? null : c)), 3000);
    } catch (err: any) {
      setError(err?.message || "No se pudo compartir la nota.");
    } finally {
      setBusy(false);
    }
  };

  const quickPicks = allKnownRecipients.filter((e) => !recipients.includes(e));

  return (
    <div className="space-y-2 w-full max-w-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleShare()}
          placeholder="email@ejemplo.com"
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => handleShare()}
          disabled={busy}
          className="p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white disabled:opacity-50 shrink-0"
          title="Compartir"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}
      {confirmed && (
        <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
          <Check className="w-3 h-3" /> Compartida con {confirmed}.
        </p>
      )}

      {quickPicks.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
            Usuarios existentes (con los que ya compartiste)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPicks.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleShare(r)}
                className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold text-zinc-200 truncate max-w-[140px]"
                title={`Compartir con ${r}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {recipients.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/10">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Compartida con</p>
          {recipients.map((r) => (
            <div key={r} className="flex items-center justify-between gap-2 text-xs text-zinc-200">
              <span className="truncate">{r}</span>
              <button
                type="button"
                onClick={() => onUnshare(r)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-red-400 shrink-0"
                title="Dejar de compartir"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotesView({ userId, darkMode = false }: NotesViewProps) {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    shareNote,
    unshareNote,
    getRecipients,
    getAllRecipients,
    reorderNotes,
  } = useNotes(userId);
  const { showToast } = useToast();

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeHtml, setComposeHtml] = useState("");
  const [composeColor, setComposeColor] = useState("default");
  const [composeAttachments, setComposeAttachments] = useState<{ name: string; url: string }[]>([]);
  const [composeMenu, setComposeMenu] = useState<NoteMenu>(null);

  // Exactly one popover open across the whole board at a time: format/color/list/share
  // (rendered inside RichTextEditor) and this note's own background-color swatch.
  const [openMenu, setOpenMenu] = useState<{ id: string; menu: NoteMenu } | null>(null);
  const [rightClickMenu, setRightClickMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  // Drag-and-drop reordering (press and hold, then drag).
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    if (!rightClickMenu) return;
    const close = () => setRightClickMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [rightClickMenu]);

  const menuFor = (id: string): NoteMenu => (openMenu?.id === id ? openMenu.menu : null);
  const setMenuFor = (id: string, menu: NoteMenu) => setOpenMenu(menu ? { id, menu } : null);

  const handleCreate = async () => {
    await addNote(composeTitle, composeHtml, composeColor, composeAttachments);
    setComposeTitle("");
    setComposeHtml("");
    setComposeColor("default");
    setComposeAttachments([]);
    setComposeMenu(null);
    setComposeOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    const isSharedIn = notes.find((n) => n.id === id)?.__sharedByEmail;
    await deleteNote(id);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    showToast(isSharedIn ? "Dejaste de ver esta nota compartida." : "Nota eliminada.", "success");
  };

  const pinned = notes.filter((n) => n.pinned).sort(compareNotes);
  const others = notes.filter((n) => !n.pinned).sort(compareNotes);

  const handleDrop = async (group: StickyNote[], targetId: string) => {
    const dragId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!dragId || dragId === targetId) return;
    const ids = group.map((n) => n.id);
    const fromIndex = ids.indexOf(dragId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return; // dropped onto a different group — ignore
    const reordered = [...ids];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, dragId);
    await reorderNotes(reordered);
  };

  const renderNote = (note: StickyNote, group: StickyNote[]) => {
    const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
    const draft = drafts[note.id];
    const titleValue = draft?.title !== undefined ? draft.title : note.title || "";
    const textValue = draft?.text !== undefined ? draft.text : note.text;
    const isSharedIn = !!note.__sharedByEmail;
    const recipients = getRecipients(note.id);
    const menu = menuFor(note.id);

    const setDraft = (patch: Partial<Draft>) =>
      setDrafts((prev) => ({
        ...prev,
        [note.id]: {
          title: prev[note.id]?.title !== undefined ? prev[note.id].title : note.title || "",
          text: prev[note.id]?.text !== undefined ? prev[note.id].text : note.text,
          ...patch,
        },
      }));

    return (
      <div
        key={note.id}
        draggable={!isSharedIn}
        onDragStart={() => setDraggingId(note.id)}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverId(null);
        }}
        onDragOver={(e) => {
          if (!draggingId || draggingId === note.id) return;
          e.preventDefault();
          if (dragOverId !== note.id) setDragOverId(note.id);
        }}
        onDragLeave={() => setDragOverId((prev) => (prev === note.id ? null : prev))}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop(group, note.id);
        }}
        onContextMenu={(e) => {
          if (isSharedIn) return; // can't re-share something shared to me
          e.preventDefault();
          setRightClickMenu({ id: note.id, x: e.clientX, y: e.clientY });
        }}
        className={`break-inside-avoid mb-4 min-w-[280px] rounded-2xl border p-3 shadow-sm hover:shadow-md transition-all ${
          palette.card
        } ${draggingId === note.id ? "opacity-40" : ""} ${
          dragOverId === note.id ? "ring-2 ring-primary" : ""
        } ${!isSharedIn ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        {isSharedIn && (
          <div className="mb-1.5">
            <SharedBadge item={note} />
          </div>
        )}
        <input
          value={titleValue}
          onChange={(e) => setDraft({ title: e.target.value })}
          placeholder="Título"
          className="w-full bg-transparent text-sm font-extrabold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 placeholder:font-extrabold mb-1"
        />
        <RichTextEditor
          value={textValue}
          onChange={(html) => setDraft({ text: html })}
          placeholder="Escribí algo..."
          darkToolbar
          attachments={note.attachments || []}
          onAttachmentsChange={(atts) => updateNote(note.id, { attachments: atts })}
          activeMenu={menu === "bgcolor" ? null : menu}
          onActiveMenuChange={(m) => setMenuFor(note.id, m)}
          onShareClick={isSharedIn ? undefined : () => setMenuFor(note.id, "share")}
          shareMenuContent={
            isSharedIn ? undefined : (
              <ShareRowContent
                recipients={recipients}
                allKnownRecipients={getAllRecipients()}
                onShare={async (email) => {
                  await shareNote(note.id, email);
                  showToast(`Nota compartida con ${email}.`, "success");
                }}
                onUnshare={async (email) => {
                  try {
                    await unshareNote(note.id, email);
                    showToast(`Se dejó de compartir con ${email}.`, "success");
                  } catch (err: any) {
                    showToast("Error al dejar de compartir: " + (err?.message || String(err)), "error");
                  }
                }}
              />
            )
          }
        />
        {/* Commit the debounced draft to Firestore once the user stops typing, then drop the
            local draft so a later external update (e.g. from whoever this is shared with)
            can show through again instead of being shadowed forever. */}
        <SaveOnIdle
          draft={{ title: titleValue, text: textValue }}
          original={{ title: note.title || "", text: note.text }}
          onSave={async (patch) => {
            await updateNote(note.id, patch);
            setDrafts((prev) => {
              const next = { ...prev };
              delete next[note.id];
              return next;
            });
          }}
        />

        <div className="flex items-center justify-end mt-2">
          <div className={`relative flex items-center gap-1 p-1 ${DARK_PANEL}`}>
            <button
              type="button"
              onClick={() => setMenuFor(note.id, menu === "bgcolor" ? null : "bgcolor")}
              className="w-6 h-6 rounded-full border border-white/20 cursor-pointer flex items-center justify-center"
              title="Color"
            >
              <span className={`w-4 h-4 rounded-full ${palette.swatch}`} />
            </button>
            {menu === "bgcolor" && (
              <ColorPicker
                value={note.color}
                onChange={(color) => updateNote(note.id, { color })}
                onClose={() => setMenuFor(note.id, null)}
              />
            )}
            <button
              type="button"
              onClick={() => togglePin(note.id)}
              className="p-1.5 rounded-lg hover:bg-white/15 text-zinc-200 cursor-pointer"
              title={note.pinned ? "Desfijar" : "Fijar"}
            >
              <Pin className={`w-4 h-4 ${note.pinned ? "fill-current text-primary" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmId(note.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-200 hover:text-red-400 cursor-pointer"
              title={isSharedIn ? "Dejar de ver esta nota" : "Eliminar"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6">
      <div
        className={`rounded-3xl border p-4 sm:p-6 space-y-6 ${
          darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white/80 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <StickyNoteIcon className="w-5 h-5 text-zinc-900 dark:text-white" />
          <div>
            <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">Notas</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Recordatorios e información que querés tener siempre a la vista. Mantené el clic
              sostenido sobre una nota para reordenarla.
            </p>
          </div>
        </div>

        {/* Compose box */}
        <div
          className={`rounded-2xl border p-4 shadow-sm transition-all ${
            darkMode ? "bg-zinc-950/60 border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          {!composeOpen ? (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="w-full text-left text-sm text-zinc-400 font-medium flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Toma una nota...
            </button>
          ) : (
            <div className="space-y-3">
              <input
                autoFocus
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                placeholder="Título"
                className="w-full bg-transparent text-sm font-extrabold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 placeholder:font-extrabold"
              />
              <RichTextEditor
                value={composeHtml}
                onChange={setComposeHtml}
                placeholder="Escribí tu nota..."
                darkToolbar
                attachments={composeAttachments}
                onAttachmentsChange={setComposeAttachments}
                activeMenu={composeMenu === "bgcolor" ? null : composeMenu}
                onActiveMenuChange={setComposeMenu}
              />
              <div className="flex items-center justify-between">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setComposeMenu(composeMenu === "bgcolor" ? null : "bgcolor")}
                    className={`w-6 h-6 rounded-full border border-slate-300 dark:border-zinc-700 cursor-pointer ${NOTE_COLORS[composeColor].swatch}`}
                    title="Color"
                  />
                  {composeMenu === "bgcolor" && (
                    <ColorPicker value={composeColor} onChange={setComposeColor} onClose={() => setComposeMenu(null)} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposeOpen(false);
                      setComposeTitle("");
                      setComposeHtml("");
                      setComposeColor("default");
                      setComposeAttachments([]);
                      setComposeMenu(null);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {notes.length === 0 && (
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 py-10">
            Todavía no tenés notas. Creá la primera de arriba — quedan guardadas de forma
            permanente hasta que las borres.
          </p>
        )}

        {pinned.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Pin className="w-3 h-3" /> Fijadas
            </p>
            <div className="columns-[380px] gap-4">{pinned.map((n) => renderNote(n, pinned))}</div>
          </div>
        )}

        {others.length > 0 && (
          <div className="space-y-2">
            {pinned.length > 0 && (
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Otras</p>
            )}
            <div className="columns-[380px] gap-4">{others.map((n) => renderNote(n, others))}</div>
          </div>
        )}
      </div>

      {/* Right-click context menu: just "Compartir con..." for now */}
      {rightClickMenu && (
        <div
          className={`fixed z-50 p-1 ${DARK_PANEL}`}
          style={{ top: rightClickMenu.y, left: rightClickMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setMenuFor(rightClickMenu.id, "share");
              setRightClickMenu(null);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-xs font-bold text-zinc-100 cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" /> Compartir con...
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        title={notes.find((n) => n.id === deleteConfirmId)?.__sharedByEmail ? "Dejar de ver esta nota" : "Eliminar nota"}
        message={
          notes.find((n) => n.id === deleteConfirmId)?.__sharedByEmail
            ? "Vas a dejar de ver esta nota compartida. La persona que la compartió con vos conserva su copia."
            : "¿Seguro que querés eliminar esta nota? Esta acción no se puede deshacer."
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        darkMode={darkMode}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

/**
 * Debounces saving a note's title/rich-text content: commits via onSave 900ms after
 * the user stops typing, instead of on every keystroke or relying on blur (which the
 * editor's own toolbar clicks would trigger prematurely).
 */
function SaveOnIdle({
  draft,
  original,
  onSave,
}: {
  draft: Draft;
  original: Draft;
  onSave: (patch: Draft) => void;
}) {
  useEffect(() => {
    if (draft.title === original.title && draft.text === original.text) return;
    const timer = setTimeout(() => onSave(draft), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title, draft.text]);
  return null;
}
