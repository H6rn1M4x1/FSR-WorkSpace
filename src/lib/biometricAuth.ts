import { Capacitor } from "@capacitor/core";
import { BiometricAuth, BiometryError, BiometryErrorType } from "@aparajita/capacitor-biometric-auth";

// Solo app nativa Android — en la web este plugin simula biometría, lo cual sería confuso (un
// botón de "usar huella" que en realidad no usa nada real). Por eso cada función de este archivo
// corta antes de tocar el plugin si no estamos en una app nativa.
export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export type BiometricAuthOutcome = "success" | "cancelled" | "error";

// "success": el usuario se autenticó. "cancelled": el usuario cerró el prompt o tocó "Cancelar"
// (no es un error a mostrar, solo decidió no usar la huella esta vez). "error": cualquier otra
// cosa (sensor no disponible, bloqueado por intentos fallidos, etc.) — ahí sí conviene avisar.
// En los tres casos el método de siempre (clave maestra / código de Google Authenticator) sigue
// disponible sin cambios: esto nunca lo reemplaza, solo ofrece un atajo más rápido.
export async function authenticateWithBiometric(
  reason: string,
  androidTitle: string
): Promise<BiometricAuthOutcome> {
  if (!Capacitor.isNativePlatform()) return "error";
  try {
    await BiometricAuth.authenticate({
      reason,
      androidTitle,
      androidSubtitle: reason,
      androidConfirmationRequired: false,
      allowDeviceCredential: false,
    });
    return "success";
  } catch (err) {
    if (err instanceof BiometryError && err.code === BiometryErrorType.userCancel) {
      return "cancelled";
    }
    return "error";
  }
}
