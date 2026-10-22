import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, FileText, ChevronRight, Loader2, Sparkles, RotateCcw, AlertCircle } from "lucide-react";
import { StudyPlanTree } from "../types";
import { saveItemToFirestore } from "../lib/firestoreSyncService";
import { downloadDriveFileAsBase64, extractStudyPlanTree, MAX_STUDY_PLAN_FILE_BYTES } from "../lib/studyPlanTree";
import { StudyPlanTreeView } from "./StudyPlanTreeView";
import { uiSounds } from "../lib/sounds";
import AnimatedFolder from "./AnimatedFolder";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

interface DriveItemLite {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
}

const PDF_MIME = "application/pdf";
const FOLDER_MIME = "application/vnd.google-apps.folder";

async function driveFetch(url: string, accessToken: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Drive API ${res.status}`);
  return res.json();
}

async function listFolderContents(folderId: string, token: string): Promise<DriveItemLite[]> {
  const q = `'${folderId}' in parents and trashed = false`;
  const data = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size)&pageSize=200&orderBy=folder,name`,
    token,
  );
  return data.files || [];
}

export function StudyPlanTreeModal({
  open,
  onClose,
  darkMode,
  userId,
  accessToken,
  folderId,
  folderName,
  studyPlanTree,
  setStudyPlanTree,
}: {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  userId: string;
  accessToken: string | null;
  // Carpeta de Drive de ESTA materia (la misma que el usuario ya fijó en Material de Estudio) —
  // el picker arranca directo ahí, nunca en la raíz de Facultad.
  folderId: string;
  folderName: string;
  studyPlanTree: StudyPlanTree | undefined;
  setStudyPlanTree: React.Dispatch<React.SetStateAction<StudyPlanTree[]>>;
}) {
  const [mode, setMode] = useState<"viewing" | "picking" | "generating" | "error">(
    studyPlanTree ? "viewing" : "picking",
  );
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [items, setItems] = useState<DriveItemLite[] | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const initRef = useRef(false);

  useLockBodyScroll(open);

  // Al abrir, si ya hay un árbol guardado lo muestra directo; si no, arranca el picker directo en
  // la carpeta de Drive de ESTA materia (nunca en la raíz de Facultad ni en otra carpeta genérica
  // — es la misma carpeta que el usuario ya fijó en Material de Estudio). Se resetea cada vez que
  // se vuelve a abrir el modal.
  useEffect(() => {
    if (!open) {
      initRef.current = false;
      return;
    }
    setMode(studyPlanTree ? "viewing" : "picking");
    setError(null);
    if (initRef.current) return;
    initRef.current = true;
    setBreadcrumbs([{ id: folderId, name: folderName }]);
    setCurrentFolderId(folderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!currentFolderId || !accessToken || mode !== "picking") return;
    setLoadingItems(true);
    listFolderContents(currentFolderId, accessToken)
      .then(setItems)
      .catch((err) => setError(err?.message || "No se pudo leer la carpeta."))
      .finally(() => setLoadingItems(false));
  }, [currentFolderId, accessToken, mode]);

  const navigateTo = (id: string, name: string) => {
    uiSounds.navigate();
    const existingIdx = breadcrumbs.findIndex((b) => b.id === id);
    setBreadcrumbs(existingIdx !== -1 ? breadcrumbs.slice(0, existingIdx + 1) : [...breadcrumbs, { id, name }]);
    setCurrentFolderId(id);
  };

  const handlePickFile = async (file: DriveItemLite) => {
    if (!accessToken) return;
    const sizeBytes = file.size ? parseInt(file.size, 10) : 0;
    if (sizeBytes > MAX_STUDY_PLAN_FILE_BYTES) {
      uiSounds.error();
      setError(
        `Ese archivo pesa ${(sizeBytes / (1024 * 1024)).toFixed(1)} MB, es demasiado grande para procesarlo (máx. ~4 MB). Probá con un PDF más liviano.`,
      );
      setMode("error");
      return;
    }
    setMode("generating");
    setError(null);
    try {
      const base64 = await downloadDriveFileAsBase64(file.id, accessToken);
      const nodes = await extractStudyPlanTree(base64, PDF_MIME);
      const tree: StudyPlanTree = {
        id: folderId,
        folderId,
        nodes,
        sourceFileId: file.id,
        sourceFileName: file.name,
        updatedAt: new Date().toISOString(),
      };
      await saveItemToFirestore(userId, "study_plan_tree", tree);
      // Upsert por folderId: reemplaza el árbol de ESTA materia sin tocar los de las demás
      // (antes `setStudyPlanTree([tree])` borraba todos los árboles del resto de materias).
      setStudyPlanTree((prev) => [...prev.filter((t) => t.id !== tree.id), tree]);
      uiSounds.success();
      setMode("viewing");
    } catch (err: any) {
      uiSounds.error();
      setError(err?.message || "No se pudo generar el árbol. Probá de nuevo.");
      setMode("error");
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-4xl h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
          }`}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200/10 dark:border-zinc-800/60 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm truncate">Árbol de Materias</h3>
                <p className="text-[10px] text-zinc-500 font-semibold truncate">
                  {mode === "viewing" && studyPlanTree
                    ? `${folderName} · Generado desde ${studyPlanTree.sourceFileName}`
                    : folderName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {mode === "viewing" && (
                <button
                  type="button"
                  onClick={() => {
                    // No resetea breadcrumbs/carpeta actual a propósito: ya están en la carpeta
                    // de esta materia (o en la subcarpeta donde se navegó dentro de ella), así
                    // que "Regenerar" abre directo ahí en vez de volver al punto de partida.
                    setMode("picking");
                    setError(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-primary/10 hover:bg-primary hover:text-white dark:hover:text-black text-primary transition-all cursor-pointer"
                  title="Elegir otro archivo y regenerar el árbol"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Regenerar</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {mode === "viewing" && studyPlanTree && (
              <StudyPlanTreeView planNodes={studyPlanTree.nodes} darkMode={darkMode} />
            )}

            {mode === "generating" && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-bold">Leyendo el plan de estudio y armando el árbol…</p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Puede tardar unos segundos según el tamaño del archivo.
                </p>
              </div>
            )}

            {(mode === "picking" || mode === "error") && (
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
                        onClick={() => navigateTo(b.id, b.name)}
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
                  ) : !items || items.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic text-center py-16">
                      Esta carpeta no tiene subcarpetas ni archivos PDF.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items
                        .filter((it) => it.mimeType === FOLDER_MIME || it.mimeType === PDF_MIME)
                        .map((it) => {
                          const isFolder = it.mimeType === FOLDER_MIME;
                          return (
                            <button
                              key={it.id}
                              type="button"
                              onClick={() => (isFolder ? navigateTo(it.id, it.name) : handlePickFile(it))}
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
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export default StudyPlanTreeModal;
