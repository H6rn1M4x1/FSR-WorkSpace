import { supabase } from "./supabase";
import { netlifyFn } from "./apiBase";
import { Capacitor } from "@capacitor/core";
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
// Tier" de AI Studio que no deja agregar la app Android — así que acá se usa NOTIFICACIONES
// LOCALES (@capacitor/local-notifications): la app arma de antemano el calendario de avisos
// (turnos, pagos, salud, comidas — ver src/lib/localReminders.ts) y es el sistema operativo el
// que los dispara en su horario, sin depender de ningún servidor ni de Google.
//
// A propósito NO se llama a @capacitor/push-notifications acá: sin google-services.json, Firebase
// nunca queda inicializado del lado nativo de Android, y PushNotifications.register() termina
// crasheando la app entera (una excepción nativa de Firebase, no algo que un try/catch de JS
// pueda atajar) — hasta que Firebase esté realmente disponible, ese plugin se deja sin usar.
async function enableNativePush(): Promise<{ ok: boolean; reason?: string }> {
  const permStatus = await LocalNotifications.requestPermissions();
  if (permStatus.display !== "granted") {
    return { ok: false, reason: "Permiso de notificaciones denegado." };
  }
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

// Para que el botón "Activar Notificaciones" refleje si ya están activadas (al abrir el modal,
// o después de tocarlo) en vez de siempre volver a mostrar "Activar Notificaciones".
export const isPushNotificationsEnabled = async (): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    const permStatus = await LocalNotifications.checkPermissions();
    return permStatus.display === "granted";
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return !!subscription;
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
