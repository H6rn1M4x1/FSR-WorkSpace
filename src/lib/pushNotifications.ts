import { supabase } from "./supabase";
import { netlifyFn } from "./apiBase";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BKbrXY_FPLAnS9cJyY10YfL51ob8Naxe_D7bLZ6jstiusoE1smwd2jc238eQltRZbEnE6Gwl9_yRY5oes8S19I0";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// El WebView de Android (a diferencia de un navegador real) no implementa la Push API —
// soporta Service Workers, pero PushManager directamente no existe ahí. Por eso el push "web" de
// acá abajo nunca va a andar empaquetado: en nativo el camino es Firebase Cloud Messaging vía
// @capacitor/push-notifications, que entrega un token de FCM en vez de una subscription de Push
// API — se guarda en una tabla aparte (fcm_tokens) porque el backend lo manda con
// firebase-admin, no con la librería web-push que ya usa push_subscriptions.
async function enableNativePush(): Promise<{ ok: boolean; reason?: string }> {
  const permStatus = await PushNotifications.requestPermissions();
  if (permStatus.receive !== "granted") {
    return { ok: false, reason: "Permiso de notificaciones denegado." };
  }

  return new Promise((resolve) => {
    let registrationHandle: { remove: () => Promise<void> } | undefined;
    let errorHandle: { remove: () => Promise<void> } | undefined;
    const cleanup = async () => {
      await registrationHandle?.remove();
      await errorHandle?.remove();
    };

    PushNotifications.addListener("registration", async (token) => {
      await cleanup();
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authToken = sessionData.session?.access_token;
        if (!authToken) {
          resolve({ ok: false, reason: "Tenés que iniciar sesión primero." });
          return;
        }
        const res = await fetch(netlifyFn("/.netlify/functions/save-fcm-token"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ token: token.value }),
        });
        resolve(res.ok ? { ok: true } : { ok: false, reason: "No se pudo guardar el token en el servidor." });
      } catch (err: any) {
        resolve({ ok: false, reason: err?.message || "Error al guardar el token." });
      }
    }).then((handle) => { registrationHandle = handle; });

    PushNotifications.addListener("registrationError", async (err) => {
      await cleanup();
      resolve({ ok: false, reason: err.error || "Error al registrar notificaciones push." });
    }).then((handle) => { errorHandle = handle; });

    PushNotifications.register();
  });
}

// Call this from a button like "Activar notificaciones" in Ajustes/UserSettings.
export const enablePushNotifications = async (): Promise<{ ok: boolean; reason?: string }> => {
  if (Capacitor.isNativePlatform()) {
    return enableNativePush();
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "Este navegador no soporta notificaciones push." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Permiso de notificaciones denegado." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return { ok: false, reason: "Tenés que iniciar sesión primero." };
  }

  const raw = subscription.toJSON();
  const res = await fetch(netlifyFn("/.netlify/functions/save-push-subscription"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: raw.endpoint,
      p256dh: raw.keys?.p256dh,
      auth: raw.keys?.auth,
    }),
  });

  if (!res.ok) {
    return { ok: false, reason: "No se pudo guardar la suscripción en el servidor." };
  }

  return { ok: true };
};

export const disablePushNotifications = async (): Promise<void> => {
  // En nativo no hay una "suscripción" de Push API que dar de baja — el token de FCM se invalida
  // solo si se desinstala la app.
  if (Capacitor.isNativePlatform()) return;
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
};
