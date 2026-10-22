import React, { useState } from "react";
import { FileText, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import AnimatedFolder from "./AnimatedFolder";
import { DriveItemLite, DRIVE_FOLDER_MIME } from "../hooks/useDriveFilePicker";

// Render del picker de Drive (breadcrumbs + grilla de carpetas/archivos) — componente "tonto",
// toda la lógica de navegación vive en `useDriveFilePicker`. `fileMimeTypes` filtra qué archivos
// (no carpetas, esas siempre se muestran) aparecen listados; sin filtro, se muestra cualquiera.
export function DriveFilePickerView({
  darkMode,
  breadcrumbs,
  items,
  loadingItems,
  error,
  onNavigate,
  onPickFile,
  fileMimeTypes,
  emptyMessage = "Esta carpeta no tiene subcarpetas ni archivos para elegir.",
}: {
  darkMode: boolean;
  breadcrumbs: { id: string; name: string }[];
  items: DriveItemLite[] | null;
  loadingItems: boolean;
  error: string | null;
  onNavigate: (id: string, name: string) => void;
  onPickFile: (file: DriveItemLite) => void;
  fileMimeTypes?: string[];
  emptyMessage?: string;
}) {
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const visibleItems = (items || []).filter(
    (it) => it.mimeType === DRIVE_FOLDER_MIME || !fileMimeTypes || fileMimeTypes.includes(it.mimeType),
  );

  return (
    <div className="w-full h-full flex flex-col">
      {error && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-center gap-1 px-5 pt-4 pb-2 text-xs font-bold text-zinc-500 overflow-x-auto">
        {breadcrumbs.map((b, i) => (
          <React.Fragment key={b.id}>
            {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" />}
            <button
              type="button"
              onClick={() => onNavigate(b.id, b.name)}
              className={`whitespace-nowrap hover:text-primary cursor-pointer ${
                i === breadcrumbs.length - 1 ? "text-primary" : ""
              }`}
            >
              {b.name}
            </button>
          </React.Fragment>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {loadingItems ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : visibleItems.length === 0 ? (
          <p className="text-xs text-zinc-500 italic text-center py-16">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleItems.map((it) => {
              const isFolder = it.mimeType === DRIVE_FOLDER_MIME;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => (isFolder ? onNavigate(it.id, it.name) : onPickFile(it))}
                  onMouseEnter={() => isFolder && setHoveredItemId(it.id)}
                  onMouseLeave={() => isFolder && setHoveredItemId((prev) => (prev === it.id ? null : prev))}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                    darkMode
                      ? "bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800 hover:border-primary/40"
                      : "bg-slate-50 border-zinc-150 hover:bg-slate-100 hover:border-primary/40"
                  }`}
                >
                  {isFolder ? (
                    <AnimatedFolder size={18} isHovered={hoveredItemId === it.id} className="text-primary shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold truncate">{it.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DriveFilePickerView;
