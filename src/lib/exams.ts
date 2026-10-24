import { GeminiService } from "./gemini";
import { downloadDriveFileAsBase64 } from "./studyPlanTree";
import { ExamAnswer, ExamDifficulty, ExamMultipleChoiceOption, ExamQuestion, ExamQuestionGrade, ExamResult } from "../types";

// Mismo motivo que el árbol de materias: la función de Netlify es síncrona y corta el request si
// tarda/pesa de más. Acá además puede haber VARIOS archivos en una sola llamada (generación y
// corrección mandan todo el material junto), así que además del tope por archivo hay un tope
// combinado — más laxo, pero no ilimitado.
export const MAX_EXAM_SOURCE_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_EXAM_SOURCE_TOTAL_BYTES = 8 * 1024 * 1024;

// Modelo liviano directo — acá también importa más la latencia (no cortarse en Netlify) que usar
// el modelo "grande".
const EXAM_MODEL = "gemini-3.5-flash-lite";

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(err: any): boolean {
  const raw = String(err?.message || err || "");
  return /UNAVAILABLE|503|overloaded|high demand|Unexpected token|is not valid JSON/i.test(raw);
}

function friendlyExamError(err: any): string {
  const raw = String(err?.message || err || "");
  if (/UNAVAILABLE|503|overloaded|high demand/i.test(raw)) {
    return "El servicio de IA está saturado en este momento. Probá de nuevo en unos segundos.";
  }
  if (/Unexpected token|is not valid JSON|<html/i.test(raw)) {
    return "Tardó demasiado y se cortó. Probá con menos preguntas o menos archivos a la vez.";
  }
  return raw || "No se pudo completar. Probá de nuevo.";
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const MAX_ATTEMPTS = 2;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isTransientError(err)) break;
      await sleep(1500);
    }
  }
  throw lastErr;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Mime type (y tamaño, para chequear el límite ANTES de descargar) real del archivo — los adjuntos
// del árbol y el picker de Facultad solo traen fileId/fileName a mano, así que se resuelve con una
// consulta chica a la API de Drive antes de descargar cada archivo.
export async function resolveFileMeta(
  fileId: string,
  accessToken: string,
): Promise<{ name: string; mimeType: string; sizeBytes: number }> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`No se pudo leer la información del archivo (${res.status}).`);
  const data = await res.json();
  return {
    name: data.name || "",
    mimeType: data.mimeType || "application/octet-stream",
    sizeBytes: data.size ? parseInt(data.size, 10) : 0,
  };
}

interface GeneratedQuestionRaw {
  type?: string;
  prompt?: string;
  difficulty?: string;
  options?: string[];
  correctOptionIndex?: number;
}

function buildGenerationPrompt(multipleChoiceCount: number, essayCount: number): string {
  return `Sos un profesor universitario armando un examen de práctica a partir del/los documento(s) adjunto(s) (apuntes, programa de estudio, material de la materia).

Generá exactamente ${multipleChoiceCount} preguntas de opción múltiple y ${essayCount} preguntas de desarrollo, basadas ÚNICAMENTE en el contenido de los documentos adjuntos — no inventes temas que no estén ahí.

Para cada pregunta asigná una dificultad ("facil", "media" o "dificil") relativa a las demás preguntas de ESTE examen, pensando en cuánto le costaría responderla bien a un estudiante que estudió el material.

Para las preguntas de opción múltiple: exactamente 4 opciones, una sola correcta, las incorrectas tienen que ser creíbles (no absurdas ni obviamente descartables). "correctOptionIndex" es el índice (0 a 3) de la opción correcta dentro de "options".

Para las preguntas de desarrollo: que puedan responderse en un párrafo razonable (no pidas ensayos larguísimos), sobre un concepto, una relación entre conceptos, o una aplicación práctica del material — no pidas simplemente "copiar la definición", pedí que se explique/relacione/aplique algo.

Formato de salida (JSON puro, sin texto extra, sin bloques de código markdown):
{
  "questions": [
    { "type": "multiple_choice", "prompt": "...", "difficulty": "facil"|"media"|"dificil", "options": ["...", "...", "...", "..."], "correctOptionIndex": 0 },
    { "type": "essay", "prompt": "...", "difficulty": "facil"|"media"|"dificil" }
  ]
}

Reglas:
- Devolvé EXACTAMENTE ${multipleChoiceCount} preguntas "multiple_choice" y ${essayCount} preguntas "essay", ni más ni menos.
- Las preguntas de opción múltiple van primero en el array, después las de desarrollo.
- No repitas preguntas ni te vayas de tema.`;
}

