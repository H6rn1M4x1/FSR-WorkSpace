import React, { useEffect, useRef, useState } from "react";
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
  Scale,
  Clock,
} from "lucide-react";
import type { RegistroEntrenamiento, EjercicioRutina, RutinaGimnasio, GrupoMuscular } from "../types";
import { GeminiService } from "../lib/gemini";
import { uiSounds } from "../lib/sounds";
import { subscribeGymAIAnalysis, saveGymAIAnalysis, type StoredGymAIAnalysis } from "../lib/gymAIAnalysisService";

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

// "2026-W44" — para saber si el análisis automático semanal ya corrió esta semana (ISO 8601).
function getISOWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

type Objetivo = "bajar" | "mantener" | "subir";

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

interface ProgresoMensual {
  huboProgreso: boolean | null;
  comentario: string;
  pesoEstimadoCambioKg: number | null;
}

interface AIAnalysisResult {
  resumenGeneral: string;
  progresoPorEjercicio: ExerciseProgress[];
  recomendaciones: string[];
  gruposDescuidados: string[];
  rutinaSugerida: SuggestedRoutine | null;
  progresoMensual: ProgresoMensual | null;
}

// Mínimo de sesiones registradas para que valga la pena pedirle un análisis a la IA — con muy
// pocos datos, cualquier "tendencia" sería prácticamente inventada.
const MIN_SESIONES_PARA_ANALISIS = 3;
// Ventana de tiempo que se prioriza para detectar tendencias recientes (último entrenamiento
// vigente) — si no alcanzan sesiones en esa ventana, se cae a las últimas N sesiones igual, para
// que el análisis siempre tenga con qué trabajar si hay suficiente historial acumulado.
const VENTANA_DIAS = 120;
const FALLBACK_SESIONES = 24;
const EXERCISE_PAGE_SIZE = 4;
const EXERCISE_AUTO_ADVANCE_MS = 5000;

function monthKey(fecha: string): string {
  return fecha.slice(0, 7); // "YYYY-MM"
}

function buildWorkoutSummary(
  registros: RegistroEntrenamiento[],
  currentWeightKg: number | undefined,
  weightHistory: { fecha: string; peso: number }[],
  objetivo: Objetivo
): string {
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

  // Comparación mes actual vs mes anterior (sesiones y volumen) — se arma siempre que haya
  // historial que cruce al menos un cambio de mes, para que el análisis pueda comentar sobre
  // progreso mensual en cualquier momento, no solo el día 1.
  const now = new Date();
  const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const sessionsByMonth = new Map<string, { count: number; volumen: number }>();
  sorted.forEach((r) => {
    const key = monthKey(r.fecha);
    const cur = sessionsByMonth.get(key) || { count: 0, volumen: 0 };
    cur.count += 1;
    cur.volumen += r.volumenTotalSesionKg || 0;
    sessionsByMonth.set(key, cur);
  });
  const curMonth = sessionsByMonth.get(curMonthKey) || { count: 0, volumen: 0 };
  const prevMonth = sessionsByMonth.get(prevMonthKey) || { count: 0, volumen: 0 };

  // Peso corporal: actual, y el más cercano a hace ~30 días para poder calcular variación.
  const weightSorted = [...weightHistory].filter((w) => w.peso > 0).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const weightLines: string[] = [];
  if (currentWeightKg) weightLines.push(`- Peso actual: ${currentWeightKg}kg.`);
  if (weightSorted.length > 0) {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    const pastEntry = weightSorted.filter((w) => new Date(w.fecha).getTime() <= thirtyDaysAgo).pop();
    if (pastEntry) weightLines.push(`- Peso hace ~30 días (${pastEntry.fecha}): ${pastEntry.peso}kg.`);
    const firstEntry = weightSorted[0];
    weightLines.push(`- Primer registro de peso disponible (${firstEntry.fecha}): ${firstEntry.peso}kg.`);
  }
  weightLines.push(`- Objetivo del usuario: ${objetivo === "bajar" ? "bajar de peso" : objetivo === "subir" ? "subir de peso (masa muscular)" : "mantener el peso actual"}.`);

  return `RESUMEN GENERAL:
- Total de sesiones registradas (histórico completo): ${sorted.length}, desde ${sorted[0].fecha} hasta ${sorted[sorted.length - 1].fecha}.
- Sensación general de las últimas sesiones: ${sensaciones || "sin datos"}.

PROGRESO POR EJERCICIO (peso máximo levantado, orden cronológico, ventana analizada: ${dataset.length} sesiones):
${exerciseLines.join("\n") || "- Sin ejercicios con series registradas en la ventana analizada."}

ÚLTIMO ENTRENAMIENTO POR GRUPO MUSCULAR:
${groupLines.join("\n")}

COMPARACIÓN MES ACTUAL (${curMonthKey}) VS MES ANTERIOR (${prevMonthKey}):
- Mes actual: ${curMonth.count} sesiones, ${Math.round(curMonth.volumen)}kg de volumen total.
- Mes anterior: ${prevMonth.count} sesiones, ${Math.round(prevMonth.volumen)}kg de volumen total.

PESO CORPORAL:
${weightLines.join("\n")}`;
}

