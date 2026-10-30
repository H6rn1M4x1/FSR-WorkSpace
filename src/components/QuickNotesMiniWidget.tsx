import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { StickyNote, Pin, Plus, Pencil, X } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { InteractiveRichText } from "./InteractiveRichText";
import { buildNoteColorPalette, findNoteColorEntry, type Draft } from "./NotesView";
import { useToast } from "../context/ToastContext";

function stripHtml(html: string): string {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// Cuántas notas se ven a la vez en la miniatura de Inicio — con más que eso, en vez de recortar
// el resto se arma un slider que las va pasando de a una página, para no perder ninguna.
const NOTES_PAGE_SIZE = 4;
const NOTES_AUTO_ADVANCE_MS = 5000;

/**
 * Miniatura de "Notas Rápidas" para Inicio, en reemplazo de "Seguimiento Semanal de Equipos"
 * (MultiTeamMatchWidget) — mismas notas que NotesView.tsx (vía el mismo hook useNotes). Cada
 * tarjeta tiene su propio botón de expandir (ver en grande, de solo lectura salvo tildar
 * checkboxes) — "Editar" lleva a la pestaña real de Notas Rápidas con esa nota ya seleccionada
 * para editar, en vez de editarla ahí mismo en el modal de Inicio.
 */
export function QuickNotesMiniWidget({
  userId,
  darkMode,
  onOpenAll,
  onAddNote,
  onEditNote,
}: {
  userId: string;
  darkMode: boolean;
  onOpenAll?: () => void;
  onAddNote?: () => void;
  onEditNote?: (noteId: string) => void;
}) {
  const { notes, updateNote } = useNotes(userId);
  const { showToast } = useToast();
  const notePalette = useMemo(() => buildNoteColorPalette(darkMode), [darkMode]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  // Tildar un checkbox en modo lectura (no editando) debe guardar el cambio al toque, no
  // quedar solo visual hasta que se abra "Editar" — mismo criterio que cualquier otra acción
  // rápida de esta app (confirma con un toast).
  const handleToggleCheckbox = (noteId: string, newHtml: string) => {
    if (draft && expandedId === noteId) setDraft({ ...draft, text: newHtml });
    updateNote(noteId, { text: newHtml })
      .then(() => showToast("Nota actualizada.", "success"))
      .catch((err: any) => showToast(err?.message || "No se pudo guardar el cambio.", "error"));
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
  const pageCount = Math.max(1, Math.ceil(sortedNotes.length / NOTES_PAGE_SIZE));

  // Slider: con más de NOTES_PAGE_SIZE notas, en vez de recortar el resto arma páginas de a
  // NOTES_PAGE_SIZE y las va rotando sola — en pausa mientras el mouse esté sobre alguna tarjeta
  // (para no cambiar el contenido debajo del cursor mientras se está leyendo) o mientras haya una
  // nota abierta en el modal "ver en grande" de Inicio.
  const [page, setPage] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [pageCount, page]);
  useEffect(() => {
    if (pageCount <= 1 || isHovering || expandedId) return;
    const id = setInterval(() => {
      setPage((p) => (p + 1) % pageCount);
    }, NOTES_AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [pageCount, isHovering, expandedId]);

  const preview = sortedNotes.slice(page * NOTES_PAGE_SIZE, page * NOTES_PAGE_SIZE + NOTES_PAGE_SIZE);

  const expandedNote = notes.find((n) => n.id === expandedId) || null;
  const expandedColorEntry = expandedNote ? findNoteColorEntry(notePalette, expandedNote.color) : null;

  const openExpanded = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    setExpandedId(noteId);
    setDraft({ title: note.title || "", text: note.text });
  };

  const handleEditClick = (noteId: string) => {
    setExpandedId(null);
    if (onEditNote) onEditNote(noteId);
    else onOpenAll?.();
  };

  return (
    <div
      className={`rounded-3xl p-5 border shadow-xs transition-all duration-300 scroll-reveal ${
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
        <div className="flex items-center gap-2 shrink-0">
          {onAddNote && (
            <button
              type="button"
              onClick={onAddNote}
              className="p-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer"
              title="Agregar nota"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenAll && (
            <button
              type="button"
              onClick={onOpenAll}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              Ver todas
            </button>
          )}
        </div>
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
        <div onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {preview.map((note) => {
                const cardColorEntry = findNoteColorEntry(notePalette, note.color);
                return (
                <div
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  data-sound="expand"
                  onClick={() => openExpanded(note.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openExpanded(note.id);
                  }}
                  title="Ver en grande"
                  className={`text-left rounded-2xl border p-4 flex flex-col gap-1.5 h-80 overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                    note.pinned ? "ring-2 ring-primary border-primary" : ""
                  }`}
                  style={{ backgroundColor: cardColorEntry.bg, borderColor: cardColorEntry.border }}
                >
                  <div className="flex items-center gap-1.5 min-w-0 pr-5">
                    {note.pinned && <Pin className="w-3.5 h-3.5 text-primary fill-primary shrink-0" />}
                    <p className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {note.title?.trim() || "Sin título"}
                    </p>
                  </div>
                  {stripHtml(note.text) ? (
                    // overflow-y-auto en vez de hidden: si el contenido no entra, se puede hacer
                    // scroll dentro de la tarjeta (con la barra invisible global de toda la app)
                    // en vez de recortarlo sin forma de verlo.
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <InteractiveRichText
                        className="rich-text-content prose prose-sm dark:prose-invert max-w-none text-xs text-zinc-600 dark:text-zinc-400 [&_*]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_ol_ol]:list-[lower-alpha] [&_div:has(input[type=checkbox])]:flex [&_div:has(input[type=checkbox])]:items-start [&_div:has(input[type=checkbox])]:gap-1.5 [&_div:has(input[type=checkbox])]:my-1.5 [&_div:has(input[type=checkbox])]:leading-snug"
                        html={note.text}
                        onToggleCheckbox={(newHtml) => handleToggleCheckbox(note.id, newHtml)}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">Nota vacía</p>
                  )}
                </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  title={`Página ${i + 1} de ${pageCount}`}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    i === page ? "w-5 bg-primary" : "w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-primary/50"
                  }`}
                />
              ))}
            </div>
          )}
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
                  className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border p-5 shadow-2xl"
                  style={
                    expandedColorEntry
                      ? { backgroundColor: expandedColorEntry.bg, borderColor: expandedColorEntry.border }
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="flex-1 text-lg font-extrabold text-zinc-900 dark:text-white break-words">
                      {draft.title || "Sin título"}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditClick(expandedNote.id)}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-300 cursor-pointer"
                        title="Editar en Notas Rápidas"
                      >
                        <Pencil className="w-4 h-4" />
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

                  <InteractiveRichText
                    className="rich-text-content prose dark:prose-invert prose-sm max-w-none text-sm text-zinc-900 dark:text-white [&_ol_ol]:list-[lower-alpha]"
                    html={draft.text || "<p class='text-zinc-400 italic'>Nota vacía.</p>"}
                    onToggleCheckbox={(newHtml) => handleToggleCheckbox(expandedNote.id, newHtml)}
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
