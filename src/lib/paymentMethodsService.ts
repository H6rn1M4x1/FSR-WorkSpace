/**
 * Persistencia de la "billetera" de tarjetas/cuentas guardadas en Finanzas > Pagos Mensuales.
 * Mismo patrón de "category" que noteFoldersService.ts: cada tarjeta es un documento bajo
 * users/{email}/paymentMethods/{id}, sincronizado en vivo entre dispositivos.
 */
import {
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToCategory,
} from "./firestoreSyncService";
import type { PaymentMethodCard } from "../types";

const CATEGORY = "paymentMethods";

export function subscribePaymentMethods(userId: string, onUpdate: (cards: PaymentMethodCard[]) => void) {
  return subscribeToCategory(userId, CATEGORY, (items) => onUpdate((items as PaymentMethodCard[]) || []));
}

export async function savePaymentMethod(userId: string, card: PaymentMethodCard): Promise<void> {
  await saveItemToFirestore(userId, CATEGORY, card);
}

export async function deletePaymentMethod(userId: string, id: string): Promise<void> {
  await deleteItemFromFirestore(userId, CATEGORY, id);
}
