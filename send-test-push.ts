import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const handler: Handler = async (event) => {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
    const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
    const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hernanmaximiliano10@gmail.com";

    const missing = [
      !SUPABASE_URL && "VITE_SUPABASE_URL",
      !SUPABASE_ANON_KEY && "VITE_SUPABASE_ANON_KEY",
      !VAPID_PUBLIC_KEY && "VITE_VAPID_PUBLIC_KEY",
      !VAPID_PRIVATE_KEY && "VAPID_PRIVATE_KEY",
    ].filter(Boolean);
    if (missing.length) {
      return { statusCode: 500, body: `Faltan variables de entorno en Netlify: ${missing.join(", ")}` };
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);

    const authHeader = event.headers.authorization || event.headers.Authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return { statusCode: 401, body: "Falta token de autenticación" };
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return { statusCode: 401, body: `Token inválido: ${userError?.message || "sin usuario"}` };
    }
    const userId = userData.user.email || userData.user.id;

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", userId);

    if (error) {
      return { statusCode: 500, body: `Error leyendo suscripciones: ${error.message}` };
    }
    if (!subs || subs.length === 0) {
      return { statusCode: 404, body: "No hay ninguna suscripción activa para este usuario." };
    }

    const payload = JSON.stringify({
      title: "FSR Workspace",
      body: "Notificación de prueba: si ves esto, el push funciona con la app cerrada.",
      category: "general",
    });

    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason?.body || r.reason?.message || r.reason));

    return { statusCode: 200, body: JSON.stringify({ ok: true, sent, total: subs.length, failed }) };
  } catch (err: any) {
    return { statusCode: 500, body: `Error inesperado en la función: ${err?.message || String(err)}` };
  }
};
