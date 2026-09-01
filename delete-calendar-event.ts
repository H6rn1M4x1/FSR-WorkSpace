import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const token = event.headers.authorization || event.headers.Authorization;
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "Falta el token de autorización de Google" }) };
    }

    let body: { googleEventId?: string };
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
    }

    if (!body.googleEventId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta el id del evento de Google Calendar" }) };
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${body.googleEventId}`,
      { method: "DELETE", headers: { Authorization: token } }
    );

    // Google returns 410 if the event was already deleted — treat that as success too.
    if (res.ok || res.status === 410 || res.status === 404) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    const errorText = await res.text();
    return { statusCode: 500, body: JSON.stringify({ success: false, error: errorText }) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Error inesperado" }) };
  }
};
