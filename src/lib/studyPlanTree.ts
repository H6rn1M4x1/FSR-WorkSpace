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

const EXTRACTION_PROMPT = `Sos un asistente que lee programas/planes de estudio universitarios en PDF y devuelve su estructura jerárquica en JSON estricto, sin texto extra, sin bloques de código markdown, sin explicaciones.

El documento puede ser de dos tipos muy distintos — identificá cuál es ANTES de extraer nada:

A) PLAN DE UNA CARRERA COMPLETA: lista varias materias/asignaturas distintas (de distintos años o cuatrimestres). En este caso extraé cada materia como nodo hoja ("materia"), agrupadas por año/ciclo/módulo si el documento los muestra como encabezados propios (nodos "group").

B) PROGRAMA DE UNA SOLA MATERIA: el documento trata sobre UNA única asignatura puntual (tiene un nombre de materia en la carátula/encabezado) y tiene una sección de contenidos organizada en "unidades temáticas", "unidades", "ejes" o "módulos" numerados, cada uno con sus propios temas/subtemas numerados (ej. "UNIDAD 1: ... / 1.1 ... / 1.2 ...", o varios niveles como "8.1 ... / 8.1.1 ... / 8.1.2 ..."). Este es el caso más común. Acá NO hay varias materias para extraer — extraé la estructura INTERNA de esa única materia: cada unidad temática es un nodo "group", y cada tema/subtema dentro de ella es un nodo hijo (con "group" si a su vez tiene sus propios subtemas, o "materia" si es un nodo hoja sin hijos). Respetá fielmente los niveles de anidamiento que el documento realmente tenga (una unidad puede tener sub-puntos, y esos sub-puntos sus propios sub-sub-puntos) — no los aplanes a un solo nivel.

En ambos casos, extraé TODOS los nodos de contenido que aparezcan, respetando el orden y la jerarquía exacta en que aparecen (no reordenes ni inventes agrupaciones que el documento no tenga).

IMPORTANTE — para un programa de UNA sola materia (caso B), ignorá por completo estas secciones, NO las conviertas en nodos del árbol:
- Listas de correlatividades o materias para las que ésta es base/requisito ("constituye la base para...", "es indispensable haber cursado...", materias correlativas).
- Equipo de cátedra, docentes, horarios de clase o de consulta.
- Bibliografía, cronograma de evaluaciones, metodología de enseñanza-aprendizaje, sistema de promoción y evaluación, objetivos/competencias/fundamentos generales de la materia.
- Cualquier sección administrativa que no sea el contenido temático en sí (la sección de "organización y secuencia de los contenidos" o equivalente).

Formato de salida (JSON puro, nada más):
{
  "nodes": [
    { "id": "string único", "label": "texto exacto tal cual aparece en el documento", "parentId": "id de otro nodo del array, o null", "kind": "group" | "materia" }
  ]
}

Reglas:
- "label": el texto tal cual figura (nombre de materia, de unidad temática, o de tema/subtema), sin inventar ni resumir.
- No inventes nodos que no estén en el documento.
- No generes nodos duplicados.
- Los "id" deben ser únicos dentro del array (usá un slug corto, por ejemplo "g1", "m1", "m2").
- "kind": "group" para cualquier nodo que tenga hijos propios en el árbol (sea una unidad temática, una materia agrupadora, o un sub-punto con sus propios subtemas); "materia" para los nodos hoja, sin hijos. Un nodo puede tener como parentId cualquier otro nodo del array (group o materia) según la jerarquía real del documento — no hay límite de niveles.`;

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
    return "La generación tardó demasiado y se cortó. Probá de nuevo — si el archivo es muy largo, puede necesitar más de un intento.";
  }
  return raw || "No se pudo generar el árbol. Probá de nuevo o con otro archivo.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestStudyPlanNodes(fileBase64: string, mimeType: string): Promise<StudyPlanTreeNode[]> {
  const { text } = await GeminiService.sendChatMessage(EXTRACTION_PROMPT, [], {
    model: EXTRACTION_MODEL,
    files: [{ mimeType, data: fileBase64 }],
  });

  let parsed: { nodes: GeminiTreeNode[] };
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    throw new Error("La IA no devolvió un JSON válido.");
  }
  if (!parsed || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
    throw new Error("No se encontraron materias en ese documento.");
  }

  // Regenera ids propios (secuenciales) preservando el mapeo original -> nuevo, así no importa
  // si la IA repitió algún id o usó un formato raro.
  const idMap = new Map<string, string>();
  parsed.nodes.forEach((n, i) => {
    if (n?.id != null) idMap.set(String(n.id), `n${i}`);
  });

  const cleanNodes: StudyPlanTreeNode[] = parsed.nodes
    .filter((n) => n && typeof n.label === "string" && n.label.trim())
    .map((n, i) => ({
      id: `n${i}`,
      label: n.label.trim(),
      parentId: n.parentId != null && idMap.has(String(n.parentId)) ? idMap.get(String(n.parentId))! : null,
      kind: n.kind === "group" ? "group" : "materia",
    }));

  // Evita que un nodo quede apuntando a sí mismo (podría pasar con un id mal copiado).
  return cleanNodes.map((n) => (n.parentId === n.id ? { ...n, parentId: null } : n));
}

// Pide a Gemini (vía la función ya desplegada /api/gemini/chat, que ya acepta archivos adjuntos)
// que lea el PDF y devuelva la estructura de materias. Un solo reintento ante errores que pintan
// transitorios (modelo saturado, corte por timeout) — cada intento es un POST nuevo, con su propio
// presupuesto de tiempo en Netlify, así que reintentar acá tiene más chance de éxito que un retry
// adentro de la misma invocación de función.
export async function extractStudyPlanTree(
  fileBase64: string,
  mimeType: string,
): Promise<StudyPlanTreeNode[]> {
  const MAX_ATTEMPTS = 2;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await requestStudyPlanNodes(fileBase64, mimeType);
    } catch (err: any) {
      lastErr = err;
      if (attempt === MAX_ATTEMPTS || !isTransientExtractionError(err)) break;
      await sleep(1500);
    }
  }
  throw new Error(friendlyExtractionError(lastErr));
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
