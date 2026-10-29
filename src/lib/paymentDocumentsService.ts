// ---------------------------------------------------------------------------------------------
// Almacenamiento de los dos únicos adjuntos de "Agregar Pago" que van a Supabase Storage:
// Comprobante de Pago y Factura Emitida. El resto de los archivos de la app (Turnos, estudios
// médicos, etc.) sigue usando el flujo existente (Google Drive / base64) — esto es específico
// para estos dos campos de Finanzas, con el mismo bucket-por-feature que ya se usa para los
// adjuntos del chat (ver chatService.ts / migración create_chat_attachments_bucket).
// ---------------------------------------------------------------------------------------------

import { supabase } from "./supabase";
import { compressImageFile } from "./chatService";

const PAYMENT_DOCUMENTS_BUCKET = "payment-documents";
const UPLOAD_TIMEOUT_MS = 25000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} tardó demasiado. Revisá tu conexión a internet.`));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/**
 * Sube el Comprobante de Pago o la Factura Emitida a Supabase Storage y devuelve su URL pública.
 * Si el archivo es una imagen (la mayoría de los casos: una foto del comprobante) se recomprime
 * antes de subir para que pese bastante menos; los PDF se suben tal cual, ya livianos de por sí.
 */
export async function uploadPaymentDocument(folder: string, file: File): Promise<string> {
  const fileToUpload = await compressImageFile(file);
  const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;
  try {
    const { error: uploadError } = await withTimeout(
      supabase.storage.from(PAYMENT_DOCUMENTS_BUCKET).upload(path, fileToUpload, {
        contentType: fileToUpload.type || undefined,
        upsert: false,
      }),
      UPLOAD_TIMEOUT_MS,
      "La subida del archivo"
    );
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(PAYMENT_DOCUMENTS_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("No se pudo obtener el link del archivo subido.");
    return data.publicUrl;
  } catch (error: any) {
    throw new Error(`No se pudo subir el archivo: ${error?.message || "error desconocido"}.`);
  }
}
