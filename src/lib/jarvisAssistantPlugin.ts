import { registerPlugin } from "@capacitor/core";

/**
 * Bridge TS del plugin nativo JarvisAssistantPlugin.java (ver android/app/src/main/java/com/
 * fsrworkspace/app/). Solo existe en Android nativo — en la web y en iOS no hay nada que
 * registre este plugin, así que toda llamada acá debe estar guardada detrás de
 * Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android" (ver
 * JarvisAssistantSettings.tsx).
 */

export interface JarvisAssistantStatus {
  /** El rol de asistente de Android (RoleManager.ROLE_ASSISTANT) solo existe desde Android 10. */
  roleApiSupported: boolean;
  isDefaultAssistant: boolean;
  micPermissionGranted: boolean;
}

export interface JarvisAssistantPlugin {
  getStatus(): Promise<JarvisAssistantStatus>;
  /** Pide (con el diálogo oficial del sistema en Android 10+, o abriendo Ajustes en versiones más viejas) que Jarvis sea el asistente predeterminado. */
  requestDefaultAssistant(): Promise<{ isDefaultAssistant: boolean }>;
  /** Abre directamente la pantalla de Ajustes donde elegir el asistente de voz predeterminado. */
  openAssistantSettings(): Promise<void>;
  requestMicPermission(): Promise<{ granted: boolean }>;
}

export const JarvisAssistant = registerPlugin<JarvisAssistantPlugin>("JarvisAssistant");
