// Fetches recent Google Fit sessions (workouts/activities logged in the Google Fit app)
// and converts them into this app's DeporteActividad shape, so they show up automatically
// in "Historial de Sesiones" the next time you open the app.
//
// Requires the Google access token to include the fitness.activity.read scope (already
// requested by the main Google login) — see src/lib/supabase.ts GOOGLE_SCOPES.

interface GoogleFitSession {
  id: string;
  name?: string;
  description?: string;
  startTimeMillis: string;
  endTimeMillis: string;
  activityType?: number;
}

// A small map of the most common Google Fit activity type codes to a friendly Spanish name.
// Fit has ~120 codes total — uncommon ones just fall back to "Actividad Física".
const ACTIVITY_TYPE_NAMES: Record<number, string> = {
  1: "Ciclismo",
  7: "Caminata",
  8: "Correr",
  9: "Trote",
  10: "Senderismo",
  57: "Natación",
  80: "Yoga",
  97: "Musculación / Pesas",
  108: "Fútbol",
  112: "Básquet",
  113: "Tenis",
};

function activityName(session: GoogleFitSession): string {
  if (session.name) return session.name;
  if (session.description) return session.description;
  if (session.activityType !== undefined && ACTIVITY_TYPE_NAMES[session.activityType]) {
    return ACTIVITY_TYPE_NAMES[session.activityType];
  }
  return "Actividad Física (Google Fit)";
}

async function fetchCaloriesForWindow(token: string, startMillis: string, endMillis: string): Promise<number> {
  try {
    const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        aggregateBy: [{ dataTypeName: "com.google.calories.expended" }],
        bucketByTime: { durationMillis: Number(endMillis) - Number(startMillis) || 1 },
        startTimeMillis: startMillis,
        endTimeMillis: endMillis,
      }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    let total = 0;
    for (const bucket of data.bucket || []) {
      for (const ds of bucket.dataset || []) {
        for (const point of ds.point || []) {
          for (const value of point.value || []) {
            if (typeof value.fpVal === "number") total += value.fpVal;
          }
        }
      }
    }
    return Math.round(total);
  } catch (_) {
    return 0;
  }
}

export interface ImportedFitActivity {
  id: string;
  googleFitSessionId: string;
  fechaDesde: string;
  fechaHasta: string;
  informacion: string;
  calorias: number;
  pasos: number;
  distancia: number;
  tiempoMovimiento: string;
}

/**
 * Fetches Google Fit sessions from the last `daysBack` days and returns them converted to
 * this app's activity shape, skipping any session id already present in `existingIds`.
 */
export async function fetchNewGoogleFitSessions(
  token: string,
  existingIds: Set<string>,
  daysBack: number = 14
): Promise<ImportedFitActivity[]> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const url = `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startTime.toISOString()}&endTime=${endTime.toISOString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Google Fit respondió ${res.status}. Puede que necesites volver a iniciar sesión con Google.`);
  }

  const data = await res.json();
  const sessions: GoogleFitSession[] = data.session || [];
  const newOnes: ImportedFitActivity[] = [];

  for (const session of sessions) {
    if (existingIds.has(session.id)) continue; // already imported before

    const startMs = Number(session.startTimeMillis);
    const endMs = Number(session.endTimeMillis);
    const durationMin = Math.max(1, Math.round((endMs - startMs) / 60000));
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;

    const calorias = await fetchCaloriesForWindow(token, session.startTimeMillis, session.endTimeMillis);

    newOnes.push({
      id: `fit-${session.id}`,
      googleFitSessionId: session.id,
      fechaDesde: new Date(startMs).toISOString(),
      fechaHasta: new Date(endMs).toISOString(),
      informacion: activityName(session),
      calorias,
      pasos: 0,
      distancia: 0,
      tiempoMovimiento: `${hours}h ${mins}m`,
    });
  }

  return newOnes;
}
