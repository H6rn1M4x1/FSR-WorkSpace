import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, Sparkles, RotateCcw, GraduationCap } from "lucide-react";
import { StudyPlanTree, StudyPlanTreeAttachment, Exam } from "../types";
import { saveItemToFirestore } from "../lib/firestoreSyncService";
import { downloadDriveFileAsBase64, extractStudyPlanTree, MAX_STUDY_PLAN_FILE_BYTES } from "../lib/studyPlanTree";
import { StudyPlanTreeView } from "./StudyPlanTreeView";
import { DriveFilePickerView } from "./DriveFilePickerView";
import { useDriveFilePicker, DriveItemLite } from "../hooks/useDriveFilePicker";
import { ExamModal } from "./ExamModal";
import { uiSounds } from "../lib/sounds";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

const PDF_MIME = "application/pdf";

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
  onOpenInFacultad,
  setExams,
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
  // Abre un archivo de Drive (y su carpeta) directo en la sección "Facultad" de la app, en vez de
  // la Drive real — lo usa el botón del panel derecho del árbol para el programa original o el
  // adjunto de un nodo.
  onOpenInFacultad: (folderId: string, folderName: string, fileId?: string) => void;
  // "Crear Examen", junto a "Regenerar" — arma un examen de práctica con IA a partir de archivos
  // de esta materia (el programa original, los adjuntos del árbol, o buscando en Facultad).
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
}) {
  const [mode, setMode] = useState<"viewing" | "picking" | "generating" | "error">(
    studyPlanTree ? "viewing" : "picking",
  );
  const [error, setError] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(null);
  const [examModalOpen, setExamModalOpen] = useState(false);
  const picker = useDriveFilePicker(accessToken, folderId, folderName);

  useLockBodyScroll(open);

  // Al abrir, si ya hay un árbol guardado lo muestra directo; si no, arranca en modo "picking" —
  // el picker ya arranca solo directo en la carpeta de esta materia (ver useDriveFilePicker).
  useEffect(() => {
    if (!open) return;
    setMode(studyPlanTree ? "viewing" : "picking");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    setGenProgress(null);
    try {
      const base64 = await downloadDriveFileAsBase64(file.id, accessToken);
      const nodes = await extractStudyPlanTree(base64, PDF_MIME, (done, total) => setGenProgress({ done, total }));
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

  // Adjuntar/quitar un archivo de referencia a un nodo puntual del árbol (clic derecho en el
  // diagrama) — se guarda como parte del mismo documento del árbol, no es una colección aparte.
  const handleSaveAttachment = (nodeId: string, file: StudyPlanTreeAttachment | null) => {
    if (!studyPlanTree) return;
    const nextAttachments = { ...(studyPlanTree.attachments || {}) };
    if (file) nextAttachments[nodeId] = file;
    else delete nextAttachments[nodeId];
    const updatedTree: StudyPlanTree = { ...studyPlanTree, attachments: nextAttachments };
    saveItemToFirestore(userId, "study_plan_tree", updatedTree).catch(() => {});
    setStudyPlanTree((prev) => [...prev.filter((t) => t.id !== updatedTree.id), updatedTree]);
  };

  // Archivos para ofrecer como selección rápida al crear un examen: el programa original del
  // árbol + los adjuntos de sus nodos, sin duplicados (el mismo archivo puede estar adjuntado a
  // más de un nodo).
  const examQuickPickFiles = (() => {
    if (!studyPlanTree) return [];
    const seen = new Map<string, { fileId: string; fileName: string }>();
    seen.set(studyPlanTree.sourceFileId, { fileId: studyPlanTree.sourceFileId, fileName: studyPlanTree.sourceFileName });
    Object.values(studyPlanTree.attachments || {}).forEach((att) => {
      if (!seen.has(att.fileId)) seen.set(att.fileId, { fileId: att.fileId, fileName: att.fileName });
    });
    return Array.from(seen.values());
  })();

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
          className={`w-full max-w-6xl h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
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
              {mode === "viewing" && (
                <button
                  type="button"
                  onClick={() => setExamModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-primary/10 hover:bg-primary hover:text-white dark:hover:text-black text-primary transition-all cursor-pointer"
                  title="Armar un examen de práctica con IA a partir del material de esta materia"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Crear Examen</span>
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
              <StudyPlanTreeView
                studyPlanTree={studyPlanTree}
                darkMode={darkMode}
                accessToken={accessToken}
                folderId={folderId}
                folderName={folderName}
                onSaveAttachment={handleSaveAttachment}
                onOpenInFacultad={onOpenInFacultad}
              />
            )}

            {mode === "generating" && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-bold">
                  {genProgress && genProgress.total > 0
                    ? `Procesando unidad ${genProgress.done} de ${genProgress.total}…`
                    : "Leyendo el plan de estudio…"}
                </p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Un documento largo puede tardar más de un minuto — se procesa por partes para que no se corte.
                </p>
              </div>
            )}

            {(mode === "picking" || mode === "error") && (
              <DriveFilePickerView
                darkMode={darkMode}
                breadcrumbs={picker.breadcrumbs}
                items={picker.items}
                loadingItems={picker.loadingItems}
                error={error || picker.error}
                onNavigate={picker.navigateTo}
                onPickFile={handlePickFile}
                fileMimeTypes={[PDF_MIME]}
                emptyMessage="Esta carpeta no tiene subcarpetas ni archivos PDF."
              />
            )}
          </div>
        </motion.div>
      </motion.div>
      {examModalOpen && (
        <ExamModal
          open={examModalOpen}
          onClose={() => setExamModalOpen(false)}
          darkMode={darkMode}
          userId={userId}
          accessToken={accessToken}
          folderId={folderId}
          folderName={folderName}
          quickPickFiles={examQuickPickFiles}
          setExams={setExams}
        />
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default StudyPlanTreeModal;