const SYSTEM_INSTRUCTION = `Sos un entrenador personal (personal trainer) con 30 años de experiencia, idóneo, detallado y cercano. Vas a recibir un resumen de datos REALES de entrenamiento y peso corporal de un usuario. Analizá ese historial a fondo, como lo haría un entrenador profesional revisando la bitácora de un cliente.

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
  },
  "progresoMensual": {
    "huboProgreso": true | false | null (null si no hay suficientes datos de ambos meses para comparar),
    "comentario": "2-3 oraciones comparando el mes actual contra el anterior (frecuencia, volumen, consistencia) y, si hay datos de peso, si el peso viene acompañando el objetivo declarado",
    "pesoEstimadoCambioKg": numero o null (tu estimación de cuántos kg debería haber bajado o subido en el último mes para ir en línea con su objetivo y su nivel de actividad real — negativo si debería bajar, positivo si debería subir, null si no podés estimarlo con los datos que tenés)
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
    progresoMensual: parsed.progresoMensual || null,
  };
}

const TREND_STYLE: Record<ExerciseProgress["tendencia"], { icon: typeof TrendingUp; color: string; bar: string; label: string }> = {
  mejora: { icon: TrendingUp, color: "text-emerald-500", bar: "bg-emerald-500", label: "En progreso" },
  estancado: { icon: Minus, color: "text-amber-500", bar: "bg-amber-500", label: "Estancado" },
  declive: { icon: TrendingDown, color: "text-red-500", bar: "bg-red-500", label: "En baja" },
  sin_datos: { icon: Minus, color: "text-slate-400 dark:text-zinc-500", bar: "bg-slate-300 dark:bg-zinc-700", label: "Sin datos suficientes" },
};

const OBJETIVO_LABELS: Record<Objetivo, string> = { bajar: "Bajar peso", mantener: "Mantener peso", subir: "Subir peso" };

function formatGeneratedAt(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Hoy, ${timeStr}`;
  return `${d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}, ${timeStr}`;
}

