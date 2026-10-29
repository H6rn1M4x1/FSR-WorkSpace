import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { ChatContact, ChatMessage } from "../types";

const CONTACTS_COLLECTION = "chat_contacts";
const MESSAGES_COLLECTION = "chat_messages";

export function getConversationId(emailA: string, emailB: string): string {
  const a = (emailA || "").trim().toLowerCase();
  const b = (emailB || "").trim().toLowerCase();
  return [a, b].sort().join("__");
}

/**
 * Subscribes in real-time to incoming and outgoing contact invitations for a user.
 */
export function subscribeToContacts(
  userEmail: string,
  onUpdate: (data: { incoming: ChatContact[]; outgoing: ChatContact[]; active: ChatContact[] }) => void
): Unsubscribe {
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    onUpdate({ incoming: [], outgoing: [], active: [] });
    return () => {};
  }

  let incomingList: ChatContact[] = [];
  let outgoingList: ChatContact[] = [];

  const recalculateAndNotify = () => {
    const uniqueMap = new Map<string, ChatContact>();
    [...incomingList, ...outgoingList].forEach((c) => {
      if (c.id) uniqueMap.set(c.id, c);
    });
    const unique = Array.from(uniqueMap.values());
    const active = unique.filter((c) => c.status === "accepted");

    onUpdate({
      incoming: incomingList.filter((c) => c.status === "pending"),
      outgoing: outgoingList.filter((c) => c.status === "pending"),
      active,
    });
  };

  const qIncoming = query(collection(db, CONTACTS_COLLECTION), where("toEmail", "==", normalizedEmail));
  const qOutgoing = query(collection(db, CONTACTS_COLLECTION), where("fromEmail", "==", normalizedEmail));

  const unsubIncoming = onSnapshot(
    qIncoming,
    (snapshot) => {
      incomingList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ChatContact[];
      recalculateAndNotify();
    },
    (err) => console.warn("[Chat] Error en invitaciones recibidas:", err)
  );

  const unsubOutgoing = onSnapshot(
    qOutgoing,
    (snapshot) => {
      outgoingList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ChatContact[];
      recalculateAndNotify();
    },
    (err) => console.warn("[Chat] Error en invitaciones enviadas:", err)
  );

  return () => {
    try { unsubIncoming(); } catch (_) {}
    try { unsubOutgoing(); } catch (_) {}
  };
}

/**
 * Sends a contact invitation. If the target already invited us first, auto-accepts instead
 * of creating a duplicate pending pair.
 */
export async function sendContactInvitation(
  fromEmail: string,
  toEmail: string
): Promise<{ success: boolean; message: string }> {
  const normFrom = (fromEmail || "").trim().toLowerCase();
  const normTo = (toEmail || "").trim().toLowerCase();

  if (!normTo || !normTo.includes("@")) {
    return { success: false, message: "Por favor ingresa un correo electrónico válido." };
  }
  if (normFrom === normTo) {
    return { success: false, message: "No puedes agregarte a ti mismo como contacto." };
  }

  try {
    const existingQuery = query(
      collection(db, CONTACTS_COLLECTION),
      where("fromEmail", "==", normFrom),
      where("toEmail", "==", normTo)
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data() as ChatContact;
      return {
        success: false,
        message: existing.status === "accepted" ? "Ya tienes a este contacto agregado." : "Ya existe una invitación pendiente para este contacto.",
      };
    }

    // If the other person already invited us, accept that invite instead of duplicating it.
    const reverseQuery = query(
      collection(db, CONTACTS_COLLECTION),
      where("fromEmail", "==", normTo),
      where("toEmail", "==", normFrom)
    );
    const reverseSnap = await getDocs(reverseQuery);
    if (!reverseSnap.empty) {
      const reverseDoc = reverseSnap.docs[0];
      await updateDoc(doc(db, CONTACTS_COLLECTION, reverseDoc.id), {
        status: "accepted",
        updatedAt: new Date().toISOString(),
      });
      return { success: true, message: `¡${normTo} ya te había agregado! Contacto vinculado.` };
    }

    const now = new Date().toISOString();
    await addDoc(collection(db, CONTACTS_COLLECTION), {
      fromEmail: normFrom,
      toEmail: normTo,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, message: `Invitación enviada a ${normTo}.` };
  } catch (error: any) {
    return { success: false, message: error?.message || "Error al enviar la invitación." };
  }
}

export async function acceptContactInvitation(contact: ChatContact): Promise<{ success: boolean; message: string }> {
  if (!contact.id) return { success: false, message: "ID de contacto no válido." };
  try {
    await updateDoc(doc(db, CONTACTS_COLLECTION, contact.id), {
      status: "accepted",
      updatedAt: new Date().toISOString(),
    });
    return { success: true, message: "Contacto agregado con éxito." };
  } catch (error: any) {
    return { success: false, message: error?.message || "Error al aceptar la invitación." };
  }
}

export async function rejectContactInvitation(contactId: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(db, CONTACTS_COLLECTION, contactId));
    return { success: true, message: "Invitación rechazada." };
  } catch (error: any) {
    return { success: false, message: error?.message || "Error al rechazar la invitación." };
  }
}