const DIFFICULTY_WEIGHT: Record<ExamDifficulty, number> = { facil: 1, media: 2, dificil: 3 };
const VALID_DIFFICULTIES: ExamDifficulty[] = ["facil", "media", "dificil"];

// Reparte 100 puntos entre las preguntas según el peso de su dificultad relativa — una "dificil"
// vale más que una "facil", no todas valen lo mismo por igual (pedido explícito del usuario).
function assignPoints(difficulties: ExamDifficulty[]): number[] {
  const weights = difficulties.map((d) => DIFFICULTY_WEIGHT[d] ?? 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const points = weights.map((w) => Math.round((w / totalWeight) * 100));
  // El redondeo de cada pregunta por separado puede dejar la suma en 99 o 101 — se ajusta la
  // pregunta de mayor peso (la que más pesa en la nota) para que el total cierre en 100 exacto.
  const diff = 100 - points.reduce((a, b) => a + b, 0);
  if (diff !== 0 && points.length > 0) {
    const maxIdx = weights.indexOf(Math.max(...weights));
    points[maxIdx] += diff;
  }
  return points;
}

// Arma las preguntas de un examen nuevo a partir de uno o más archivos de Drive ya descargados
// (base64) — un solo pedido a Gemini, con los dos tipos de pregunta mezclados en la respuesta.
export async function generateExamQuestions(
  files: { mimeType: string; data: string }[],
  multipleChoiceCount: number,
  essayCount: number,
): Promise<ExamQuestion[]> {
  let parsed: { questions: GeneratedQuestionRaw[] };
  try {
    const { text } = await withRetry(() =>
      GeminiService.sendChatMessage(buildGenerationPrompt(multipleChoiceCount, essayCount), [], {
        model: EXAM_MODEL,
        files,
      }),
    );
    parsed = JSON.parse(stripCodeFences(text));
  } catch (err) {
    throw new Error(friendlyExamError(err));
  }
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("La IA no generó ninguna pregunta. Probá con otro archivo.");
  }
  const raw = parsed.questions.filter((q) => q && typeof q.prompt === "string" && q.prompt.trim());
  if (raw.length === 0) throw new Error("La IA no generó ninguna pregunta válida. Probá de nuevo.");

  const difficulties: ExamDifficulty[] = raw.map((q) =>
    VALID_DIFFICULTIES.includes(q.difficulty as ExamDifficulty) ? (q.difficulty as ExamDifficulty) : "media",
  );
  const points = assignPoints(difficulties);

  return raw.map((q, i) => {
    const id = newId("q");
    const isMultipleChoice = q.type === "multiple_choice" && Array.isArray(q.options) && q.options.length >= 2;
    if (isMultipleChoice) {
      const options: ExamMultipleChoiceOption[] = q.options!.map((text, oi) => ({ id: `${id}_o${oi}`, text: String(text) }));
      const correctIdx = typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0;
      const safeIdx = Math.min(Math.max(correctIdx, 0), options.length - 1);
      return {
        id,
        type: "multiple_choice",
        prompt: q.prompt!.trim(),
        difficulty: difficulties[i],
        points: points[i],
        options,
        correctOptionId: options[safeIdx].id,
      };
    }
    return {
      id,
      type: "essay",
      prompt: q.prompt!.trim(),
      difficulty: difficulties[i],
      points: points[i],
    };
  });
}

interface GradeResultRaw {
  questionId?: string;
  pointsEarned?: number;
  feedback?: string;
}

