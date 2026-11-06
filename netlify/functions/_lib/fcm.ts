import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Credencial de cuenta de servicio de Firebase (Project Settings > Service accounts > Generate
// new private key), pegada entera como un solo JSON en esta variable de entorno de Netlify —
// necesaria para mandar pushes nativos (FCM) desde el backend; sin ella, sendFcmToTokens()
// simplemente no manda nada (no rompe el push web existente, que sigue yendo por web-push).
function getFirebaseApp() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  if (getApps().length > 0) return getApps()[0];
  const serviceAccount = JSON.parse(raw);
  return initializeApp({ credential: cert(serviceAccount) });
}

// Manda la misma notificación a una lista de tokens de FCM (celulares con la app empaquetada).
// Devuelve cuántos se mandaron bien y, si falló alguno porque el token ya no es válido (app
// desinstalada, token rotado), su índice — para que el caller los borre de fcm_tokens.
export async function sendFcmToTokens(
  tokens: string[],
  notification: { title: string; body: string }
): Promise<{ sent: number; invalidTokenIndexes: number[]; configured: boolean }> {
  const app = getFirebaseApp();
  if (!app || tokens.length === 0) {
    return { sent: 0, invalidTokenIndexes: [], configured: !!app };
  }

  const messaging = getMessaging(app);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification,
  });

  const invalidTokenIndexes: number[] = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code;
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        invalidTokenIndexes.push(i);
      }
    }
  });

  return { sent: response.successCount, invalidTokenIndexes, configured: true };
}
