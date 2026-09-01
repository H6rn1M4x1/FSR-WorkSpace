import type { Handler } from "@netlify/functions";

interface SyncEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  location?: string;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const token = event.headers.authorization || event.headers.Authorization;
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "Falta el token de autorización de Google" }) };
    }

    let body: { events?: SyncEvent[] };
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "JSON inválido" }) };
    }

    const events = body.events;
    if (!events || !Array.isArray(events) || events.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ success: true, syncedCount: 0, eventIds: {} }) };
    }

    let minDate = events[0].date;
    let maxDate = events[0].date;
    for (const ev of events) {
      if (ev.date < minDate) minDate = ev.date;
      if (ev.date > maxDate) maxDate = ev.date;
    }

    const listRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${minDate}T00:00:00Z&timeMax=${maxDate}T23:59:59Z&maxResults=250`,
      { method: "GET", headers: { Authorization: token } }
    );

    let existingEvents: any[] = [];
    if (listRes.ok) {
      const listData = await listRes.json();
      existingEvents = listData.items || [];
    }

    let syncedCount = 0;
    const errors: string[] = [];
    const eventIds: Record<string, string> = {}; // our internal id -> Google Calendar event id

    for (const ev of events) {
      const signature = `[ID: LW-${ev.id}]`;
      const existing = existingEvents.find(
        (item: any) => item.description && item.description.includes(signature)
      );

      if (existing) {
        eventIds[ev.id] = existing.id;
        continue; // already synced, skip re-creating
      }

      const cleanTime = ev.time ? ev.time.trim().replace(/\s*hs/i, "") : "";
      const hasTime = /^(\d{1,2}):(\d{2})$/.test(cleanTime);
      const pad = (n: number) => String(n).padStart(2, "0");

      const eventStart = hasTime
        ? { dateTime: `${ev.date}T${cleanTime}:00`, timeZone: "America/Argentina/Buenos_Aires" }
        : { date: ev.date };

      const eventEnd = hasTime
        ? {
            dateTime: (() => {
              const [h, m] = cleanTime.split(":");
              let hour = parseInt(h) + 1;
              const minute = parseInt(m);
              let nextDateStr = ev.date;
              if (hour >= 24) {
                hour -= 24;
                const dateObj = new Date(ev.date + "T00:00:00");
                dateObj.setDate(dateObj.getDate() + 1);
                nextDateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
              }
              return `${nextDateStr}T${pad(hour)}:${pad(minute)}:00`;
            })(),
            timeZone: "America/Argentina/Buenos_Aires",
          }
        : {
            date: (() => {
              const dateObj = new Date(ev.date + "T00:00:00");
              dateObj.setDate(dateObj.getDate() + 1);
              return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
            })(),
          };

      const description = `${ev.description || ""}\n\n${signature}`;

      const insertBody: any = {
        summary: ev.title,
        description,
        start: eventStart,
        end: eventEnd,
      };
      if (ev.location) insertBody.location = ev.location;

      const insertRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify(insertBody),
      });

      if (insertRes.ok) {
        const created = await insertRes.json();
        eventIds[ev.id] = created.id;
        syncedCount++;
      } else {
        const errorText = await insertRes.text();
        errors.push(`Error al insertar ${ev.title}: ${errorText}`);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, syncedCount, errors, eventIds }) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Error inesperado" }) };
  }
};