export async function removeContact(contactId: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(db, CONTACTS_COLLECTION, contactId));
    return { success: true, message: "Contacto eliminado." };
  } catch (error: any) {
    return { success: false, message: error?.message || "Error al eliminar el contacto." };
  }
}

/**
 * Subscribes in real-time to every message of a 1-to-1 conversation, sorted oldest-first.
 */
export function subscribeToConversation(
  conversationId: string,
  onUpdate: (messages: ChatMessage[]) => void
): Unsubscribe {
  if (!conversationId) {
    onUpdate([]);
    return () => {};
  }
  const q = query(collection(db, MESSAGES_COLLECTION), where("conversationId", "==", conversationId));
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ChatMessage[];
      messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      onUpdate(messages);
    },
    (err) => console.warn("[Chat] Error en conversación:", err)
  );
}

export async function sendChatMessage(fromEmail: string, toEmail: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const normFrom = (fromEmail || "").trim().toLowerCase();
  const normTo = (toEmail || "").trim().toLowerCase();
  const conversationId = getConversationId(normFrom, normTo);
  await addDoc(collection(db, MESSAGES_COLLECTION), {
    conversationId,
    fromEmail: normFrom,
    toEmail: normTo,
    text: trimmed,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

/**
 * Subscribes to unread message counts grouped by sender, for the unread badge system.
 */
export function subscribeToUnreadMessages(
  userEmail: string,
  onUpdate: (unreadByContact: Record<string, number>) => void
): Unsubscribe {
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    onUpdate({});
    return () => {};
  }
  const q = query(collection(db, MESSAGES_COLLECTION), where("toEmail", "==", normalizedEmail));
  return onSnapshot(
    q,
    (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data() as ChatMessage;
        if (!data.read) counts[data.fromEmail] = (counts[data.fromEmail] || 0) + 1;
      });
      onUpdate(counts);
    },
    (err) => console.warn("[Chat] Error en mensajes no leídos:", err)
  );
}

export async function markConversationRead(conversationId: string, userEmail: string): Promise<void> {
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  if (!conversationId || !normalizedEmail) return;
  try {
    const q = query(collection(db, MESSAGES_COLLECTION), where("conversationId", "==", conversationId));
    const snapshot = await getDocs(q);
    const toMark = snapshot.docs.filter((d) => {
      const data = d.data() as ChatMessage;
      return data.toEmail === normalizedEmail && !data.read;
    });
    await Promise.all(toMark.map((d) => updateDoc(doc(db, MESSAGES_COLLECTION, d.id), { read: true })));
  } catch (error) {
    console.warn("[Chat] Error al marcar conversación como leída:", error);
  }
}

/**
 * Resolves a contact's display name/photo from their own user_profile document, the same
 * public-profile path used by itemSharingService for "shared by" labels.
 */
export function subscribeToUserProfileName(
  email: string,
  onUpdate: (info: { displayName?: string; photoURL?: string }) => void
): Unsubscribe {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail) return () => {};
  const profileRef = doc(db, "users", normalizedEmail, "user_profile", normalizedEmail);
  return onSnapshot(
    profileRef,
    (snap) => {
      const data = snap.data() as any;
      onUpdate({ displayName: data?.displayName, photoURL: data?.photoURL });
    },
    () => {}
  );
}
