import React from "react";
import { StickyNote, Pin, Plus } from "lucide-react";
import { useNotes } from "../hooks/useNotes";

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
 * (MultiTeamMatchWidget) — mismas notas que NotesView.tsx (vía el mismo hook useNotes), solo
 * lectura acá: título + primeras líneas, hasta 6, las fijadas primero. "Ver todas" navega a la
 * pestaña real de Notas Rápidas.
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
  const { notes } = useNotes(userId);

  const preview = [...notes]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 6);

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
            <button
              key={note.id}
              type="button"
              onClick={onOpenAll}
              className={`text-left rounded-2xl border p-3 flex flex-col gap-1 h-28 overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                NOTE_CARD_COLOR[note.color] || NOTE_CARD_COLOR.default
              }`}
            >
              <div className="flex items-center gap-1 min-w-0">
                {note.pinned && <Pin className="w-3 h-3 text-primary fill-primary shrink-0" />}
                <p className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                  {note.title?.trim() || "Sin título"}
                </p>
              </div>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-3">{stripHtml(note.text) || "Nota vacía"}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
