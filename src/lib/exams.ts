import { GeminiService } from "./gemini";
import { downloadDriveFileAsBase64 } from "./studyPlanTree";
import { needsTextExtraction, extractOfficeText, textToBase64 } from "./officeTextExtract";
import { Exam, ExamAnswer, ExamDifficulty, ExamInstancia, ExamMultipleChoiceOption, ExamQuestion, ExamQuestionGrade, ExamResult } from "../types";

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

export function newId(prefix: string): string {
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

// Carpeta real donde vive un archivo puntual de Drive — "Ver en el material" antes navegaba a la
// carpeta DESDE LA QUE SE CREÓ EL EXAMEN, no a la carpeta real del archivo citado (si se había
// agregado con "Buscar en Facultad" desde una subcarpeta distinta, o el examen es de una carpeta
// raíz con el archivo real varios niveles más abajo, nunca lo encontraba ahí y solo se veía la
// carpeta sin nada seleccionado). Se resuelve antes de navegar para abrir siempre la carpeta que
// de verdad lo contiene.
export async function resolveFileParentFolder(
  fileId: string,
  accessToken: string,
): Promise<{ folderId: string; folderName: string } | null> {
  const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!fileRes.ok) return null;
  const fileData = await fileRes.json();
  const parentId: string | undefined = (fileData.parents || [])[0];
  if (!parentId) return null;
  const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files/${parentId}?fields=name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!folderRes.ok) return null;
  const folderData = await folderRes.json();
  return { folderId: parentId, folderName: folderData.name || "" };
}

// Descarga un archivo de Drive y lo deja listo para mandar a Gemini — si es un Word/Excel/
// PowerPoint, lo convierte a texto plano del lado del cliente primero (Gemini no sabe leer esos
// formatos como `inlineData`, ver `officeTextExtract.ts`); cualquier otro formato (PDF, imagen,
// video) se manda tal cual, como hasta ahora.
export async function prepareFilePart(
  fileId: string,
  mimeType: string,
  fileName: string,
  accessToken: string,
): Promise<{ fileId: string; mimeType: string; data: string; fileName: string }> {
  const data = await downloadDriveFileAsBase64(fileId, accessToken);
  if (!needsTextExtraction(mimeType)) {
    return { fileId, mimeType, data, fileName };
  }
  const text = await extractOfficeText(data, mimeType, fileName);
  return { fileId, mimeType: "text/plain", data: textToBase64(text), fileName };
}

// Prepara VARIOS archivos a la vez, pero sin que uno solo roto (borrado de Drive, movido fuera de
// alcance, etc.) tire abajo TODO el examen — antes un único 404 cortaba la generación/corrección
// entera con `Promise.all`. Si falla alguno, se sigue con los que sí se pudieron leer; solo se
// tira error si TODOS fallaron (ahí no queda nada de donde generar/corregir).
export async function prepareFileParts(
  files: { fileId: string; mimeType: string; fileName: string }[],
  accessToken: string,
): Promise<{
  parts: { fileId: string; mimeType: string; data: string; fileName: string }[];
  failed: { fileId: string; fileName: string; error: string }[];
}> {
  const settled = await Promise.allSettled(files.map((f) => prepareFilePart(f.fileId, f.mimeType, f.fileName, accessToken)));
  const parts: { fileId: string; mimeType: string; data: string; fileName: string }[] = [];
  const failed: { fileId: string; fileName: string; error: string }[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") parts.push(result.value);
    else failed.push({ fileId: files[i].fileId, fileName: files[i].fileName, error: result.reason?.message || "No se pudo leer el archivo." });
  });
  if (parts.length === 0) {
    const detail = failed.map((f) => `"${f.fileName}": ${f.error}`).join(" · ");
    throw new Error(`No se pudo leer ninguno de los archivos de referencia. ${detail}`);
  }
  return { parts, failed };
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
export function assignPoints(difficulties: ExamDifficulty[]): number[] {
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

// Fisher-Yates — para que las preguntas de opción múltiple y desarrollo no salgan agrupadas por
// tipo (primero todas las MC, después todas las de desarrollo) sino intercaladas al azar.
export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

  return shuffle(raw.map((q, i) => {
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
  }));
}

interface GradeResultRaw {
  questionId?: string;
  pointsEarned?: number;
  feedback?: string;
  expectedAnswer?: string;
  sourceQuote?: string;
  sourceFileIndex?: number;
}