export function GymAIAnalysisPanel({
  darkMode,
  userId,
  registros,
  allExercises,
  currentWeightKg,
  weightHistory = [],
  showToast,
  onUseSuggestedRoutine,
}: {
  darkMode: boolean;
  userId?: string | null;
  registros: RegistroEntrenamiento[];
  allExercises: EjercicioRutina[];
  currentWeightKg?: number;
  weightHistory?: { fecha: string; peso: number }[];
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onUseSuggestedRoutine: (routine: Partial<RutinaGimnasio>, exercises: EjercicioRutina[]) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [objetivo, setObjetivo] = useState<Objetivo>("mantener");
  // Ref (no state) para no disparar el efecto de abajo de nuevo al marcarlo — ya cumplió su
  // propósito en cuanto corre una vez por montaje del panel.
  const autoRanRef = useRef(false);

  const hasEnoughData = registros.length >= MIN_SESIONES_PARA_ANALISIS;

  // runGeneration se dispara tanto desde el botón como desde el efecto de auto-generación
  // semanal de más abajo — ese efecto solo se re-ejecuta (y recaptura una versión fresca de
  // runGeneration) cuando cambian userId/hasEnoughData, así que si el usuario cambia el objetivo
  // o llegan nuevos registros entremedio, una closure vieja de runGeneration podría disparar la
  // auto-generación con datos desactualizados. Leer todo esto de un ref (actualizado en cada
  // render) evita ese problema sin importar qué tan vieja sea la closure que la invoque — mismo
  // criterio que panelDistanciaRef en GymScheduleGrid.tsx.
  const genInputsRef = useRef({ registros, currentWeightKg, weightHistory, objetivo });
  useEffect(() => {
    genInputsRef.current = { registros, currentWeightKg, weightHistory, objetivo };
  }, [registros, currentWeightKg, weightHistory, objetivo]);

  const runGeneration = async (silent = false) => {
    if (!silent) uiSounds.click();
    setStatus("loading");
    setErrorMsg("");
    try {
      const { registros: curRegistros, currentWeightKg: curWeight, weightHistory: curWeightHistory, objetivo: curObjetivo } = genInputsRef.current;
      const summary = buildWorkoutSummary(curRegistros, curWeight, curWeightHistory, curObjetivo);
      const { text } = await GeminiService.sendChatMessage(
        `Acá está el resumen de mi historial de entrenamiento y peso. Analizalo y respondé con el JSON pedido.\n\n${summary}`,
        [],
        { systemInstruction: SYSTEM_INSTRUCTION }
      );
      const parsed = parseAIResponse(text);
      const now = Date.now();
      setResult(parsed);
      setGeneratedAt(now);
      setStatus("done");
      if (!silent) uiSounds.success();
      if (userId) {
        await saveGymAIAnalysis(userId, {
          result: parsed,
          generatedAt: now,
          generatedWeekKey: getISOWeekKey(new Date()),
          objetivo: curObjetivo,
        });
      }
      if (silent) showToast?.("Generamos tu resumen semanal de entrenamiento con IA.", "info");
    } catch (err: any) {
      console.error("Error generando análisis IA de progreso:", err);
      setStatus("error");
      setErrorMsg(err?.message || "No se pudo generar el análisis. Probá de nuevo en un momento.");
      if (!silent) uiSounds.error();
    }
  };

  // Carga el último análisis guardado (si hay) apenas se monta el panel, para que sobreviva
  // navegar a otra pestaña y volver, o recargar la página. Aprovecha la misma suscripción para
  // la auto-generación semanal: los domingos, si todavía no se generó un análisis esta semana ISO
  // (generatedWeekKey), lo arma solo (sin que el usuario tenga que tocar nada) — para tener un
  // resumen semanal esperando.
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeGymAIAnalysis(userId, (stored) => {
      if (stored) {
        setResult(stored.result as AIAnalysisResult);
        setGeneratedAt(stored.generatedAt);
        setObjetivo(stored.objetivo || "mantener");
        setStatus("done");
      }

      if (autoRanRef.current || !hasEnoughData) return;
      const today = new Date();
      if (today.getDay() !== 0) return; // domingo
      autoRanRef.current = true;
      if (stored?.generatedWeekKey !== getISOWeekKey(today)) runGeneration(true);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hasEnoughData]);

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

  // Slider de "Progreso por Ejercicio": con muchos ejercicios analizados, muestra de a
  // EXERCISE_PAGE_SIZE y va rotando solo (en pausa con el mouse encima), mismo patrón que la
  // miniatura de Notas Rápidas de Inicio.
  const exerciseList = result?.progresoPorEjercicio || [];
  const pageCount = Math.max(1, Math.ceil(exerciseList.length / EXERCISE_PAGE_SIZE));
  const [exercisePage, setExercisePage] = useState(0);
  const [isHoveringExercises, setIsHoveringExercises] = useState(false);
  useEffect(() => {
    if (exercisePage >= pageCount) setExercisePage(0);
  }, [pageCount, exercisePage]);
  useEffect(() => {
    if (pageCount <= 1 || isHoveringExercises) return;
    const id = setInterval(() => setExercisePage((p) => (p + 1) % pageCount), EXERCISE_AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [pageCount, isHoveringExercises]);
  const visibleExercises = exerciseList.slice(exercisePage * EXERCISE_PAGE_SIZE, exercisePage * EXERCISE_PAGE_SIZE + EXERCISE_PAGE_SIZE);

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
            onClick={() => runGeneration(false)}
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

      {/* Objetivo de peso — se guarda junto con el análisis, lo usa la IA para la comparación
          mensual de peso corporal. */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">Tu objetivo:</span>
        <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 w-fit">
          {(Object.keys(OBJETIVO_LABELS) as Objetivo[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setObjetivo(key);
                uiSounds.toggle();
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                objetivo === key ? "bg-primary text-white shadow-xs" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {OBJETIVO_LABELS[key]}
            </button>
          ))}
        </div>
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
            {generatedAt && (
              <p className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                <Clock className="w-3 h-3" /> Generado: {formatGeneratedAt(generatedAt)} · se guarda solo y se actualiza cada domingo
              </p>
            )}

            {/* Sub-bloque: Resumen General */}
            <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
              <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary mb-1.5">
                <HeartPulse className="w-3.5 h-3.5" /> Resumen General
              </p>
              <p className="text-sm leading-relaxed">{result.resumenGeneral}</p>
            </div>

            {/* Sub-bloque: Progreso Mensual (peso + consistencia) */}
            {result.progresoMensual && (
              <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary">
                    <Scale className="w-3.5 h-3.5" /> Progreso Mensual
                  </p>
                  {result.progresoMensual.huboProgreso != null && (
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        result.progresoMensual.huboProgreso ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {result.progresoMensual.huboProgreso ? "Con progreso" : "Sin progreso claro"}
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{result.progresoMensual.comentario}</p>
                {result.progresoMensual.pesoEstimadoCambioKg != null && (
                  <p className="text-xs font-bold text-primary mt-1.5">
                    Estimación: deberías {result.progresoMensual.pesoEstimadoCambioKg < 0 ? "haber bajado" : "haber subido"} ~
                    {Math.abs(result.progresoMensual.pesoEstimadoCambioKg)}kg este último mes según tu objetivo.
                  </p>
                )}
              </div>
            )}

            {/* Sub-bloque: Progreso por Ejercicio (slider) */}
            {exerciseList.length > 0 && (
              <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary mb-3">
                  <TrendingUp className="w-3.5 h-3.5" /> Progreso por Ejercicio
                </p>
                <div onMouseEnter={() => setIsHoveringExercises(true)} onMouseLeave={() => setIsHoveringExercises(false)}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={exercisePage}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="grid sm:grid-cols-2 gap-2.5"
                    >
                      {visibleExercises.map((p, i) => {
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
                    </motion.div>
                  </AnimatePresence>

                  {pageCount > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {Array.from({ length: pageCount }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setExercisePage(i)}
                          title={`Página ${i + 1} de ${pageCount}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            i === exercisePage ? "w-5 bg-primary" : "w-1.5 bg-slate-300 dark:bg-zinc-700 hover:bg-primary/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
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
