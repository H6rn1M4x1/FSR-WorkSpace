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

    let body: {
      googleEventId?: string;
      title?: string;
      description?: string;
      location?: string;
      date?: string; // YYYY-MM-DD
      time?: string; // HH:MM
    };
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
    }

    if (!body.googleEventId || !body.date) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta el id del evento o la fecha" }) };
    }

    const cleanTime = body.time ? body.time.trim().replace(/\s*hs/i, "") : "";
    const hasTime = /^(\d{1,2}):(\d{2})$/.test(cleanTime);
    const pad = (n: number) => String(n).padStart(2, "0");

    const start = hasTime
      ? { dateTime: `${body.date}T${cleanTime}:00`, timeZone: "America/Argentina/Buenos_Aires" }
      : { date: body.date };

    const end = hasTime
      ? {
          dateTime: (() => {
            const [h, m] = cleanTime.split(":");
            let hour = parseInt(h) + 1;
            const minute = parseInt(m);
            let nextDateStr = body.date!;
            if (hour >= 24) {
              hour -= 24;
              const dateObj = new Date(body.date + "T00:00:00");
              dateObj.setDate(dateObj.getDate() + 1);
              nextDateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
            }
            return `${nextDateStr}T${pad(hour)}:${pad(minute)}:00`;
          })(),
          timeZone: "America/Argentina/Buenos_Aires",
        }
      : {
          date: (() => {
            const dateObj = new Date(body.date + "T00:00:00");
            dateObj.setDate(dateObj.getDate() + 1);
            return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
          })(),
        };

    const patchBody: any = { start, end };
    if (body.title !== undefined) patchBody.summary = body.title;
    if (body.description !== undefined) patchBody.description = body.description;
    if (body.location !== undefined) patchBody.location = body.location;

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${body.googleEventId}`,
      {
        method: "PATCH",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      }
    );

    if (res.ok) {
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // Event might have been deleted directly in Google Calendar — treat as "not found",
    // caller can decide to re-create it.
    if (res.status === 404 || res.status === 410) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: "not_found" }) };
    }

    const errorText = await res.text();
    return { statusCode: 500, body: JSON.stringify({ success: false, error: errorText }) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Error inesperado" }) };
  }
};
