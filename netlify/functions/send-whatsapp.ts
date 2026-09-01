import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    let body: { phone?: string; apiKey?: string; message?: string };
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
    }

    const { phone, apiKey, message } = body;
    if (!phone || !apiKey || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Faltan datos: teléfono, apiKey o mensaje" }),
      };
    }

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
      phone
    )}&apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(message)}`;

    const res = await fetch(url, { method: "GET" });
    const responseText = await res.text();

    if (!res.ok) {
      return { statusCode: 500, body: JSON.stringify({ success: false, error: responseText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, response: responseText }) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Error inesperado" }) };
  }
};
