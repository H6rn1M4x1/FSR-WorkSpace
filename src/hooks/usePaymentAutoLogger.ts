import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PaymentListener } from "../lib/paymentListenerPlugin";
import { parsePaymentNotification } from "../lib/paymentParsing";
import { getCachedAppLabel } from "../lib/paymentApps";
import { saveItemToFirestore } from "../lib/firestoreSyncService";
import { generateUniqueId } from "../utils/id";
import { getArgentinaDateString } from "../utils/date";
import type { GastoVario } from "../types";

/**
 * Detección automática de pagos (solo Android nativo): escucha el evento "paymentDetected"
 * que dispara PaymentListenerPlugin cada vez que llega una notificación de una app de pago que
 * el usuario eligió monitorear (ver android/app/.../PaymentListenerService.java), la parsea
 * (paymentParsing.ts) y, si es un gasto reconocible, lo guarda directo en Gastos Varios — sin
 * pedir confirmación, por decisión explícita del usuario. El parseo queda registrado en
 * notaOrigen para poder auditar/corregir un gasto mal interpretado después.
 */
export function usePaymentAutoLogger(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    const handlePromise = PaymentListener.addListener("paymentDetected", (event) => {
      const parsed = parsePaymentNotification(event.title, event.text, event.bigText);
      if (!parsed) return;

      const gasto: GastoVario = {
        id: generateUniqueId("gasto_auto"),
        descripcion: parsed.merchant || "Pago detectado automáticamente",
        categoria: "Varios",
        fecha: getArgentinaDateString(event.postTime ? new Date(event.postTime) : new Date()),
        metodo: getCachedAppLabel(event.packageName),
        monto: parsed.amount,
        autoDetectado: true,
        notaOrigen: event.bigText || event.text || event.title || "",
      };

      saveItemToFirestore(userId, "gastos_varios", gasto).catch((err) => {
        console.error("[PaymentAutoLogger] Error guardando gasto auto-detectado:", err);
      });
    });

    return () => {
      handlePromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [userId]);
}
