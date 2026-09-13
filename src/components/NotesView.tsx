import React, { useState } from "react";
import { StickyNote as StickyNoteIcon, Pin, Trash2, Plus, X, Send } from "lucide-react";
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
    card: "bg-red-100 dark:bg-red-950/40 border-red-200 dark:border-red-900/50",
    swatch: "bg-red-300 dark:bg-red-700",
    label: "Rojo",
  },
  orange: {
    card: "bg-orange-100 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/50",
    swatch: "bg-orange-300 dark:bg-orange-700",
    label: "Naranja",
  },
  yellow: {
    card: "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50",
    swatch: "bg-amber-300 dark:bg-amber-700",
    label: "Amarillo",
  },
  green: {
    card: "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50",
    swatch: "bg-emerald-300 dark:bg-emerald-700",
    label: "Verde",
  },
  sky: {
    card: "bg-sky-100 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/50",
    swatch: "bg-sky-300 dark:bg-sky-700",
    label: "Celeste",
  },
  blue: {
    card: "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50",
    swatch: "bg-blue-300 dark:bg-blue-700",
    label: "Azul",
  },
  violet: {
    card: "bg-violet-100 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/50",
    swatch: "bg-violet-300 dark:bg-violet-700",
    label: "Violeta",
  },
  pink: {
    card: "bg-pink-100 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900/50",
    swatch: "bg-pink-300 dark:bg-pink-700",
    label: "Rosa",
  },
};
const COLOR_KEYS = Object.keys(NOTE_COLORS);

// The dark, semi-transparent "floating pill" look requested for every icon toolbar and
// popover in this view, so icons never sit directly on a note's color with nothing behind them.
const DARK_PANEL = "bg-black/55 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
      className={`absolute z-20 top-full left-0 mt-1.5 p-2 flex flex-wrap gap-1.5 w-36 ${DARK_PANEL}`}
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

