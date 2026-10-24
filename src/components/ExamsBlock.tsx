import React, { useState } from "react";
import { GraduationCap, Clock } from "lucide-react";
import { Exam } from "../types";
import { getAccessTokenSync } from "../lib/supabase";
import { ExamModal } from "./ExamModal";
import { AcademicGaugeChart } from "./AcademicCharts";
import { uiSounds } from "../lib/sounds";

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

  if (exams.length === 0) return null;

  const sorted = [...exams].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  return (
    <div
      className={`scroll-reveal rounded-3xl border p-5 ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-150"}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-4.5 h-4.5 text-primary" />
        <h3 className="font-extrabold text-sm">Exámenes Creados</h3>
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
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-2xl border text-center transition-all cursor-pointer ${
              darkMode
                ? "bg-black border-zinc-800 hover:border-primary/40"
                : "bg-white border-zinc-150 hover:border-primary/40 shadow-sm"
            }`}
          >
            <span className="text-xs font-bold truncate max-w-full px-1">{exam.name}</span>
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
            <p className="text-[10px] font-semibold text-zinc-500 truncate max-w-full">{exam.folderName}</p>
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
          onOpenInFacultad={onOpenInFacultad}
        />
      )}
    </div>
  );
}

export default ExamsBlock;
