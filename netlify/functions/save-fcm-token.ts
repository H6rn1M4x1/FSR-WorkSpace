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

    // Act as the requesting user so RLS (policy_fcm_tokens_owner) applies.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return { statusCode: 401, body: `Token inválido: ${userError?.message || "sin usuario"}` };
    }

    const userId = userData.user.email || userData.user.id;

    let body: { token?: string };
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, body: "JSON inválido" };
    }

    if (!body.token) {
      return { statusCode: 400, body: "Falta el token de FCM" };
    }

    const { error } = await supabase.from("fcm_tokens").upsert(
      { user_id: userId, token: body.token },
      { onConflict: "token" }
    );

    if (error) {
      return { statusCode: 500, body: `Error guardando token: ${error.message}` };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, body: `Error inesperado en la función: ${err?.message || String(err)}` };
  }
};