function buildGradingPrompt(
  essayItems: { id: string; prompt: string; maxPoints: number; answer: string }[],
  mcSummary: { correct: boolean }[],
): string {
  const essayBlock = essayItems
    .map(
      (item, i) =>
        `${i + 1}. [id: ${item.id}] (vale hasta ${item.maxPoints} puntos)\nPregunta: ${item.prompt}\nRespuesta del alumno: ${
          item.answer.trim() || "(sin responder)"
        }`,
    )
    .join("\n\n");
  const mcBlock = mcSummary.length
    ? `\n\nAdemás, el alumno respondió ${mcSummary.length} preguntas de opción múltiple (ya corregidas automáticamente, no hace falta que las reevalúes, son solo contexto para tu resumen general): ${
        mcSummary.filter((m) => m.correct).length
      } correctas de ${mcSummary.length}.`
    : "";
  return `Sos un profesor universitario corrigiendo las respuestas de desarrollo de un examen de práctica, usando el material adjunto como referencia del contenido correcto.

Para cada pregunta de desarrollo, analizá la respuesta del alumno y asignale un puntaje de 0 al máximo indicado, proporcional a qué tan completa/correcta está — una respuesta parcialmente correcta o incompleta merece puntaje parcial, no todo o nada. Si no respondió nada, 0 puntos.

${essayBlock}${mcBlock}

Formato de salida (JSON puro, sin texto extra, sin bloques de código markdown):
{
  "grades": [
    { "questionId": "el id exacto entre corchetes de arriba", "pointsEarned": número, "feedback": "1-2 oraciones explicando qué estuvo bien/mal o qué faltó" }
  ],
  "summary": "2-4 oraciones con un comentario general sobre el desempeño en TODO el examen (considerá también el resultado de multiple choice si te lo compartí arriba), mencionando fortalezas y qué repasar."
}

Reglas:
- Un "grade" por cada pregunta de desarrollo listada arriba, con el "questionId" exacto.
- "pointsEarned" nunca puede superar el máximo indicado para esa pregunta, ni ser negativo.`;
}

// Corrige un examen ya respondido: multiple choice se corrige acá mismo (comparación exacta,
// sin IA, es determinístico) y las de desarrollo se mandan en un solo pedido a Gemini (no uno por
// pregunta, para no multiplicar la latencia/costo). Si el examen es 100% multiple choice, no hace
// ninguna llamada a la IA.
export async function gradeExam(
  files: { mimeType: string; data: string }[],
  questions: ExamQuestion[],
  answers: ExamAnswer[],
): Promise<ExamResult> {
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a.value]));
  const mcGrades: ExamQuestionGrade[] = [];
  const mcSummary: { correct: boolean }[] = [];
  const essayItems: { id: string; prompt: string; maxPoints: number; answer: string }[] = [];

  for (const q of questions) {
    if (q.type === "multiple_choice") {
      const chosen = answerByQuestion.get(q.id);
      const correct = !!chosen && chosen === q.correctOptionId;
      mcGrades.push({
        questionId: q.id,
        pointsEarned: correct ? q.points : 0,
        pointsPossible: q.points,
        feedback: correct
          ? "Respuesta correcta."
          : `Respuesta incorrecta. La opción correcta era: "${q.options?.find((o) => o.id === q.correctOptionId)?.text || ""}".`,
      });
      mcSummary.push({ correct });
    } else {
      essayItems.push({ id: q.id, prompt: q.prompt, maxPoints: q.points, answer: answerByQuestion.get(q.id) || "" });
    }
  }

  let essayGrades: ExamQuestionGrade[] = [];
  let summary = "";
  if (essayItems.length > 0) {
    let parsed: { grades?: GradeResultRaw[]; summary?: string };
    try {
      const { text } = await withRetry(() =>
        GeminiService.sendChatMessage(buildGradingPrompt(essayItems, mcSummary), [], {
          model: EXAM_MODEL,
          files,
        }),
      );
      parsed = JSON.parse(stripCodeFences(text));
    } catch (err) {
      throw new Error(friendlyExamError(err));
    }
    const gradesById = new Map((parsed.grades || []).filter((g) => g?.questionId).map((g) => [g.questionId as string, g]));
    essayGrades = essayItems.map((item) => {
      const g = gradesById.get(item.id);
      const pointsEarned = g && typeof g.pointsEarned === "number" ? Math.max(0, Math.min(item.maxPoints, Math.round(g.pointsEarned))) : 0;
      return {
        questionId: item.id,
        pointsEarned,
        pointsPossible: item.maxPoints,
        feedback: g?.feedback || "No se pudo evaluar esta respuesta.",
      };
    });
    summary = parsed.summary || "";
  }

  const orderById = new Map(questions.map((q, i) => [q.id, i]));
  const allGrades = [...mcGrades, ...essayGrades].sort(
    (a, b) => (orderById.get(a.questionId) ?? 0) - (orderById.get(b.questionId) ?? 0),
  );
  const score = Math.max(0, Math.min(100, Math.round(allGrades.reduce((sum, g) => sum + g.pointsEarned, 0))));

  return {
    score,
    summary: summary || `Sacaste ${score}/100.`,
    questionGrades: allGrades,
    gradedAt: new Date().toISOString(),
  };
}

export { downloadDriveFileAsBase64 };
