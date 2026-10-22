import { GeminiService } from "./gemini";
import { StudyPlanTreeNode } from "../types";

// Las funciones de Netlify (Lambda síncrono) cortan el request en ~6MB de body — el base64 infla
// el archivo original ~33%, así que un PDF de más de ~4MB ya corre riesgo real de fallar antes de
// llegar siquiera a nuestro código (respuesta HTML de error, no JSON). Se chequea del lado del
// cliente ANTES de intentar nada, para avisar al toque en vez de fallar a mitad de camino.
export const MAX_STUDY_PLAN_FILE_BYTES = 4 * 1024 * 1024;

// Descarga un archivo de Drive (binario) y lo devuelve en base64 — en chunks, para no reventar
// el límite de argumentos de String.fromCharCode con PDFs grandes.
export async function downloadDriveFileAsBase64(fileId: string, accessToken: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`No se pudo descargar el archivo de Drive (${res.status}).`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}

// Pedirle a Gemini TODO el árbol de un documento largo (ej. un programa de materia con 20+
// unidades) en una sola respuesta tarda más de lo que tolera una función de Netlify síncrona —
// por más que se reintente, el mismo pedido vuelve a tardar lo mismo y se corta de nuevo
// (respuesta HTML en vez de JSON). La solución no es reintentar más: es pedir MENOS por llamada.
// Por eso la extracción va en dos fases, cada una con una salida chica y rápida:
//   1) "outline": solo el nivel superior (materias, o unidades temáticas si es una sola materia).
//   2) por cada nodo de nivel superior que tenga contenido propio, una llamada aparte que pide
//      SOLO lo que cuelga de ese nodo — en paralelo (con concurrencia acotada), así ningún
//      pedido individual se acerca al límite de tiempo, sin importar cuántas unidades tenga el
//      documento en total.

const OUTLINE_PROMPT = `Sos un asistente que lee programas/planes de estudio universitarios en PDF.

Identificá PRIMERO solamente la estructura de NIVEL SUPERIOR del documento — todavía NO bajes a los detalles internos de cada una.

El documento puede ser de dos tipos muy distintos:
A) PLAN DE UNA CARRERA COMPLETA: el nivel superior son las distintas materias/asignaturas (agrupadas por año/ciclo/módulo si el documento las agrupa así).
B) PROGRAMA DE UNA SOLA MATERIA (el caso más común): el documento trata sobre UNA única asignatura y el nivel superior son sus unidades temáticas/unidades/ejes/módulos — cada una normalmente tiene su propia sección de contenidos numerados (eso se extrae en un paso aparte, ACÁ todavía no).

Devolveme SOLO los nodos de nivel superior, en el orden exacto en que aparecen, sin agrupar ni reordenar por tu cuenta.

IMPORTANTE — ignorá por completo, no son nodos: correlatividades o materias para las que ésta es base/requisito, equipo de cátedra, docentes, horarios, bibliografía, cronograma de evaluaciones, metodología de enseñanza-aprendizaje, sistema de promoción y evaluación, objetivos/competencias/fundamentos generales — cualquier cosa que no sea la lista de materias o de unidades temáticas en sí.

Formato de salida (JSON puro, sin texto extra, sin bloques de código markdown):
{
  "nodes": [
    { "id": "string único", "label": "texto exacto tal cual aparece en el documento", "kind": "group" | "materia" }
  ]
}

Reglas:
- "label": texto exacto, sin inventar ni resumir.
- "kind": "group" si ese nodo de nivel superior tiene contenido interno propio que haya que extraer después (subtemas, unidades numeradas, materias agrupadas debajo); "materia" si es un nodo terminal sin nada más adentro (ej. en un plan de carrera donde las materias se listan sin desglose propio).
- No inventes nodos que no estén en el documento, no los dupliques.`;

