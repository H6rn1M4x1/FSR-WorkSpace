import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  HeartPulse,
  ListChecks,
  ShieldAlert,
  BedDouble,
  Plus,
  AlertTriangle,
} from "lucide-react";
import type { RegistroEntrenamiento, EjercicioRutina, RutinaGimnasio, GrupoMuscular } from "../types";
import { GeminiService } from "../lib/gemini";
import { uiSounds } from "../lib/sounds";

// Mismos 7 grupos que GRUPOS_MUSCULARES en GymRutinaView.tsx — duplicado acá (en vez de
// importarlo) para no crear una dependencia circular entre los dos archivos (GymRutinaView.tsx
// importa este componente).
const GRUPOS_MUSCULARES: GrupoMuscular[] = ["Espalda", "Bíceps", "Tríceps", "Pecho", "Hombros", "Piernas", "Abdomen"];

function normalizeText(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

interface ExerciseProgress {
  ejercicio: string;
  tendencia: "mejora" | "estancado" | "declive" | "sin_datos";
  cambioPorcentual: number | null;
  comentario: string;
}

interface SuggestedExercise {
  nombre: string;
  grupoMuscular: string;
  seriesObjetivo?: number;
  repeticionesObjetivo?: number;
}

interface SuggestedRoutine {
  nombre: string;
  descripcion: string;
  grupoMuscularPrincipal: string;
  duracionEstimadaMin: number;
  ejercicios: SuggestedExercise[];
}

interface AIAnalysisResult {
  resumenGeneral: string;
  progresoPorEjercicio: ExerciseProgress[];
  recomendaciones: string[];
  gruposDescuidados: string[];
  rutinaSugerida: SuggestedRoutine | null;
}

// Mínimo de sesiones registradas para que valga la pena pedirle un análisis a la IA — con muy
// pocos datos, cualquier "tendencia" sería prácticamente inventada.
const MIN_SESIONES_PARA_ANALISIS = 3;
// Ventana de tiempo que se prioriza para detectar tendencias recientes (último entrenamiento
// vigente) — si no alcanzan sesiones en esa ventana, se cae a las últimas N sesiones igual, para
// que el análisis siempre tenga con qué trabajar si hay suficiente historial acumulado.
const VENTANA_DIAS = 120;
const FALLBACK_SESIONES = 24;

function buildWorkoutSummary(registros: RegistroEntrenamiento[]): string {
  const sorted = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const cutoff = Date.now() - VENTANA_DIAS * 86400000;
  const recent = sorted.filter((r) => new Date(r.fecha).getTime() >= cutoff);
  const dataset = recent.length >= MIN_SESIONES_PARA_ANALISIS ? recent : sorted.slice(-FALLBACK_SESIONES);

  const byExercise = new Map<string, { fecha: string; peso: number; volumen: number; grupoMuscular: string }[]>();
  dataset.forEach((sesion) => {
    sesion.ejerciciosLogs.forEach((log) => {
      const arr = byExercise.get(log.ejercicioNombre) || [];
      arr.push({ fecha: sesion.fecha, peso: log.pesoMaximoKg || 0, volumen: log.volumenTotalKg || 0, grupoMuscular: log.grupoMuscular });
      byExercise.set(log.ejercicioNombre, arr);
    });
  });

  const exerciseLines: string[] = [];
  byExercise.forEach((serie, nombre) => {
    const ordered = [...serie].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const grupo = ordered[0].grupoMuscular;
    if (ordered.length < 2) {
      exerciseLines.push(`- ${nombre} (${grupo}): solo ${ordered.length} registro, sin tendencia calculable todavía.`);
      return;
    }
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const pct = first.peso > 0 ? (((last.peso - first.peso) / first.peso) * 100).toFixed(1) : "n/a";
    exerciseLines.push(
      `- ${nombre} (${grupo}): ${ordered.length} sesiones entre ${first.fecha} y ${last.fecha}. Peso máx ${first.peso}kg -> ${last.peso}kg (variación ${pct}%). Volumen última sesión: ${last.volumen}kg.`
    );
  });

  const lastByGroup = new Map<string, string>();
  sorted.forEach((sesion) => {
    sesion.ejerciciosLogs.forEach((log) => {
      const prev = lastByGroup.get(log.grupoMuscular);
      if (!prev || sesion.fecha > prev) lastByGroup.set(log.grupoMuscular, sesion.fecha);
    });
  });
  const groupLines = GRUPOS_MUSCULARES.map((grupo) => {
    const fecha = lastByGroup.get(grupo);
    if (!fecha) return `- ${grupo}: sin registros todavía.`;
    const dias = Math.round((Date.now() - new Date(fecha).getTime()) / 86400000);
    return `- ${grupo}: último entrenamiento hace ${dias} días (${fecha}).`;
  });

  const sensaciones = sorted
    .slice(-10)
    .map((r) => r.sensacionGral)
    .filter(Boolean)
    .join(", ");

  return `RESUMEN GENERAL:
- Total de sesiones registradas (histórico completo): ${sorted.length}, desde ${sorted[0].fecha} hasta ${sorted[sorted.length - 1].fecha}.
- Sensación general de las últimas sesiones: ${sensaciones || "sin datos"}.

PROGRESO POR EJERCICIO (peso máximo levantado, orden cronológico, ventana analizada: ${dataset.length} sesiones):
${exerciseLines.join("\n") || "- Sin ejercicios con series registradas en la ventana analizada."}

ÚLTIMO ENTRENAMIENTO POR GRUPO MUSCULAR:
${groupLines.join("\n")}`;
}

const SYSTEM_INSTRUCTION = `Sos un entrenador personal (personal trainer) con 30 años de experiencia, idóneo, detallado y cercano. Vas a recibir un resumen de datos REALES de entrenamiento de un usuario (sesiones de gimnasio registradas: peso levantado, volumen, grupos musculares trabajados, fechas). Analizá ese historial a fondo, como lo haría un entrenador profesional revisando la bitácora de un cliente.

Respondé ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin bloques de código markdown (sin \`\`\`), con EXACTAMENTE esta forma:

{
  "resumenGeneral": "2 a 4 oraciones con tu evaluación general del progreso, en español rioplatense, tono profesional y motivador",
  "progresoPorEjercicio": [
    { "ejercicio": "nombre exacto del ejercicio tal como aparece en los datos", "tendencia": "mejora" | "estancado" | "declive" | "sin_datos", "cambioPorcentual": numero o null, "comentario": "una oración explicando por qué" }
  ],
  "recomendaciones": ["3 a 6 recomendaciones concretas y accionables, cada una una oración, específicas a estos datos"],
  "gruposDescuidados": ["nombres de grupos musculares -de la lista Espalda, Bíceps, Tríceps, Pecho, Hombros, Piernas, Abdomen- que llevan muchos días sin entrenarse o están desbalanceados respecto al resto"],
  "rutinaSugerida": {
    "nombre": "nombre de una rutina de descanso activo / recuperación / complemento pensada específicamente para este usuario",
    "descripcion": "1-2 oraciones explicando el objetivo de esta rutina puntual",
    "grupoMuscularPrincipal": "uno de: Espalda, Bíceps, Tríceps, Pecho, Hombros, Piernas, Abdomen",
    "duracionEstimadaMin": numero entre 20 y 60,
    "ejercicios": [ { "nombre": "string", "grupoMuscular": "uno de los 7 grupos listados arriba", "seriesObjetivo": numero, "repeticionesObjetivo": numero } ]
  }
}

La rutina sugerida debe tener entre 4 y 7 ejercicios, pensada para COMPLEMENTAR lo que el usuario ya viene entrenando (cubrir grupos descuidados y/o favorecer la recuperación activa, nunca una copia de lo que ya hace). Usá nombres de ejercicios comunes y reconocibles en español. Basate solo en los datos del resumen, no inventes números que no se puedan inferir de ahí.`;

function parseAIResponse(text: string): AIAnalysisResult {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(cleaned);
  return {
    resumenGeneral: String(parsed.resumenGeneral || ""),
    progresoPorEjercicio: Array.isArray(parsed.progresoPorEjercicio) ? parsed.progresoPorEjercicio : [],
    recomendaciones: Array.isArray(parsed.recomendaciones) ? parsed.recomendaciones.filter(Boolean) : [],
    gruposDescuidados: Array.isArray(parsed.gruposDescuidados) ? parsed.gruposDescuidados.filter(Boolean) : [],
    rutinaSugerida: parsed.rutinaSugerida || null,
  };
}

const TREND_STYLE: Record<ExerciseProgress["tendencia"], { icon: typeof TrendingUp; color: string; bar: string; label: string }> = {
  mejora: { icon: TrendingUp, color: "text-emerald-500", bar: "bg-emerald-500", label: "En progreso" },
  estancado: { icon: Minus, color: "text-amber-500", bar: "bg-amber-500", label: "Estancado" },
  declive: { icon: TrendingDown, color: "text-red-500", bar: "bg-red-500", label: "En baja" },
  sin_datos: { icon: Minus, color: "text-slate-400 dark:text-zinc-500", bar: "bg-slate-300 dark:bg-zinc-700", label: "Sin datos suficientes" },
};

export function GymAIAnalysisPanel({
  darkMode,
  registros,
  allExercises,
  showToast,
  onUseSuggestedRoutine,
}: {
  darkMode: boolean;
  registros: RegistroEntrenamiento[];
  allExercises: EjercicioRutina[];
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onUseSuggestedRoutine: (routine: Partial<RutinaGimnasio>, exercises: EjercicioRutina[]) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const hasEnoughData = registros.length >= MIN_SESIONES_PARA_ANALISIS;

  const handleGenerate = async () => {
    uiSounds.click();
    setStatus("loading");
    setErrorMsg("");
    try {
      const summary = buildWorkoutSummary(registros);
      const { text } = await GeminiService.sendChatMessage(
        `Acá está el resumen de mi historial de entrenamiento. Analizalo y respondé con el JSON pedido.\n\n${summary}`,
        [],
        { systemInstruction: SYSTEM_INSTRUCTION }
      );
      const parsed = parseAIResponse(text);
      setResult(parsed);
      setStatus("done");
      uiSounds.success();
    } catch (err: any) {
      console.error("Error generando análisis IA de progreso:", err);
      setStatus("error");
      setErrorMsg(err?.message || "No se pudo generar el análisis. Probá de nuevo en un momento.");
      uiSounds.error();
    }
  };

  const handleUseRoutine = () => {
    if (!result?.rutinaSugerida) return;
    const sugerida = result.rutinaSugerida;
    const grupoPrincipal = (GRUPOS_MUSCULARES as readonly string[]).includes(sugerida.grupoMuscularPrincipal)
      ? (sugerida.grupoMuscularPrincipal as GrupoMuscular)
      : "Pecho";

    const matchedExercises: EjercicioRutina[] = sugerida.ejercicios.map((ex, i) => {
      const norm = normalizeText(ex.nombre);
      const found = allExercises.find((cand) => normalizeText(cand.nombre) === norm || normalizeText(cand.nombre).includes(norm) || norm.includes(normalizeText(cand.nombre)));
      if (found) {
        return {
          ...found,
          seriesObjetivo: ex.seriesObjetivo || found.seriesObjetivo,
          repeticionesObjetivo: ex.repeticionesObjetivo || found.repeticionesObjetivo,
        };
      }
      const grupo = (GRUPOS_MUSCULARES as readonly string[]).includes(ex.grupoMuscular) ? (ex.grupoMuscular as GrupoMuscular) : grupoPrincipal;
      return {
        id: `ai_sugerido_${Date.now()}_${i}`,
        nombre: ex.nombre,
        grupoMuscular: grupo,
        seriesObjetivo: ex.seriesObjetivo,
        repeticionesObjetivo: ex.repeticionesObjetivo,
      };
    });

    onUseSuggestedRoutine(
      {
        nombre: sugerida.nombre,
        descripcion: sugerida.descripcion,
        grupoMuscularPrincipal: grupoPrincipal,
        duracionEstimadaMin: sugerida.duracionEstimadaMin || 45,
      },
      matchedExercises
    );
    uiSounds.success();
    showToast?.("Rutina sugerida cargada en el Constructor de Rutinas — revisala y guardala cuando quieras.", "success");
  };

  return (
    <div
      className={`rounded-3xl border p-5 space-y-5 scroll-reveal ${
        darkMode ? "bg-zinc-900/60 border-zinc-800/80 text-white" : "bg-white/80 border-slate-200/80 text-slate-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/40 dark:border-zinc-800/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Sparkles className="w-5 h-5 stroke-[2.25px]" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Tu Entrenador Personal (IA)</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Análisis de tu progreso real, con recomendaciones y una rutina de descanso/recuperación a medida.
            </p>
          </div>
        </div>

        {hasEnoughData && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === "loading"}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-full shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Analizando...
              </>
            ) : status === "done" ? (
              <>
                <RefreshCw className="w-4 h-4" /> Actualizar análisis
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generar análisis
              </>
            )}
          </button>
        )}
      </div>

      {!hasEnoughData && (
        <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2 bg-slate-100 dark:bg-zinc-950/60 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          Registrá al menos {MIN_SESIONES_PARA_ANALISIS} sesiones de entrenamiento para que el análisis tenga datos suficientes
          ({registros.length}/{MIN_SESIONES_PARA_ANALISIS} por ahora).
        </p>
      )}

      {status === "error" && (
        <p className="text-xs text-red-500 flex items-center gap-2 bg-red-500/10 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </p>
      )}

      <AnimatePresence>
        {status === "done" && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Sub-bloque: Resumen General */}
            <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary mb-1.5">
                <HeartPulse className="w-3.5 h-3.5" /> Resumen General
              </p>
              <p className="text-sm leading-relaxed">{result.resumenGeneral}</p>
            </div>

            {/* Sub-bloque: Progreso por Ejercicio */}
            {result.progresoPorEjercicio.length > 0 && (
              <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary mb-3">
                  <TrendingUp className="w-3.5 h-3.5" /> Progreso por Ejercicio
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {result.progresoPorEjercicio.map((p, i) => {
                    const style = TREND_STYLE[p.tendencia] || TREND_STYLE.sin_datos;
                    const TrendIcon = style.icon;
                    const barWidth = p.cambioPorcentual != null ? Math.min(100, Math.max(6, Math.abs(p.cambioPorcentual))) : 0;
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-extrabold truncate">{p.ejercicio}</span>
                          <span className={`flex items-center gap-1 text-[10px] font-black shrink-0 ${style.color}`}>
                            <TrendIcon className="w-3 h-3" />
                            {p.cambioPorcentual != null ? `${p.cambioPorcentual > 0 ? "+" : ""}${p.cambioPorcentual}%` : style.label}
                          </span>
                        </div>
                        {p.cambioPorcentual != null && (
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden mb-1.5">
                            <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${barWidth}%` }} />
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">{p.comentario}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-bloque: Recomendaciones */}
            {result.recomendaciones.length > 0 && (
              <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary mb-2.5">
                  <ListChecks className="w-3.5 h-3.5" /> Recomendaciones
                </p>
                <ul className="space-y-2">
                  {result.recomendaciones.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sub-bloque: Grupos Descuidados */}
            {result.gruposDescuidados.length > 0 && (
              <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary mb-2.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Grupos Musculares Descuidados
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.gruposDescuidados.map((grupo, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    >
                      {grupo}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-bloque: Rutina de Descanso/Recuperación Sugerida */}
            {result.rutinaSugerida && (
              <div className={`p-4 rounded-2xl border border-primary/30 ${darkMode ? "bg-primary/5" : "bg-primary/5"}`}>
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary mb-2">
                  <BedDouble className="w-3.5 h-3.5" /> Rutina de Descanso &amp; Recuperación Sugerida
                </p>
                <h4 className="text-sm font-black mb-0.5">{result.rutinaSugerida.nombre}</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{result.rutinaSugerida.descripcion}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {result.rutinaSugerida.ejercicios.map((ex, i) => (
                    <span
                      key={i}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        darkMode ? "bg-zinc-900 border border-zinc-800 text-zinc-200" : "bg-white border border-slate-200 text-slate-700"
                      }`}
                    >
                      {ex.nombre}
                      {ex.seriesObjetivo && ex.repeticionesObjetivo ? ` · ${ex.seriesObjetivo}x${ex.repeticionesObjetivo}` : ""}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleUseRoutine}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-full shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  Crear esta rutina en el Constructor
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GymAIAnalysisPanel;
