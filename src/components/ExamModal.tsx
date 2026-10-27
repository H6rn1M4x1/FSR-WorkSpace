import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Loader2,
  Sparkles,
  Plus,
  Minus,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  BookOpenCheck,
  Clock,
} from "lucide-react";
import { EXAM_INSTANCIAS, Exam, ExamAnswer, ExamInstancia, ExamQuestionGrade, ExamResult } from "../types";
import { saveItemToFirestore } from "../lib/firestoreSyncService";
import {
  generateExamQuestions,
  gradeExam,
  resolveFileMeta,
  prepareFileParts,
  MAX_EXAM_SOURCE_FILE_BYTES,
  MAX_EXAM_SOURCE_TOTAL_BYTES,
} from "../lib/exams";
import { DriveFilePickerView } from "./DriveFilePickerView";
import { useDriveFilePicker, DriveItemLite } from "../hooks/useDriveFilePicker";
import { CustomSelect } from "./CustomSelect";
import { uiSounds } from "../lib/sounds";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useToast } from "../context/ToastContext";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

type SourceFile = { fileId: string; fileName: string };
type Mode = "creating" | "generating" | "answering" | "grading" | "reviewing" | "error";

// Número con una pequeña animación de "salto" cada vez que cambia — para los contadores de
// preguntas (+/-), junto con el sonido y la vibración que ya vienen con cualquier `uiSounds.*()`.
function BouncingCount({ value }: { value: number }) {
  return (
    <span className="relative inline-flex w-6 h-5 items-center justify-center overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -10, opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 10, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute text-sm font-extrabold"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function newExamId(): string {
  return `exam_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function scoreColorClass(score: number): string {
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

export function ExamModal({
  open,
  onClose,
  darkMode,
  userId,
  accessToken,
  folderId,
  folderName,
  quickPickFiles,
  setExams,
  existingExam,
  onOpenInFacultad,
}: {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  userId: string;
  accessToken: string | null;
  // Carpeta de la materia desde la que se abrió — mismo criterio que el árbol: el picker de
  // "Buscar en Facultad" arranca directo ahí.
  folderId: string;
  folderName: string;
  // Archivos ya conocidos para elegir rápido sin tener que buscar (los adjuntos del árbol y su
  // archivo fuente) — se ofrecen como checkboxes antes de ofrecer "Buscar en Facultad".
  quickPickFiles: SourceFile[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  // Si se abre desde el bloque "Exámenes Creados" para responder o revisar uno ya generado, en vez
  // de crear uno nuevo desde cero.
  existingExam?: Exam | null;
  // Para "Ver en el material" en la corrección — si el archivo fuente de la cita no es un PDF (no
  // se puede resaltar con el visor propio), cae a abrirlo en Facultad como el resto de la app.
  onOpenInFacultad: (folderId: string, folderName: string, fileId?: string) => void;
}) {
  const [mode, setMode] = useState<Mode>(() =>
    existingExam ? (existingExam.status === "graded" ? "reviewing" : "answering") : "creating",
  );
  const [retryMode, setRetryMode] = useState<Mode>("creating");
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(existingExam || null);

  const [examName, setExamName] = useState("");
  const [examInstancia, setExamInstancia] = useState<ExamInstancia | "">(existingExam?.instancia || "");
  const [selectedQuickFiles, setSelectedQuickFiles] = useState<Set<string>>(new Set());
  const [extraFiles, setExtraFiles] = useState<SourceFile[]>([]);
  const [mcCount, setMcCount] = useState(5);
  const [essayCount, setEssayCount] = useState(3);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [genProgress, setGenProgress] = useState<string | null>(null);
  const picker = useDriveFilePicker(accessToken, folderId, folderName);
  const { showToast } = useToast();

  // Arranca a contar apenas se entra a responder (generando uno nuevo, o reabriendo uno pendiente
  // ya existente) — se usa al entregar para guardar cuánto tardó esta vuelta.
  const answeringStartedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (mode === "answering" && answeringStartedAtRef.current == null) {
      answeringStartedAtRef.current = Date.now();
    }
  }, [mode]);

  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    (existingExam?.answers || []).forEach((a) => {
      init[a.questionId] = a.value;
    });
    return init;
  });

  useLockBodyScroll(open);

  if (!open) return null;

  const allSelectedFiles: SourceFile[] = [
    ...quickPickFiles.filter((f) => selectedQuickFiles.has(f.fileId)),
    ...extraFiles,
  ];
  const totalQuestions = mcCount + essayCount;
  const canGenerate = examName.trim().length > 0 && allSelectedFiles.length > 0 && totalQuestions > 0 && totalQuestions <= 15;

  const toggleQuickFile = (fileId: string) => {
    uiSounds.click();
    setSelectedQuickFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handlePickExtraFile = (file: DriveItemLite) => {
    uiSounds.success();
    setExtraFiles((prev) => (prev.some((f) => f.fileId === file.id) ? prev : [...prev, { fileId: file.id, fileName: file.name }]));
    setPickerOpen(false);
  };

  const removeExtraFile = (fileId: string) => {
    uiSounds.click();
    setExtraFiles((prev) => prev.filter((f) => f.fileId !== fileId));
  };

  const handleGenerate = async () => {
    if (!accessToken || !canGenerate) return;
    setMode("generating");
    setError(null);
    try {
      setGenProgress("Leyendo los archivos…");
      const metas = await Promise.all(allSelectedFiles.map((f) => resolveFileMeta(f.fileId, accessToken)));
      const oversizeIdx = metas.findIndex((m) => m.sizeBytes > MAX_EXAM_SOURCE_FILE_BYTES);
      if (oversizeIdx >= 0) {
        throw new Error(
          `"${allSelectedFiles[oversizeIdx].fileName}" pesa ${(metas[oversizeIdx].sizeBytes / (1024 * 1024)).toFixed(1)} MB, es demasiado grande (máx. ~4 MB por archivo).`,
        );
      }
      const totalSize = metas.reduce((sum, m) => sum + m.sizeBytes, 0);
      if (totalSize > MAX_EXAM_SOURCE_TOTAL_BYTES) {
        throw new Error(
          `Los archivos elegidos pesan ${(totalSize / (1024 * 1024)).toFixed(1)} MB en total, es demasiado para procesarlos juntos (máx. ~8 MB). Elegí menos archivos.`,
        );
      }
      setGenProgress("Leyendo el contenido de los archivos…");
      const { parts: fileParts, failed: downloadFailures } = await prepareFileParts(
        allSelectedFiles.map((f, i) => ({ fileId: f.fileId, mimeType: metas[i].mimeType, fileName: f.fileName })),
        accessToken,
      );
      setGenProgress("Generando preguntas…");
      const questions = await generateExamQuestions(fileParts, mcCount, essayCount);
      const now = new Date().toISOString();
      // `sourceFiles` queda solo con los que de verdad se pudieron leer — guardar uno que ya
      // falló acá no sirve de nada, va a volver a fallar igual al corregir.
      const succeededIds = new Set(fileParts.map((p) => p.fileId));
      const newExam: Exam = {
        id: newExamId(),
        folderId,
        folderName,
        name: examName.trim(),
        instancia: examInstancia || undefined,
        sourceFiles: allSelectedFiles
          .map((f, i) => ({ fileId: f.fileId, fileName: f.fileName, mimeType: metas[i].mimeType }))
          .filter((f) => succeededIds.has(f.fileId)),
        questions,
        status: "generated",
        createdAt: now,
        updatedAt: now,
      };
      if (downloadFailures.length > 0) {
        showToast(
          `El examen se generó igual, pero no se pudo leer ${downloadFailures.length === 1 ? "este archivo" : "estos archivos"}: ${downloadFailures
            .map((f) => `"${f.fileName}"`)
            .join(", ")}.`,
          "error",
        );
      }
      await saveItemToFirestore(userId, "ai_exams", newExam);
      setExams((prev) => [...prev.filter((e) => e.id !== newExam.id), newExam]);
      setExam(newExam);
      uiSounds.success();
      setMode("answering");
    } catch (err: any) {
      uiSounds.error();
      setError(err?.message || "No se pudo generar el examen. Probá de nuevo.");
      setRetryMode("creating");
      setMode("error");
    } finally {
      setGenProgress(null);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setLocalAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!exam || !accessToken) return;
    setMode("grading");
    setError(null);
    try {
      const answers: ExamAnswer[] = exam.questions.map((q) => ({ questionId: q.id, value: localAnswers[q.id] || "" }));
      const { parts: fileParts, failed: downloadFailures } = await prepareFileParts(
        exam.sourceFiles.map((f) => ({ fileId: f.fileId, mimeType: f.mimeType, fileName: f.fileName })),
        accessToken,
      );
      if (downloadFailures.length > 0) {
        showToast(
          `No se pudo leer ${downloadFailures.length === 1 ? "este archivo" : "estos archivos"} de referencia (puede que ya no exista en Drive): ${downloadFailures
            .map((f) => `"${f.fileName}"`)
            .join(", ")}. Se corrigió igual con el resto del material.`,
          "error",
        );
      }
      const result = await gradeExam(fileParts, exam.questions, answers);
      const timeSpentSeconds = answeringStartedAtRef.current != null ? Math.round((Date.now() - answeringStartedAtRef.current) / 1000) : undefined;
      const resultWithTime: ExamResult = { ...result, timeSpentSeconds };
      const updatedExam: Exam = { ...exam, answers, result: resultWithTime, status: "graded", updatedAt: new Date().toISOString() };
      await saveItemToFirestore(userId, "ai_exams", updatedExam);
      setExams((prev) => [...prev.filter((e) => e.id !== updatedExam.id), updatedExam]);
      setExam(updatedExam);
      uiSounds.success();
      setMode("reviewing");
    } catch (err: any) {
      uiSounds.error();
      setError(err?.message || "No se pudo corregir el examen. Probá de nuevo.");
      setRetryMode("answering");
      setMode("error");
    }
  };

  const answeredCount = exam ? exam.questions.filter((q) => (localAnswers[q.id] || "").trim().length > 0).length : 0;
  const gradeByQuestion = new Map<string, ExamQuestionGrade>((exam?.result?.questionGrades || []).map((g) => [g.questionId, g]));

  // Botón "Ver en el material" de una pregunta de desarrollo corregida: de qué archivo fuente
  // viene la cita que respalda la respuesta (para saber cuál abrir en Facultad).
  const resolveSourceFile = (grade: ExamQuestionGrade) => {
    if (!exam || !grade.sourceQuote) return null;
    const idx = grade.sourceFileIndex ?? (exam.sourceFiles.length === 1 ? 0 : undefined);
    if (idx == null) return null;
    return exam.sourceFiles[idx] || null;
  };

  // Navega de verdad a Facultad (cierra este modal) con ese archivo abierto en su carpeta real —
  // mismo mecanismo que el resto de la app usa para "Abrir en Facultad", en vez de un visor propio
  // flotando arriba del examen.
  const handleViewSource = (grade: ExamQuestionGrade) => {
    const file = resolveSourceFile(grade);
    if (!file) return;
    uiSounds.click();
    onClose();
    onOpenInFacultad(folderId, folderName, file.fileId);
  };

  const inputClass = `w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition-colors ${
    darkMode
      ? "bg-zinc-800/60 border-zinc-700 text-zinc-100 focus:border-primary"
      : "bg-slate-50 border-zinc-200 text-zinc-800 focus:border-primary"
  }`;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-3xl h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
          }`}
        >
          <div
            className={`flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0 ${
              darkMode ? "border-zinc-800" : "border-zinc-150"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm truncate">{exam?.name || "Crear examen"}</h3>
                <p className="text-[10px] text-zinc-500 font-semibold truncate">{folderName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {mode === "creating" && (
              <div className="p-5 space-y-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">
                      Nombre del examen
                    </label>
                    <input
                      type="text"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      placeholder="Ej: Repaso Unidad 3"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:w-52 shrink-0">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">Instancia</label>
                    <CustomSelect
                      value={examInstancia}
                      onChange={(v) => setExamInstancia(v as ExamInstancia | "")}
                      options={[{ value: "", label: "Sin especificar" }, ...EXAM_INSTANCIAS.map((i) => ({ value: i, label: i }))]}
                      placeholder="Sin especificar"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">
                    Archivos de referencia
                  </label>
                  {quickPickFiles.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {quickPickFiles.map((f) => (
                        <button
                          key={f.fileId}
                          type="button"
                          onClick={() => toggleQuickFile(f.fileId)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedQuickFiles.has(f.fileId)
                              ? "bg-primary/10 border-primary/50"
                              : darkMode
                                ? "bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800"
                                : "bg-slate-50 border-zinc-150 hover:bg-slate-100"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border-2 shrink-0 flex items-center justify-center ${
                              selectedQuickFiles.has(f.fileId) ? "bg-primary border-primary" : darkMode ? "border-zinc-600" : "border-zinc-300"
                            }`}
                          >
                            {selectedQuickFiles.has(f.fileId) && <CheckCircle2 className="w-3 h-3 text-white dark:text-black" />}
                          </div>
                          <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="text-xs font-semibold truncate">{f.fileName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {extraFiles.map((f) => (
                    <div
                      key={f.fileId}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border mb-1.5 ${
                        darkMode ? "bg-primary/10 border-primary/30" : "bg-primary/5 border-primary/30"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="text-xs font-semibold truncate flex-1">{f.fileName}</span>
                      <button
                        type="button"
                        onClick={() => removeExtraFile(f.fileId)}
                        className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    disabled={!accessToken}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed text-[11px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      darkMode ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800" : "border-zinc-300 text-zinc-500 hover:bg-zinc-50"
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    Buscar en Facultad
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">Opción múltiple</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          uiSounds.toggle();
                          setMcCount((n) => Math.max(0, n - 1));
                        }}
                        className={`p-2 rounded-full cursor-pointer transition-transform active:scale-90 ${darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <BouncingCount value={mcCount} />
                      <button
                        type="button"
                        onClick={() => {
                          uiSounds.toggle();
                          setMcCount((n) => Math.min(12, n + 1));
                        }}
                        className={`p-2 rounded-full cursor-pointer transition-transform active:scale-90 ${darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block">Desarrollo</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          uiSounds.toggle();
                          setEssayCount((n) => Math.max(0, n - 1));
                        }}
                        className={`p-2 rounded-full cursor-pointer transition-transform active:scale-90 ${darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <BouncingCount value={essayCount} />
                      <button
                        type="button"
                        onClick={() => {
                          uiSounds.toggle();
                          setEssayCount((n) => Math.min(12, n + 1));
                        }}
                        className={`p-2 rounded-full cursor-pointer transition-transform active:scale-90 ${darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {totalQuestions > 15 && (
                  <p className="text-[10px] text-red-500 font-semibold">Máximo 15 preguntas en total por examen.</p>
                )}
              </div>
            )}

            {(mode === "generating" || mode === "grading") && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-bold">{mode === "generating" ? genProgress || "Generando…" : "Corrigiendo tu examen…"}</p>
                <p className="text-xs text-zinc-500 max-w-sm">Puede tardar unos segundos, no cierres esta ventana.</p>
              </div>
            )}

            {mode === "error" && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <p className="text-sm font-bold text-red-500 max-w-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => setMode(retryMode)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-primary text-white dark:text-black cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reintentar
                </button>
              </div>
            )}

            {mode === "answering" && exam && (
              <div className="p-5 space-y-4">
                <p className={`text-[11px] font-bold ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                  {answeredCount} de {exam.questions.length} preguntas respondidas
                </p>
                {exam.questions.map((q, qi) => (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-800/40 border-zinc-800" : "bg-slate-50 border-zinc-150"}`}
                  >
                    <p className="text-xs font-bold mb-3">
                      {qi + 1}. {q.prompt}{" "}
                      <span className="text-[9px] font-semibold text-zinc-500">({q.points} pts)</span>
                    </p>
                    {q.type === "multiple_choice" ? (
                      <div className="space-y-1.5">
                        {(q.options || []).map((opt) => (
                          <label
                            key={opt.id}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                              localAnswers[q.id] === opt.id
                                ? "bg-primary/10 border-primary/50"
                                : darkMode
                                  ? "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                                  : "bg-white border-zinc-150 hover:border-zinc-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              checked={localAnswers[q.id] === opt.id}
                              onChange={() => handleAnswerChange(q.id, opt.id)}
                              className="accent-primary"
                            />
                            <span className="text-[11px] font-semibold">{opt.text}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        value={localAnswers[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Desarrollá tu respuesta acá…"
                        rows={4}
                        className={`w-full px-3 py-2.5 rounded-lg border text-xs font-medium outline-none resize-none transition-colors ${
                          darkMode
                            ? "bg-zinc-900/40 border-zinc-800 text-zinc-100 focus:border-primary"
                            : "bg-white border-zinc-150 text-zinc-800 focus:border-primary"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {mode === "reviewing" && exam?.result && (
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center justify-center text-center py-4">
                  <p className={`text-5xl font-black ${scoreColorClass(exam.result.score)}`}>{exam.result.score}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mt-1">sobre 100</p>
                  {exam.result.timeSpentSeconds != null && (
                    <div className="flex items-end gap-2 mt-2">
                      {(() => {
                        const prevTime = exam.previousAttempts?.[exam.previousAttempts.length - 1]?.timeSpentSeconds;
                        return prevTime != null ? (
                          <span className="text-[10px] font-semibold text-zinc-400 line-through decoration-zinc-500/40">
                            {formatDuration(prevTime)}
                          </span>
                        ) : null;
                      })()}
                      <span className={`flex items-center gap-1 text-xs font-bold ${darkMode ? "text-zinc-300" : "text-zinc-600"}`}>
                        <Clock className="w-3 h-3" />
                        {formatDuration(exam.result.timeSpentSeconds)}
                      </span>
                    </div>
                  )}
                  <p className="text-xs font-medium mt-3 max-w-md text-center">{exam.result.summary}</p>
                  {(exam.previousAttempts?.length || 0) > 0 && (
                    <div className="flex items-end justify-center gap-2.5 mt-4">
                      {[...(exam.previousAttempts || []), exam.result].map((r, i, arr) => {
                        const isLast = i === arr.length - 1;
                        return (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-black">{r.score}</span>
                            <div
                              className={`w-5 rounded-t-md ${isLast ? "bg-primary" : "bg-primary/35"}`}
                              style={{ height: `${Math.max(4, (r.score / 100) * 48)}px` }}
                            />
                            <span className="text-[8px] font-bold text-zinc-500">#{i + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {exam.questions.map((q, qi) => {
                  const grade = gradeByQuestion.get(q.id);
                  const userAnswer = exam.answers?.find((a) => a.questionId === q.id)?.value || "";
                  const correct = q.type === "multiple_choice" ? userAnswer === q.correctOptionId : (grade?.pointsEarned || 0) >= q.points * 0.6;
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-800/40 border-zinc-800" : "bg-slate-50 border-zinc-150"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-xs font-bold flex-1">
                          {qi + 1}. {q.prompt}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {correct ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          <span className="text-[10px] font-extrabold">
                            {grade?.pointsEarned ?? 0}/{q.points}
                          </span>
                        </div>
                      </div>
                      {q.type === "multiple_choice" ? (
                        <div className="space-y-1">
                          {(q.options || []).map((opt) => {
                            const isCorrect = opt.id === q.correctOptionId;
                            const isChosen = opt.id === userAnswer;
                            return (
                              <div
                                key={opt.id}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-2 ${
                                  isCorrect
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : isChosen
                                      ? "bg-red-500/10 text-red-500"
                                      : darkMode
                                        ? "text-zinc-400"
                                        : "text-zinc-500"
                                }`}
                              >
                                {isCorrect && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                                {!isCorrect && isChosen && <XCircle className="w-3 h-3 shrink-0" />}
                                {opt.text}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <>
                          <p className={`text-[11px] font-medium italic mb-2 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                            Tu respuesta: {userAnswer || "(sin responder)"}
                          </p>
                          {!userAnswer.trim() && grade?.expectedAnswer && (
                            <p className="text-[11px] font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                              Respuesta correcta: {grade.expectedAnswer}
                            </p>
                          )}
                        </>
                      )}
                      {grade?.feedback && (
                        <p className={`text-[10px] font-semibold mt-2 pt-2 border-t ${darkMode ? "border-zinc-700 text-zinc-300" : "border-zinc-200 text-zinc-600"}`}>
                          {grade.feedback}
                        </p>
                      )}
                      {q.type === "essay" && grade && resolveSourceFile(grade) && (
                        <button
                          type="button"
                          onClick={() => handleViewSource(grade)}
                          className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          <BookOpenCheck className="w-3 h-3" />
                          Ver en el material
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0 ${
              darkMode ? "border-zinc-800" : "border-zinc-150"
            }`}
          >
            {mode === "creating" && (
              <button
                type="button"
                disabled={!canGenerate}
                onClick={handleGenerate}
                className="px-4 py-2.5 rounded-full text-xs font-bold bg-primary text-white dark:text-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generar examen
              </button>
            )}
            {mode === "answering" && (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2.5 rounded-full text-xs font-bold bg-primary text-white dark:text-black transition-all cursor-pointer"
              >
                Entregar
              </button>
            )}
          </div>

          {pickerOpen && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setPickerOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-xl h-[60vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                  darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
                }`}
              >
                <div className={`flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0 ${darkMode ? "border-zinc-800" : "border-zinc-150"}`}>
                  <h3 className="font-extrabold text-sm">Buscar archivo en Facultad</h3>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className={`p-2 rounded-full cursor-pointer shrink-0 ${darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-400"}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <DriveFilePickerView
                    darkMode={darkMode}
                    breadcrumbs={picker.breadcrumbs}
                    items={picker.items}
                    loadingItems={picker.loadingItems}
                    error={picker.error}
                    onNavigate={picker.navigateTo}
                    onPickFile={handlePickExtraFile}
                    emptyMessage="Esta carpeta no tiene subcarpetas ni archivos."
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export default ExamModal;
