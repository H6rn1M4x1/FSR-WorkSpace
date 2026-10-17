import type { Handler } from "@netlify/functions";

// Sube un archivo (recibido como data URL base64 desde el cliente) al Google Drive del usuario
// autenticado, usando el endpoint de "multipart upload" de la Drive API v3. El archivo queda en
// la raíz de "Mi Unidad" del dueño del token, con los permisos por defecto (privado, visible solo
// para quien lo subió) — no se lo hace público, porque son documentos personales (facturas,
// comprobantes de pago, etc.).
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const token = event.headers.authorization || event.headers.Authorization;
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "Falta el token de autorización de Google" }) };
    }

    let body: { filename?: string; mimeType?: string; base64Data?: string };
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
    }

    const { filename, mimeType, base64Data } = body;
    if (!filename || !base64Data) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta el nombre de archivo o el contenido." }) };
    }

    // base64Data llega como data URL ("data:<mime>;base64,<...>"); nos quedamos solo con la
    // parte base64 para decodificarla a los bytes crudos del archivo.
    const commaIdx = base64Data.indexOf(",");
    const rawBase64 = commaIdx >= 0 ? base64Data.slice(commaIdx + 1) : base64Data;
    const fileBuffer = Buffer.from(rawBase64, "base64");

    const boundary = `fsr_boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const metadata = { name: filename };

    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`,
      ),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      },
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      return {
        statusCode: 200,
        body: JSON.stringify({ success: false, error: `Error al subir a Google Drive: ${errorText}` }),
      };
    }

    const data = await uploadRes.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, fileId: data.id, webViewLink: data.webViewLink }),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Error inesperado" }) };
  }
};