function buildDetailPrompt(unitLabel: string): string {
  const escaped = unitLabel.replace(/"/g, '\\"');
  return `Sos un asistente que lee programas/planes de estudio universitarios en PDF.

Ya se identificó que el documento tiene un nodo de nivel superior llamado exactamente: "${escaped}".

Tu única tarea ahora es extraer el contenido interno de ESE nodo — sus temas/subtemas tal cual aparecen en el documento bajo "${escaped}" (por ejemplo, si es una unidad temática, sus contenidos numerados 1.1, 1.2, etc., incluyendo más niveles de anidamiento si el documento los tiene, como 8.1.1 dentro de 8.1 dentro de la unidad). NO extraigas contenido de ninguna otra sección del documento, solo lo que está específicamente bajo "${escaped}".

Formato de salida (JSON puro, sin texto extra, sin bloques de código markdown):
{
  "nodes": [
    { "id": "string único", "label": "texto exacto tal cual aparece en el documento", "parentId": "id de otro nodo de ESTE array, o null si cuelga directo de \\"${escaped}\\"", "kind": "group" | "materia" }
  ]
}

Reglas:
- "label": texto exacto, sin inventar ni resumir.
- "kind": "group" si ese nodo tiene a su vez hijos propios dentro de este mismo array; "materia" si es una hoja.
- No repitas "${escaped}" como un nodo del array, solo lo que cuelga de él.
- No inventes nodos, no los dupliques.
- Si "${escaped}" no tiene contenido interno propio en el documento, devolvé "nodes": [].`;
}

interface GeminiOutlineNode {
  id: string;
  label: string;
  kind: "group" | "materia";
}

interface GeminiTreeNode {
  id: string;
  label: string;
  parentId: string | null;
  kind: "group" | "materia";
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

// Modelo liviano directo: para extracción estructurada no hace falta el modelo "grande", y acá la
// latencia importa — Netlify corta las funciones síncronas que tardan demasiado (respuesta HTML,
// no JSON), así que cuanto más rápido responda, menos chance de toparse con ese corte.
const EXTRACTION_MODEL = "gemini-3.5-flash-lite";

// Picos de demanda ("503 UNAVAILABLE") y cortes por timeout (HTML en vez de JSON) suelen ser
// transitorios — vale la pena un segundo intento antes de darse por vencido.
function isTransientExtractionError(err: any): boolean {
  const raw = String(err?.message || err || "");
  return /UNAVAILABLE|503|overloaded|high demand|Unexpected token|is not valid JSON/i.test(raw);
}

function friendlyExtractionError(err: any): string {
  const raw = String(err?.message || err || "");
  if (/UNAVAILABLE|503|overloaded|high demand/i.test(raw)) {
    return "El servicio de IA está saturado en este momento. Probá de nuevo en unos segundos.";
  }
  if (/Unexpected token|is not valid JSON|<html/i.test(raw)) {
    return "La generación tardó demasiado y se cortó. Probá de nuevo en un momento.";
  }
  return raw || "No se pudo generar el árbol. Probá de nuevo o con otro archivo.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Un reintento ante errores que pintan transitorios — cada intento es un POST nuevo, con su
// propio presupuesto de tiempo fresco en Netlify, así que reintentar acá (en vez de adentro de
// la misma invocación de función) tiene más chance real de éxito.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const MAX_ATTEMPTS = 2;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isTransientExtractionError(err)) break;
      await sleep(1500);
    }
  }
  throw lastErr;
}

// Corre varias tareas async con un límite de concurrencia — suficiente paralelismo para que una
// unidad lenta no demore a las demás, pero acotado para no saturar la API de Gemini de golpe
// (eso dispara justamente los 503 "high demand" que se quieren evitar).
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const DETAIL_CONCURRENCY = 4;

async function requestOutline(fileBase64: string, mimeType: string): Promise<GeminiOutlineNode[]> {
  const { text } = await GeminiService.sendChatMessage(OUTLINE_PROMPT, [], {
    model: EXTRACTION_MODEL,
    files: [{ mimeType, data: fileBase64 }],
  });
  let parsed: { nodes: GeminiOutlineNode[] };
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw new Error("La IA no devolvió un JSON válido.");
  }
  if (!parsed || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
    throw new Error("No se encontraron materias ni unidades en ese documento.");
  }
  return parsed.nodes.filter((n) => n && typeof n.label === "string" && n.label.trim());
}

async function requestUnitDetail(fileBase64: string, mimeType: string, unitLabel: string): Promise<GeminiTreeNode[]> {
  const { text } = await GeminiService.sendChatMessage(buildDetailPrompt(unitLabel), [], {
    model: EXTRACTION_MODEL,
    files: [{ mimeType, data: fileBase64 }],
  });
  let parsed: { nodes: GeminiTreeNode[] };
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw new Error("La IA no devolvió un JSON válido.");
  }
  if (!parsed || !Array.isArray(parsed.nodes)) return [];
  return parsed.nodes.filter((n) => n && typeof n.label === "string" && n.label.trim());
}

