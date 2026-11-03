import { useCallback, useEffect, useMemo, useState } from "react";
import {
  subscribePaymentMethods,
  savePaymentMethod,
  deletePaymentMethod as deletePaymentMethodDoc,
} from "../lib/paymentMethodsService";
import type { PaymentMethodCard } from "../types";

interface UsePaymentMethodsResult {
  cards: PaymentMethodCard[]; // ordenadas por "order"
  addCard: (card: Omit<PaymentMethodCard, "id" | "order" | "createdAt" | "updatedAt">) => Promise<PaymentMethodCard | null>;
  updateCard: (id: string, card: Omit<PaymentMethodCard, "id" | "order" | "createdAt" | "updatedAt">) => Promise<PaymentMethodCard | null>;
  deleteCard: (id: string) => Promise<void>;
}

export function usePaymentMethods(userId: string | null | undefined): UsePaymentMethodsResult {
  const [cards, setCards] = useState<PaymentMethodCard[]>([]);

  useEffect(() => {
    if (!userId) {
      setCards([]);
      return;
    }
    return subscribePaymentMethods(userId, setCards);
  }, [userId]);

  const addCard = useCallback(
    async (card: Omit<PaymentMethodCard, "id" | "order" | "createdAt" | "updatedAt">): Promise<PaymentMethodCard | null> => {
      if (!userId) return null;
      const now = Date.now();
      const highestOrder = cards.reduce((max, c) => Math.max(max, c.order ?? 0), -1);
      const newCard: PaymentMethodCard = {
        ...card,
        id: `paycard_${now}_${Math.random().toString(36).slice(2, 8)}`,
        order: highestOrder + 1,
        createdAt: now,
        updatedAt: now,
      };
      await savePaymentMethod(userId, newCard);
      return newCard;
    },
    [userId, cards]
  );

  const updateCard = useCallback(
    async (id: string, card: Omit<PaymentMethodCard, "id" | "order" | "createdAt" | "updatedAt">): Promise<PaymentMethodCard | null> => {
      if (!userId) return null;
      const existing = cards.find((c) => c.id === id);
      if (!existing) return null;
      const updated: PaymentMethodCard = {
        ...card,
        id,
        order: existing.order,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      };
      await savePaymentMethod(userId, updated);
      return updated;
    },
    [userId, cards]
  );

  const deleteCard = useCallback(
    async (id: string) => {
      if (!userId) return;
      await deletePaymentMethodDoc(userId, id);
    },
    [userId]
  );

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [cards]
  );

  return useMemo(
    () => ({ cards: sortedCards, addCard, updateCard, deleteCard }),
    [sortedCards, addCard, updateCard, deleteCard]
  );
}
