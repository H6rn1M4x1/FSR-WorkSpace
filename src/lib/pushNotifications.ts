import { supabase } from "./supabase";
import { netlifyFn } from "./apiBase";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BKbrXY_FPLAnS9cJyY10YfL51ob8Naxe_D7bLZ6jstiusoE1smwd2jc238eQltRZbEnE6Gwl9_yRY5oes8S19I0";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// El WebView de Android (a diferencia de un navegador real) no implementa la Push API —
// soporta Service Workers, pero PushManager directamente no existe ahí. El camino "de verdad"
// sería Firebase Cloud Messaging, pero el proyecto de Firebase de esta app está en un "Starter
// Tier" de AI Studio que no deja agregar la app Android — así que la vía principal acá es
// NOTIFICACIONES LOCALES (@capacitor/local-notifications): la app arma de antemano el calendario
// de avisos (turnos, pagos, salud, comidas — ver src/lib/localReminders.ts) y es el sistema
// operativo el que los dispara en su horario, sin depender de ningún servidor ni de Google. Este
// botón intenta ADEMÁS registrarse para FCM por si en algún momento se resuelve lo de Firebase,
// pero que eso falle no debe impedir que las notificaciones locales (lo que realmente importa)
// queden activadas.
async function tryRegisterFcm(): Promise<void> {
  try {
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== "granted") return;
  } catch {
    return;
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
          resolve();
          return;
        }
        await fetch(netlifyFn("/.netlify/functions/save-fcm-token"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ token: token.value }),
        });
      } catch {
        // best-effort: si falla, las notificaciones locales siguen andando igual.
      } finally {
        resolve();
      }
    }).then((handle) => { registrationHandle = handle; });

    PushNotifications.addListener("registrationError", async () => {
      await cleanup();
      resolve();
    }).then((handle) => { errorHandle = handle; });

    PushNotifications.register();
  });
}

// En nativo, la fuente de verdad es el permiso de notificaciones locales (ver
// src/lib/localReminders.ts) — FCM se intenta aparte, sin bloquear el resultado.
async function enableNativePush(): Promise<{ ok: boolean; reason?: string }> {
  const permStatus = await LocalNotifications.requestPermissions();
  if (permStatus.display !== "granted") {
    return { ok: false, reason: "Permiso de notificaciones denegado." };
  }
  tryRegisterFcm().catch(() => {});
  return { ok: true };
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
  // En nativo no hay una "suscripción" de FCM que dar de baja (el token se invalida solo si se
  // desinstala la app) — lo que sí se puede/debe cancelar son los recordatorios locales que ya
  // estén programados.
  if (Capacitor.isNativePlatform()) {
    const { cancelAllLocalReminders } = await import("./localReminders");
    await cancelAllLocalReminders();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
};
