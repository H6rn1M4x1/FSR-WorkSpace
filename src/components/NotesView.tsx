import React, { useState } from "react";
import { StickyNote as StickyNoteIcon, Pin, Trash2, Palette, Plus } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { useToast } from "../context/ToastContext";
import { ConfirmationModal } from "./ConfirmationModal";
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
      className="absolute z-20 top-full left-0 mt-1.5 p-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-xl flex flex-wrap gap-1.5 w-36"
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
          className={`w-6 h-6 rounded-full border border-black/10 dark:border-white/10 ${NOTE_COLORS[key].swatch} ${
            value === key ? "ring-2 ring-primary ring-offset-1 ring-offset-white dark:ring-offset-zinc-950" : ""
          }`}
        />
      ))}
    </div>
  );
}

export function NotesView({ userId, darkMode = false }: NotesViewProps) {
  const { notes, addNote, updateNote, deleteNote, togglePin } = useNotes(userId);
  const { showToast } = useToast();

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeColor, setComposeColor] = useState("default");
  const [composeColorPickerOpen, setComposeColorPickerOpen] = useState(false);

  const [openColorPickerId, setOpenColorPickerId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const handleCreate = async () => {
    if (!composeText.trim()) {
      setComposeOpen(false);
      return;
    }
    await addNote(composeText, composeColor);
    setComposeText("");
    setComposeColor("default");
    setComposeOpen(false);
  };

  const handleBlurNote = async (note: StickyNote) => {
    const draft = drafts[note.id];
    if (draft === undefined || draft === note.text) return;
    if (!draft.trim()) {
      // Cleared out entirely — confirm before deleting, same as any other deletion.
      setDeleteConfirmId(note.id);
      return;
    }
    await updateNote(note.id, { text: draft });
  };

  const handleCancelDelete = () => {
    // If deletion was triggered by emptying a note's text, put the original text back
    // instead of leaving a blank, unsaved note on screen.
    if (deleteConfirmId) {
      const note = notes.find((n) => n.id === deleteConfirmId);
      if (note && drafts[deleteConfirmId]?.trim() === "" && note.text.trim() !== "") {
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[deleteConfirmId];
          return next;
        });
      }
    }
    setDeleteConfirmId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    await deleteNote(id);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    showToast("Nota eliminada.", "success");
  };

  const pinned = notes.filter((n) => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
  const others = notes.filter((n) => !n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);

  const renderNote = (note: StickyNote) => {
    const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
    const value = drafts[note.id] !== undefined ? drafts[note.id] : note.text;
    return (
      <div
        key={note.id}
        className={`break-inside-avoid mb-4 rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow ${palette.card}`}
      >
        <textarea
          value={value}
          onChange={(e) => setDrafts((prev) => ({ ...prev, [note.id]: e.target.value }))}
          onBlur={() => handleBlurNote(note)}
          rows={3}
          placeholder="Escribí algo..."
          className="w-full bg-transparent resize-none text-sm font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-400"
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenColorPickerId(openColorPickerId === note.id ? null : note.id)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 cursor-pointer"
              title="Color"
            >
              <Palette className="w-4 h-4" />
            </button>
            {openColorPickerId === note.id && (
              <ColorPicker
                value={note.color}
                onChange={(color) => updateNote(note.id, { color })}
                onClose={() => setOpenColorPickerId(null)}
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => togglePin(note.id)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 cursor-pointer"
              title={note.pinned ? "Desfijar" : "Fijar"}
            >
              <Pin className={`w-4 h-4 ${note.pinned ? "fill-current text-primary" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmId(note.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 dark:text-zinc-400 hover:text-red-500 cursor-pointer"
              title="Eliminar"
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
            <textarea
              autoFocus
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              rows={3}
              placeholder="Escribí tu nota..."
              className="w-full bg-transparent resize-none text-sm font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-400"
            />
            <div className="flex items-center justify-between">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setComposeColorPickerOpen((v) => !v)}
                  className={`w-6 h-6 rounded-full border border-black/10 dark:border-white/10 cursor-pointer ${NOTE_COLORS[composeColor].swatch}`}
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
                    setComposeText("");
                    setComposeColor("default");
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
        title="Eliminar nota"
        message="¿Seguro que querés eliminar esta nota? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        darkMode={darkMode}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
