import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import JSZip from "jszip";

// Gemini NO acepta Word/Excel/PowerPoint como `inlineData` — probarlo como "text/plain" tira
// contenido ilegible (son en realidad archivos ZIP comprimidos, no texto plano), y no están en la
// lista de mime types de documento que la API soporta (solo PDF y formatos realmente de texto).
// La única forma de usarlos acá es extraer el texto del documento del lado del cliente ANTES de
// mandarlo — así la IA siempre recibe texto plano real, sin importar el formato original.

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const LEGACY_XLS_MIME = "application/vnd.ms-excel";
const LEGACY_DOC_MIME = "application/msword";
const LEGACY_PPT_MIME = "application/vnd.ms-powerpoint";

export const OFFICE_EXTRACTABLE_MIME_TYPES = [DOCX_MIME, XLSX_MIME, PPTX_MIME, LEGACY_XLS_MIME];

export function needsTextExtraction(mimeType: string): boolean {
  return OFFICE_EXTRACTABLE_MIME_TYPES.includes(mimeType);
}

// .doc/.ppt viejos (formato binario OLE, previo a 2007) no son un ZIP de XML como sus versiones
// modernas — ni mammoth ni jszip los pueden leer. Se detectan aparte solo para dar un mensaje de
// error claro en vez de uno genérico de "archivo corrupto".
export function isUnsupportedLegacyOfficeFormat(mimeType: string): boolean {
  return mimeType === LEGACY_DOC_MIME || mimeType === LEGACY_PPT_MIME;
}

// Tope generoso pero acotado: un documento de Office exportado a texto plano puede pesar bastante
// más que el .pdf/.docx original (sin compresión ni formato) — sin este corte, un Excel enorme
// podría romper el límite de tamaño combinado de los archivos de un examen sin que se note hasta
// mandar el request a Gemini.
const MAX_EXTRACTED_TEXT_CHARS = 120_000;

function truncateExtracted(text: string): string {
  if (text.length <= MAX_EXTRACTED_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[...contenido truncado por longitud...]`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Inverso de la descarga: vuelve a codificar texto (UTF-8) como base64 para mandarlo como
// `inlineData` de tipo "text/plain" — en chunks, para no reventar el límite de argumentos de
// `String.fromCharCode` con documentos largos.
export function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// Un .pptx es un ZIP con un XML por diapositiva (ppt/slides/slideN.xml); cada corrida de texto
// vive en una etiqueta <a:t>. No hace falta un parser XML completo para esto — alcanza con juntar
// las <a:t> de cada <a:p> (párrafo) en una línea, y separar diapositivas entre sí.
async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideEntries = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .map((name) => ({ name, n: parseInt(name.match(/slide(\d+)\.xml$/)?.[1] || "0", 10) }))
    .sort((a, b) => a.n - b.n);

  const slides: string[] = [];
  for (const entry of slideEntries) {
    const xml = await zip.files[entry.name].async("text");
    const paragraphs = xml
      .split(/<a:p>/)
      .slice(1)
      .map((p) =>
        Array.from(p.matchAll(/<a:t>([^<]*)<\/a:t>/g))
          .map((m) => decodeXmlEntities(m[1]))
          .join(""),
      )
      .filter((line) => line.trim().length > 0);
    if (paragraphs.length > 0) slides.push(`--- Diapositiva ${entry.n} ---\n${paragraphs.join("\n")}`);
  }
  return slides.join("\n\n");
}

function extractXlsxText(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets = workbook.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    return `--- Hoja "${name}" ---\n${csv}`;
  });
  return sheets.join("\n\n");
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

// Extrae el texto legible de un Word/Excel/PowerPoint (base64) para poder mandárselo a Gemini
// como texto plano — tira un error con mensaje amigable si el formato no es soportado o el
// archivo está corrupto/vacío.
export async function extractOfficeText(base64: string, mimeType: string, fileName: string): Promise<string> {
  if (isUnsupportedLegacyOfficeFormat(mimeType)) {
    throw new Error(
      `"${fileName}" es un formato de Office antiguo (.doc/.ppt previo a 2007) que no se puede leer — guardalo como .docx/.pptx, o como PDF, y probá de nuevo.`,
    );
  }
  const buffer = base64ToArrayBuffer(base64);
  let text = "";
  try {
    if (mimeType === DOCX_MIME) {
      text = await extractDocxText(buffer);
    } else if (mimeType === XLSX_MIME || mimeType === LEGACY_XLS_MIME) {
      text = extractXlsxText(buffer);
    } else if (mimeType === PPTX_MIME) {
      text = await extractPptxText(buffer);
    } else {
      throw new Error(`Formato de archivo no soportado para "${fileName}".`);
    }
  } catch (err: any) {
    throw new Error(`No se pudo leer el contenido de "${fileName}": ${err?.message || "archivo dañado o con un formato inesperado."}`);
  }
  if (!text || !text.trim()) {
    throw new Error(`"${fileName}" no tiene texto legible (¿está vacío o son solo imágenes escaneadas?).`);
  }
  return truncateExtracted(text.trim());
}
