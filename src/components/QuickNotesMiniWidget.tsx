import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { StickyNote, Pin, Plus, Pencil, Check, X } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { RichTextEditor } from "./RichTextEditor";
import { SaveOnIdle, type Draft } from "./NotesView";

// Mismos colores que NotesView.tsx (NOTE_COLORS), en versión compacta — solo la clase de fondo
// de la tarjeta, sin duplicar el resto de esa paleta (swatch/label) que acá no hace falta.
const NOTE_CARD_COLOR: Record<string, string> = {
  default: "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800",
  red: "bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-900",
  orange: "bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-900",
  yellow: "bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
  green: "bg-emerald-100 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900",
  sky: "bg-sky-100 dark:bg-sky-950 border-sky-200 dark:border-sky-900",
  blue: "bg-blue-100 dark:bg-blue-950 border-blue-200 dark:border-blue-900",
  violet: "bg-violet-100 dark:bg-violet-950 border-violet-200 dark:border-violet-900",
  pink: "bg-pink-100 dark:bg-pink-950 border-pink-200 dark:border-pink-900",
};

function stripHtml(html: string): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Miniatura de "Notas Rápidas" para Inicio, en reemplazo de "Seguimiento Semanal de Equipos"
 * (MultiTeamMatchWidget) — mismas notas que NotesView.tsx (vía el mismo hook useNotes). Cada
 * tarjeta tiene su propio botón de expandir (ver en grande + editar sin salir de Inicio, mismo
 * modal/auto-guardado que NotesView.tsx) — hacer click en el resto de la tarjeta sigue
 * navegando a la pestaña real de Notas Rápidas, igual que antes.
 */
export function QuickNotesMiniWidget({
  userId,
  darkMode,
  onOpenAll,
}: {
  userId: string;
  darkMode: boolean;
  onOpenAll?: () => void;
}) {
  const { notes, updateNote } = useNotes(userId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const preview = [...notes]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 6);

  const expandedNote = notes.find((n) => n.id === expandedId) || null;
  const palette = expandedNote ? NOTE_CARD_COLOR[expandedNote.color] || NOTE_CARD_COLOR.default : "";

  const openExpanded = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    setExpandedId(noteId);
    setEditing(false);
    setDraft({ title: note.title || "", text: note.text });
  };

  return (
    <div
      className={`rounded-3xl p-5 border shadow-xs transition-all duration-300 ${
        darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-full bg-primary/10 shrink-0 flex items-center justify-center">
            <StickyNote className="w-4 h-4 text-primary" />
          </span>
          <div>
            <h3 className="font-extrabold text-sm">Notas Rápidas</h3>
            <p className="text-[10px] text-zinc-400 font-bold">{notes.length} nota{notes.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        {onOpenAll && (
          <button
            type="button"
            onClick={onOpenAll}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer shrink-0"
          >
            Ver todas
          </button>
        )}
      </div>

      {preview.length === 0 ? (
        <button
          type="button"
          onClick={onOpenAll}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 text-xs text-zinc-500 hover:text-primary transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          No tenés notas todavía. Creá la primera.
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {preview.map((note) => (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              onClick={() => openExpanded(note.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openExpanded(note.id);
              }}
              title="Ver en grande"
              className={`text-left rounded-2xl border p-3 flex flex-col gap-1 h-28 overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                NOTE_CARD_COLOR[note.color] || NOTE_CARD_COLOR.default
              }`}
            >
              <div className="flex items-center gap-1 min-w-0 pr-5">
                {note.pinned && <Pin className="w-3 h-3 text-primary fill-primary shrink-0" />}
                <p className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                  {note.title?.trim() || "Sin título"}
                </p>
              </div>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-3">{stripHtml(note.text) || "Nota vacía"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal "ver en grande" — por portal, igual que en NotesView.tsx. */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {expandedNote && draft && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60"
                onClick={() => setExpandedId(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border p-5 shadow-2xl ${palette} ${
                    !expandedNote.color || expandedNote.color === "default" ? "force-solid-bg" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    {editing ? (
                      <input
                        autoFocus
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        placeholder="Título"
                        className="flex-1 bg-transparent text-lg font-extrabold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400"
                      />
                    ) : (
                      <h3 className="flex-1 text-lg font-extrabold text-zinc-900 dark:text-white break-words">
                        {draft.title || "Sin título"}
                      </h3>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditing((v) => !v)}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-300 cursor-pointer"
                        title={editing ? "Listo" : "Editar"}
                      >
                        {editing ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-300 cursor-pointer"
                        title="Cerrar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {editing ? (
                    <RichTextEditor
                      value={draft.text}
                      onChange={(html) => setDraft({ ...draft, text: html })}
                      placeholder="Escribí algo..."
                      darkToolbar
                      attachments={expandedNote.attachments || []}
                      onAttachmentsChange={(atts) => updateNote(expandedNote.id, { attachments: atts })}
                    />
                  ) : (
                    <div
                      className="rich-text-content prose dark:prose-invert prose-sm max-w-none text-sm text-zinc-900 dark:text-white [&_ol_ol]:list-[lower-alpha]"
                      dangerouslySetInnerHTML={{
                        __html: draft.text || "<p class='text-zinc-400 italic'>Nota vacía.</p>",
                      }}
                    />
                  )}

                  <SaveOnIdle
                    draft={draft}
                    original={{ title: expandedNote.title || "", text: expandedNote.text }}
                    onSave={(patch) => { updateNote(expandedNote.id, patch); }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
