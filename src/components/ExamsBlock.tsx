import React, { useState } from "react";
import { GraduationCap, Clock, RotateCcw, Trash2, Combine, Check } from "lucide-react";
import { Exam, EXAM_INSTANCIAS, ExamInstancia } from "../types";
import { getAccessTokenSync } from "../lib/supabase";
import { saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { combineExams } from "../lib/exams";
import { ExamModal } from "./ExamModal";
import { AcademicGaugeChart } from "./AcademicCharts";
import { CustomSelect } from "./CustomSelect";
import { ConfirmationModal } from "./ConfirmationModal";
import { uiSounds } from "../lib/sounds";
import { useToast } from "../context/ToastContext";

function formatExamDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// Exámenes de práctica armados y corregidos por IA — distinto del calendario de exámenes reales
// de la facultad (eso vive en la sub-pestaña "Exámenes" de Académico, fechas/aulas/notas de
// parciales y finales). Se crean desde el botón "Crear Examen" del Árbol de Materias; acá solo se
// listan para volver a verlos, terminar de responder uno pendiente, rehacerlos, combinarlos o
// borrarlos.
export function ExamsBlock({
  darkMode,
  userId,
  exams,
  setExams,
  onOpenInFacultad,
}: {
  darkMode: boolean;
  userId: string;
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  // Para el botón "Ver en el material" dentro de la corrección de un examen — mismo callback que
  // ya usa el resto de Académico para abrir un archivo de Drive en Facultad.
  onOpenInFacultad: (folderId: string, folderName: string, fileId?: string) => void;
}) {
  const [openExam, setOpenExam] = useState<Exam | null>(null);
  const accessToken = getAccessTokenSync();
  const [filterMateria, setFilterMateria] = useState("");
  const [filterInstancia, setFilterInstancia] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{ exam: Exam; action: "delete" | "redo" } | null>(null);

  const [combineMode, setCombineMode] = useState(false);
  const [combineSelected, setCombineSelected] = useState<Set<string>>(new Set());
  const [combineName, setCombineName] = useState("");
  const [combineInstancia, setCombineInstancia] = useState<ExamInstancia | "">("");
  const [combineError, setCombineError] = useState<string | null>(null);
  const { showToast } = useToast();

  if (exams.length === 0) return null;

  const materiaOptions = Array.from(new Set(exams.map((e) => e.folderName))).sort((a, b) => a.localeCompare(b, "es"));
  const instanciaOptions = EXAM_INSTANCIAS.filter((i) => exams.some((e) => e.instancia === i));

  const filtered = exams.filter(
    (e) => (!filterMateria || e.folderName === filterMateria) && (!filterInstancia || e.instancia === filterInstancia),
  );
  // `String(...)` antes de comparar: `saveItemToFirestore` completa `updatedAt` con `Date.now()`
  // (un número) cuando el item que se guarda no trae uno propio — sin esto, un examen con esa
  // forma rompe TODO el bloque con un TypeError ("...localeCompare is not a function") apenas hay
  // un segundo examen con el que comparar (con uno solo, `.sort()` nunca llega a invocar esto).
  const sorted = [...filtered].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  const toggleCombineSelect = (id: string) => {
    uiSounds.click();
    setCombineSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget) return;
    const { exam, action } = confirmTarget;
    if (action === "delete") {
      await deleteItemFromFirestore(userId, "ai_exams", exam.id);
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
      uiSounds.delete();
      showToast(`"${exam.name}" se eliminó.`, "success");
    } else {
      // "Rehacer": el resultado actual (si lo hay) pasa al historial de intentos antes de
      // limpiar `answers`/`result` — así no se pierde el puntaje de la vuelta anterior.
      const resetExam: Exam = {
        ...exam,
        answers: undefined,
        result: undefined,
        status: "generated",
        previousAttempts: exam.result ? [...(exam.previousAttempts || []), exam.result] : exam.previousAttempts,
        updatedAt: new Date().toISOString(),
      };
      await saveItemToFirestore(userId, "ai_exams", resetExam);
      setExams((prev) => [...prev.filter((e) => e.id !== resetExam.id), resetExam]);
      uiSounds.success();
      showToast(`"${exam.name}" está listo para responder de nuevo.`, "success");
      setOpenExam(resetExam);
    }
  };

  const handleCombine = async () => {
    if (!combineName.trim() || combineSelected.size < 2) return;
    setCombineError(null);
    try {
      const selectedExams = exams.filter((e) => combineSelected.has(e.id));
      const combined = combineExams(selectedExams, combineName.trim(), combineInstancia || undefined);
      await saveItemToFirestore(userId, "ai_exams", combined);
      setExams((prev) => [...prev, combined]);
      uiSounds.success();
      showToast(`"${combined.name}" se creó combinando ${selectedExams.length} exámenes.`, "success");
      setCombineMode(false);
      setCombineSelected(new Set());
      setCombineName("");
      setCombineInstancia("");
    } catch (err: any) {
      uiSounds.error();
      setCombineError(err?.message || "No se pudo combinar los exámenes.");
    }
  };

  return (
    <div className={`scroll-reveal rounded-3xl border p-5 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-150"}`}>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4.5 h-4.5 text-primary" />
          <h3 className="font-extrabold text-sm">Exámenes Creados</h3>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {!combineMode && materiaOptions.length > 1 && (
            <div className="w-36">
              <CustomSelect
                size="sm"
                value={filterMateria}
                onChange={setFilterMateria}
                options={[{ value: "", label: "Todas las materias" }, ...materiaOptions.map((m) => ({ value: m, label: m }))]}
                placeholder="Todas las materias"
              />
            </div>
          )}
          {!combineMode && instanciaOptions.length > 0 && (
            <div className="w-40">
              <CustomSelect
                size="sm"
                value={filterInstancia}
                onChange={setFilterInstancia}
                options={[{ value: "", label: "Todas las instancias" }, ...instanciaOptions.map((i) => ({ value: i, label: i }))]}
                placeholder="Todas las instancias"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              uiSounds.click();
              setCombineMode((v) => !v);
              setCombineSelected(new Set());
              setCombineError(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
              combineMode
                ? "bg-primary text-white dark:text-black"
                : "bg-primary/10 text-primary hover:bg-primary hover:text-white dark:hover:text-black"
            }`}
          >
            <Combine className="w-3.5 h-3.5" />
            {combineMode ? "Cancelar" : "Combinar"}
          </button>
        </div>
      </div>

      {combineMode && (
        <div className={`mb-3 p-3 rounded-2xl border space-y-2 ${darkMode ? "bg-black/40 border-zinc-800" : "bg-slate-50 border-zinc-150"}`}>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={combineName}
              onChange={(e) => setCombineName(e.target.value)}
              placeholder="Nombre del examen combinado"
              className={`flex-1 px-3 py-2 rounded-xl border text-xs font-semibold outline-none ${
                darkMode ? "bg-zinc-800/60 border-zinc-700 text-zinc-100 focus:border-primary" : "bg-white border-zinc-200 text-zinc-800 focus:border-primary"
              }`}
            />
            <div className="sm:w-48 shrink-0">
              <CustomSelect
                size="sm"
                value={combineInstancia}
                onChange={(v) => setCombineInstancia(v as ExamInstancia | "")}
                options={[{ value: "", label: "Sin especificar" }, ...EXAM_INSTANCIAS.map((i) => ({ value: i, label: i }))]}
                placeholder="Sin especificar"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-zinc-500">
              Elegí 2 o más exámenes abajo para combinar ({combineSelected.size} elegido{combineSelected.size === 1 ? "" : "s"})
            </p>
            <button
              type="button"
              disabled={combineSelected.size < 2 || !combineName.trim()}
              onClick={handleCombine}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-primary text-white dark:text-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Combinar
            </button>
          </div>
          {combineError && <p className="text-[10px] text-red-500 font-semibold">{combineError}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {sorted.map((exam) => {
          const isSelected = combineSelected.has(exam.id);
          const attemptsCount = (exam.previousAttempts?.length || 0) + (exam.status === "graded" ? 1 : 0);
          return (
            <button
              key={exam.id}
              type="button"
              onClick={() => {
                if (combineMode) {
                  toggleCombineSelect(exam.id);
                  return;
                }
                uiSounds.click();
                setOpenExam(exam);
              }}
              className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded-2xl border text-center transition-all cursor-pointer ${
                combineMode && isSelected
                  ? "border-primary bg-primary/10"
                  : darkMode
                    ? "bg-black border-zinc-800 hover:border-primary/40"
                    : "bg-white border-zinc-150 hover:border-primary/40 shadow-sm"
              }`}
            >
              {combineMode ? (
                <div
                  className={`absolute top-1.5 left-1.5 w-4 h-4 rounded-md border-2 flex items-center justify-center ${
                    isSelected ? "bg-primary border-primary" : darkMode ? "border-zinc-600" : "border-zinc-300"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white dark:text-black" />}
                </div>
              ) : (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    title="Rehacer este examen"
                    onClick={() => setConfirmTarget({ exam, action: "redo" })}
                    className={`p-1 rounded-full cursor-pointer transition-colors ${darkMode ? "text-zinc-500 hover:bg-zinc-800 hover:text-primary" : "text-zinc-400 hover:bg-zinc-100 hover:text-primary"}`}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar este examen"
                    onClick={() => setConfirmTarget({ exam, action: "delete" })}
                    className={`p-1 rounded-full cursor-pointer transition-colors ${darkMode ? "text-zinc-500 hover:bg-red-500/10 hover:text-red-500" : "text-zinc-400 hover:bg-red-50 hover:text-red-500"}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              <span className="text-xs font-bold truncate max-w-full px-1 mt-2">{exam.name}</span>
              {exam.instancia && (
                <span className="text-[8px] font-bold uppercase tracking-wide text-primary/80">{exam.instancia}</span>
              )}
              {exam.status === "graded" && exam.result ? (
                <AcademicGaugeChart percent={exam.result.score} subtitle="PUNTAJE" darkMode={darkMode} compact />
              ) : (
                <div className="h-20 w-32 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
              )}
              {attemptsCount > 1 && (
                <span className="text-[8px] font-bold text-zinc-500">{attemptsCount} intentos</span>
              )}
              <p className="text-[10px] font-semibold text-zinc-500 truncate max-w-full">{exam.folderName}</p>
              <p className="text-[9px] font-semibold text-zinc-400">{formatExamDate(exam.createdAt)}</p>
            </button>
          );
        })}
      </div>

      {openExam && (
        <ExamModal
          open={!!openExam}
          onClose={() => setOpenExam(null)}
          darkMode={darkMode}
          userId={userId}
          accessToken={accessToken}
          folderId={openExam.folderId}
          folderName={openExam.folderName}
          quickPickFiles={[]}
          setExams={setExams}
          existingExam={openExam}
          onOpenInFacultad={onOpenInFacultad}
        />
      )}

      <ConfirmationModal
        isOpen={!!confirmTarget}
        darkMode={darkMode}
        title={confirmTarget?.action === "delete" ? "¿Eliminar examen?" : "¿Rehacer examen?"}
        message={
          confirmTarget?.action === "delete"
            ? `Se va a borrar "${confirmTarget.exam.name}" para siempre.`
            : `Vas a volver a responder "${confirmTarget?.exam.name}" desde cero${
                confirmTarget?.exam.result ? ` — tu puntaje actual (${confirmTarget.exam.result.score}) queda guardado en el historial de intentos` : ""
              }.`
        }
        confirmText={confirmTarget?.action === "delete" ? "Eliminar" : "Rehacer"}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmTarget(null)}
      />
    </div>
  );
}

export default ExamsBlock;
