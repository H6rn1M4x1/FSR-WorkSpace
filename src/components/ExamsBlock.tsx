import React, { useState } from "react";
import { GraduationCap, Clock } from "lucide-react";
import { Exam } from "../types";
import { getAccessTokenSync } from "../lib/supabase";
import { ExamModal } from "./ExamModal";
import { uiSounds } from "../lib/sounds";

function scoreColorClass(score: number): string {
  if (score >= 70) return "text-emerald-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

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
// listan para volver a verlos, terminar de responder uno pendiente, o comparar puntajes.
export function ExamsBlock({
  darkMode,
  userId,
  exams,
  setExams,
}: {
  darkMode: boolean;
  userId: string;
  exams: Exam[];
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
}) {
  const [openExam, setOpenExam] = useState<Exam | null>(null);
  const accessToken = getAccessTokenSync();

  if (exams.length === 0) return null;

  const sorted = [...exams].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  return (
    <div className={`rounded-3xl border p-5 ${darkMode ? "bg-zinc-900/40 border-zinc-800" : "bg-white border-zinc-150"}`}>
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-4.5 h-4.5 text-primary" />
        <h3 className="font-extrabold text-sm">Exámenes con IA</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {sorted.map((exam) => (
          <button
            key={exam.id}
            type="button"
            onClick={() => {
              uiSounds.click();
              setOpenExam(exam);
            }}
            className={`flex flex-col gap-1.5 px-4 py-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              darkMode
                ? "bg-zinc-800/40 border-zinc-800 hover:border-primary/40"
                : "bg-slate-50 border-zinc-150 hover:border-primary/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold truncate">{exam.name}</span>
              {exam.status === "graded" && exam.result ? (
                <span className={`text-sm font-black shrink-0 ${scoreColorClass(exam.result.score)}`}>{exam.result.score}</span>
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-[10px] font-semibold text-zinc-500 truncate">{exam.folderName}</p>
            <p className="text-[9px] font-semibold text-zinc-400">{formatExamDate(exam.createdAt)}</p>
          </button>
        ))}
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
        />
      )}
    </div>
  );
}

export default ExamsBlock;
