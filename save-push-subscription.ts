import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return {
        statusCode: 500,
        body: `Faltan variables de entorno en Netlify: ${!SUPABASE_URL ? "VITE_SUPABASE_URL " : ""}${!SUPABASE_ANON_KEY ? "VITE_SUPABASE_ANON_KEY" : ""}`,
      };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return { statusCode: 401, body: "Falta token de autenticación" };
    }

    // Act as the requesting user so RLS (policy_push_subscriptions_owner) applies.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return { statusCode: 401, body: `Token inválido: ${userError?.message || "sin usuario"}` };
    }

    const userId = userData.user.email || userData.user.id;

    let body: { endpoint?: string; p256dh?: string; auth?: string };
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: "JSON inválido" };
    }

    if (!body.endpoint || !body.p256dh || !body.auth) {
      return { statusCode: 400, body: "Faltan datos de la suscripción" };
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: body.endpoint,
        p256dh: body.p256dh,
        auth: body.auth,
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      return { statusCode: 500, body: `Error guardando suscripción: ${error.message}` };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, body: `Error inesperado en la función: ${err?.message || String(err)}` };
  }
};
