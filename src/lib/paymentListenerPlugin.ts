import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

/**
 * Bridge TS del plugin nativo PaymentListenerPlugin.java (ver android/app/src/main/java/com/
 * fsrworkspace/app/). Solo existe en Android nativo — en la web y en iOS no hay nada que
 * registre este plugin, así que toda llamada acá debe estar guardada detrás de
 * Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android" (ver paymentListener.ts).
 */

export interface InstalledApp {
  packageName: string;
  label: string;
}

export interface PaymentNotificationEvent {
  packageName: string;
  title: string;
  text: string;
  bigText: string;
  postTime: number;
}

export interface PaymentListenerPlugin {
  /** systemGranted: el usuario otorgó el permiso especial "Acceso a notificaciones". enabled: eso + el switch propio de la app. */
  isEnabled(): Promise<{ systemGranted: boolean; enabled: boolean }>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  /** Abre la pantalla de Ajustes del sistema donde el usuario otorga/revoca el acceso a notificaciones. */
  openNotificationSettings(): Promise<void>;
  getMonitoredPackages(): Promise<{ packages: string[] }>;
  setMonitoredPackages(options: { packages: string[] }): Promise<void>;
  /** Apps instaladas en el dispositivo, para que el usuario elija cuáles monitorear. */
  listInstalledApps(): Promise<{ apps: InstalledApp[] }>;
  addListener(
    eventName: "paymentDetected",
    listenerFunc: (event: PaymentNotificationEvent) => void
  ): Promise<PluginListenerHandle>;
}

export const PaymentListener = registerPlugin<PaymentListenerPlugin>("PaymentListener");