function SharePanel({
  recipients,
  onShare,
  onUnshare,
  onClose,
}: {
  recipients: string[];
  onShare: (email: string) => Promise<void>;
  onUnshare: (email: string) => Promise<void>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError("Ingresá un email válido.");
      return;
    }
    setBusy(true);
    try {
      await onShare(email.trim());
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "No se pudo compartir la nota.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className={`absolute z-30 top-full right-0 mt-1.5 p-3 w-64 space-y-2.5 ${DARK_PANEL}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold text-white">Compartir nota</p>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-zinc-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
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
          onClick={handleShare}
          disabled={busy}
          className="p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white disabled:opacity-50 shrink-0"
          title="Compartir"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}
      {recipients.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/10">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Compartida con</p>
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
  const { notes, addNote, updateNote, deleteNote, togglePin, shareNote, unshareNote, getRecipients } = useNotes(userId);
  const { showToast } = useToast();

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeHtml, setComposeHtml] = useState("");
  const [composeColor, setComposeColor] = useState("default");
  const [composeAttachments, setComposeAttachments] = useState<{ name: string; url: string }[]>([]);
  const [composeColorPickerOpen, setComposeColorPickerOpen] = useState(false);

  const [openColorPickerId, setOpenColorPickerId] = useState<string | null>(null);
  const [openShareId, setOpenShareId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const handleCreate = async () => {
    await addNote(composeHtml, composeColor, composeAttachments);
    setComposeHtml("");
    setComposeColor("default");
    setComposeAttachments([]);
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

  const pinned = notes.filter((n) => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
  const others = notes.filter((n) => !n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);

  const renderNote = (note: StickyNote) => {
    const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
    const value = drafts[note.id] !== undefined ? drafts[note.id] : note.text;
    const isSharedIn = !!note.__sharedByEmail;
    const recipients = getRecipients(note.id);

    return (
      <div
        key={note.id}
        className={`break-inside-avoid mb-4 rounded-2xl border p-3 shadow-sm hover:shadow-md transition-shadow ${palette.card}`}
      >
        {isSharedIn && (
          <div className="mb-1.5">
            <SharedBadge item={note} />
          </div>
        )}
        <RichTextEditor
          value={value}
          onChange={(html) => setDrafts((prev) => ({ ...prev, [note.id]: html }))}
          placeholder="Escribí algo..."
          darkToolbar
          attachments={note.attachments || []}
          onAttachmentsChange={(atts) => updateNote(note.id, { attachments: atts })}
          onShareClick={isSharedIn ? undefined : () => setOpenShareId(openShareId === note.id ? null : note.id)}
        />
        {/* Commit the debounced draft to Firestore once the user stops typing, then drop the
            local draft so a later external update (e.g. from whoever this is shared with)
            can show through again instead of being shadowed forever. */}
        <SaveOnIdle
          html={value}
          original={note.text}
          onSave={async (html) => {
            await updateNote(note.id, { text: html });
            setDrafts((prev) => {
              const next = { ...prev };
              delete next[note.id];
              return next;
            });
          }}
        />

        <div className="relative flex items-center justify-end mt-2">
          {openShareId === note.id && (
            <SharePanel
              recipients={recipients}
              onShare={async (email) => {
                await shareNote(note.id, email);
                showToast(`Nota compartida con ${email}.`, "success");
              }}
              onUnshare={async (email) => {
                await unshareNote(note.id, email);
                showToast(`Se dejó de compartir con ${email}.`, "success");
              }}
              onClose={() => setOpenShareId(null)}
            />
          )}
          <div className={`flex items-center gap-1 p-1 ${DARK_PANEL}`}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenColorPickerId(openColorPickerId === note.id ? null : note.id)}
                className="w-6 h-6 rounded-full border border-white/20 cursor-pointer flex items-center justify-center"
                title="Color"
              >
                <span className={`w-4 h-4 rounded-full ${palette.swatch}`} />
              </button>
              {openColorPickerId === note.id && (
                <ColorPicker
                  value={note.color}
                  onChange={(color) => updateNote(note.id, { color })}
                  onClose={() => setOpenColorPickerId(null)}
                />
              )}
            </div>
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
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-primary text-white dark:text-blue-950 shadow-md">
          <StickyNoteIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">Notas</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Recordatorios e información que querés tener siempre a la vista.
          </p>
        </div>
      </div>

      {/* Compose box */}
      <div
        className={`rounded-2xl border p-4 shadow-sm transition-all ${
          darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
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
            <RichTextEditor
              value={composeHtml}
              onChange={setComposeHtml}
              placeholder="Escribí tu nota..."
              darkToolbar
              attachments={composeAttachments}
              onAttachmentsChange={setComposeAttachments}
            />
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setComposeColorPickerOpen((v) => !v)}
                  className={`w-6 h-6 rounded-full border border-slate-300 dark:border-zinc-700 cursor-pointer ${NOTE_COLORS[composeColor].swatch}`}
                  title="Color"
                />
                {composeColorPickerOpen && (
                  <ColorPicker
                    value={composeColor}
                    onChange={setComposeColor}
                    onClose={() => setComposeColorPickerOpen(false)}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setComposeOpen(false);
                    setComposeHtml("");
                    setComposeColor("default");
                    setComposeAttachments([]);
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
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">{pinned.map(renderNote)}</div>
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          {pinned.length > 0 && (
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Otras</p>
          )}
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">{others.map(renderNote)}</div>
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
 * Debounces saving a note's rich-text content: commits `html` via onSave 900ms after
 * the user stops typing, instead of on every keystroke or relying on blur (which the
 * editor's own toolbar clicks would trigger prematurely).
 */
function SaveOnIdle({
  html,
  original,
  onSave,
}: {
  html: string;
  original: string;
  onSave: (html: string) => void;
}) {
  React.useEffect(() => {
    if (html === original) return;
    const timer = setTimeout(() => onSave(html), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);
  return null;
}