function buildGradingPrompt(
  essayItems: { id: string; prompt: string; maxPoints: number; answer: string }[],
  mcSummary: { correct: boolean }[],
  sourceFileNames: string[],
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
  const filesBlock =
    sourceFileNames.length > 0
      ? `\n\nArchivos de referencia adjuntos, en este orden exacto (usá su número, empezando en 0, para "sourceFileIndex"): ${sourceFileNames
          .map((n, i) => `${i}) ${n}`)
          .join(", ")}.`
      : "";
  return `Sos un profesor universitario corrigiendo las respuestas de desarrollo de un examen de práctica, usando el material adjunto como referencia del contenido correcto.

Para cada pregunta de desarrollo, analizá la respuesta del alumno y asignale un puntaje de 0 al máximo indicado, proporcional a qué tan completa/correcta está — una respuesta parcialmente correcta o incompleta merece puntaje parcial, no todo o nada. Si no respondió nada, 0 puntos.

Además, para CADA pregunta de desarrollo (la haya respondido el alumno o no) incluí:
- "expectedAnswer": una respuesta modelo completa y correcta a esa pregunta, basada en el material adjunto — se le muestra al alumno como referencia, en especial cuando no respondió nada.
- "sourceQuote": una cita TEXTUAL (1 a 3 oraciones), copiada palabra por palabra tal como aparece en el material de referencia — sin resumir, parafrasear ni traducir — que respalde esa respuesta modelo. Tiene que poder encontrarse buscando ese texto exacto dentro del documento. Si no estás seguro de poder citarla de forma exactamente literal, dejala como cadena vacía en vez de aproximar.
- "sourceFileIndex": el número de CUÁL de los archivos de referencia (de la lista de abajo) contiene esa cita.

${essayBlock}${mcBlock}${filesBlock}

Formato de salida (JSON puro, sin texto extra, sin bloques de código markdown):
{
  "grades": [
    { "questionId": "el id exacto entre corchetes de arriba", "pointsEarned": número, "feedback": "1-2 oraciones explicando qué estuvo bien/mal o qué faltó", "expectedAnswer": "...", "sourceQuote": "...", "sourceFileIndex": 0 }
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
  files: { mimeType: string; data: string; fileName?: string }[],
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
      const sourceFileNames = files.map((f, i) => f.fileName || `Archivo ${i + 1}`);
      const { text } = await withRetry(() =>
        GeminiService.sendChatMessage(buildGradingPrompt(essayItems, mcSummary, sourceFileNames), [], {
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
      const sourceQuote = g?.sourceQuote?.trim() || undefined;
      const validFileIndex =
        sourceQuote && typeof g?.sourceFileIndex === "number" && g.sourceFileIndex >= 0 && g.sourceFileIndex < files.length
          ? g.sourceFileIndex
          : undefined;
      return {
        questionId: item.id,
        pointsEarned,
        pointsPossible: item.maxPoints,
        feedback: g?.feedback || "No se pudo evaluar esta respuesta.",
        expectedAnswer: g?.expectedAnswer?.trim() || undefined,
        sourceQuote,
        sourceFileIndex: validFileIndex,
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

// Arma un examen nuevo juntando las preguntas de 2 o más exámenes ya existentes ("Combinar
// exámenes") — no hace ninguna llamada a Gemini, solo reorganiza preguntas que ya se generaron
// antes. Como cada examen por separado ya suma 100 puntos, simplemente concatenarlos sumaría
// 100 × cantidad de exámenes — se vuelven a repartir los puntos entre TODAS las preguntas juntas
// (mismo criterio ponderado por dificultad de siempre) y se mezclan de nuevo.
export function combineExams(exams: Exam[], name: string, instancia?: ExamInstancia): Exam {
  if (exams.length < 2) throw new Error("Elegí al menos 2 exámenes para combinar.");

  const allQuestions = exams.flatMap((e) => e.questions);
  if (allQuestions.length === 0) throw new Error("Los exámenes elegidos no tienen preguntas.");
  const points = assignPoints(allQuestions.map((q) => q.difficulty));
  const questions = shuffle(allQuestions.map((q, i) => ({ ...q, points: points[i] })));

  const sourceFilesMap = new Map<string, { fileId: string; fileName: string; mimeType: string }>();
  exams.forEach((e) => e.sourceFiles.forEach((f) => {
    if (!sourceFilesMap.has(f.fileId)) sourceFilesMap.set(f.fileId, f);
  }));

  const now = new Date().toISOString();
  const first = exams[0];
  return {
    id: newId("exam"),
    folderId: first.folderId,
    folderName: first.folderName,
    name,
    instancia,
    sourceFiles: Array.from(sourceFilesMap.values()),
    questions,
    status: "generated",
    createdAt: now,
    updatedAt: now,
    combinedFrom: exams.map((e) => e.name),
  };
}

export { downloadDriveFileAsBase64 };