// Pide a Gemini (vía la función ya desplegada /api/gemini/chat, que ya acepta archivos adjuntos)
// que lea el PDF y arme el árbol en dos fases (ver comentario arriba). `onProgress` es opcional,
// para que la UI pueda mostrar "procesando unidad X de Y" durante la fase 2.
export async function extractStudyPlanTree(
  fileBase64: string,
  mimeType: string,
  onProgress?: (done: number, total: number) => void,
): Promise<StudyPlanTreeNode[]> {
  let outline: GeminiOutlineNode[];
  try {
    outline = await withRetry(() => requestOutline(fileBase64, mimeType));
  } catch (err) {
    throw new Error(friendlyExtractionError(err));
  }

  const topNodes: StudyPlanTreeNode[] = outline.map((n, i) => ({
    id: `t${i}`,
    label: n.label.trim(),
    parentId: null,
    kind: n.kind === "group" ? "group" : "materia",
  }));

  const groupNodes = topNodes.filter((n) => n.kind === "group");
  let completed = 0;
  onProgress?.(0, groupNodes.length);

  const detailResults = await mapWithConcurrency(groupNodes, DETAIL_CONCURRENCY, async (parent) => {
    try {
      const nodes = await withRetry(() => requestUnitDetail(fileBase64, mimeType, parent.label));
      return nodes;
    } catch {
      // Si el detalle de ESTA unidad puntual falla después de reintentar, se la deja como hoja
      // sin hijos en vez de tirar abajo la generación completa de las demás unidades.
      return [] as GeminiTreeNode[];
    } finally {
      completed++;
      onProgress?.(completed, groupNodes.length);
    }
  });

  const allNodes: StudyPlanTreeNode[] = [...topNodes];
  groupNodes.forEach((parent, gi) => {
    const rawChildren = detailResults[gi];
    // Regenera ids propios (prefijados con el id del padre, así no colisionan entre unidades)
    // preservando el mapeo original -> nuevo, así no importa si la IA repitió algún id.
    const idMap = new Map<string, string>();
    rawChildren.forEach((n, i) => {
      if (n?.id != null) idMap.set(String(n.id), `${parent.id}c${i}`);
    });
    rawChildren.forEach((n, i) => {
      const ownId = `${parent.id}c${i}`;
      const mappedParent =
        n.parentId != null && idMap.has(String(n.parentId)) ? idMap.get(String(n.parentId))! : parent.id;
      allNodes.push({
        id: ownId,
        label: n.label.trim(),
        parentId: mappedParent === ownId ? parent.id : mappedParent,
        kind: n.kind === "group" ? "group" : "materia",
      });
    });
  });

  return allNodes;
}

export interface LaidOutTreeNode extends StudyPlanTreeNode {
  x: number;
  y: number;
}

const X_GAP = 220;
const Y_GAP = 140;

// Layout de árbol simple (sin dependencias extra tipo dagre): cada hoja ocupa una columna propia
// en el orden en que aparece, y cada nodo interno se centra sobre el rango de sus hijos — es el
// algoritmo clásico de "asignar slots a las hojas de izquierda a derecha, promediar hacia arriba".
export function layoutStudyPlanTree(nodes: StudyPlanTreeNode[]): LaidOutTreeNode[] {
  const byParent = new Map<string | null, StudyPlanTreeNode[]>();
  nodes.forEach((n) => {
    const key = n.parentId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(n);
  });

  const depthOf = new Map<string, number>();
  const xOf = new Map<string, number>();
  let nextSlot = 0;

  const assign = (nodeId: string | null, depth: number) => {
    const children = byParent.get(nodeId) || [];
    if (children.length === 0) return;
    children.forEach((child) => {
      depthOf.set(child.id, depth);
      const grandChildren = byParent.get(child.id) || [];
      if (grandChildren.length === 0) {
        xOf.set(child.id, nextSlot++);
      } else {
        assign(child.id, depth + 1);
        const xs = grandChildren.map((gc) => xOf.get(gc.id) ?? 0);
        xOf.set(child.id, (Math.min(...xs) + Math.max(...xs)) / 2);
      }
    });
  };

  assign(null, 0);

  return nodes.map((n) => ({
    ...n,
    x: (xOf.get(n.id) ?? 0) * X_GAP,
    y: (depthOf.get(n.id) ?? 0) * Y_GAP,
  }));
}
