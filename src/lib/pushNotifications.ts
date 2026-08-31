import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BKbrXY_FPLAnS9cJyY10YfL51ob8Naxe_D7bLZ6jstiusoE1smwd2jc238eQltRZbEnE6Gwl9_yRY5oes8S19I0";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Call this from a button like "Activar notificaciones" in Ajustes/UserSettings.
export const enablePushNotifications = async (): Promise<{ ok: boolean; reason?: string }> => {
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
  const res = await fetch("/.netlify/functions/save-push-subscription", {
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
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
};
