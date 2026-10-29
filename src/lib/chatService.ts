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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { ChatContact, ChatMessage, ChatAttachmentType } from "../types";

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
  toEmail: string,
  customName?: string
): Promise<{ success: boolean; message: string }> {
  const normFrom = (fromEmail || "").trim().toLowerCase();
  const normTo = (toEmail || "").trim().toLowerCase();
  const trimmedCustomName = (customName || "").trim();

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
        ...(trimmedCustomName ? { toCustomName: trimmedCustomName } : {}),
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
      ...(trimmedCustomName ? { fromCustomName: trimmedCustomName } : {}),
    });
    return { success: true, message: `Invitación enviada a ${normTo}.` };
  } catch (error: any) {
    return { success: false, message: error?.message || "Error al enviar la invitación." };
  }
}

/**
 * Sets the custom display name a given viewer (either side of the link) sees for their contact,
 * independent of the other person's real profile name.
 */
export async function renameContact(
  contact: ChatContact,
  viewerEmail: string,
  customName: string
): Promise<{ success: boolean; message: string }> {
  if (!contact.id) return { success: false, message: "ID de contacto no válido." };
  const normViewer = (viewerEmail || "").trim().toLowerCase();
  const trimmedName = customName.trim();
  const field = contact.fromEmail === normViewer ? "fromCustomName" : "toCustomName";
  try {
    await updateDoc(doc(db, CONTACTS_COLLECTION, contact.id), {
      [field]: trimmedName,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, message: "Nombre actualizado." };
  } catch (error: any) {
    return { success: false, message: error?.message || "Error al renombrar el contacto." };
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

export interface ChatMessageAttachment {
  url: string;
  type: ChatAttachmentType;
  name?: string;
  durationSec?: number;
}

export async function sendChatMessage(
  fromEmail: string,
  toEmail: string,
  text: string,
  attachment?: ChatMessageAttachment
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed && !attachment) return;
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
    delivered: false,
    ...(attachment
      ? {
          attachmentUrl: attachment.url,
          attachmentType: attachment.type,
          ...(attachment.name ? { attachmentName: attachment.name } : {}),
          ...(attachment.durationSec ? { audioDurationSec: attachment.durationSec } : {}),
        }
      : {}),
  });
}

/**
 * Uploads a chat attachment (image, video, document or voice note) to Firebase Storage and
 * returns its public download URL. Throws on failure — callers should surface the error as a
 * toast instead of silently dropping the attachment.
 */
const UPLOAD_TIMEOUT_MS = 25000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} tardó demasiado. Revisá tu conexión o que Firebase Storage esté habilitado.`));
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export async function uploadChatAttachment(
  conversationId: string,
  file: Blob,
  fileName: string
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `chat_attachments/${conversationId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  try {
    await withTimeout(uploadBytes(storageRef, file), UPLOAD_TIMEOUT_MS, "La subida del archivo");
    return await withTimeout(getDownloadURL(storageRef), UPLOAD_TIMEOUT_MS, "Obtener el link del archivo");
  } catch (error: any) {
    const code = error?.code ? ` (${error.code})` : "";
    throw new Error(`No se pudo subir el archivo${code}. Puede que falte habilitar Firebase Storage para este proyecto.`);
  }
}

/**
 * Re-encodes an image client-side (resize + JPEG) before subiéndola, para que pese bastante
 * menos y el envío sea más rápido — sobre todo con fotos de celular de varios MB. Si algo falla
 * (formato raro, canvas tainted, etc.) devuelve el archivo original tal cual, nunca bloquea el
 * envío por esto.
 */
export async function compressImageFile(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (_) {
    return file;
  }
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
      const toMarkDelivered: string[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data() as ChatMessage;
        if (!data.read) counts[data.fromEmail] = (counts[data.fromEmail] || 0) + 1;
        if (!data.delivered) toMarkDelivered.push(d.id);
      });
      onUpdate(counts);
      // El destinatario (yo) acaba de "ver" estos mensajes llegar — 2da palomita (gris) para
      // quien los envió, sin importar si todavía abrí esa conversación puntual o no.
      if (toMarkDelivered.length > 0) {
        toMarkDelivered.forEach((id) => {
          updateDoc(doc(db, MESSAGES_COLLECTION, id), { delivered: true }).catch(() => {});
        });
      }
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
    // "delivered" también se pisa a true acá: si por lo que sea nunca se marcó al llegar, leerlo
    // ya implica que llegó — así la doble palomita (celeste) siempre aparece en todo mensaje visto.
    await Promise.all(toMark.map((d) => updateDoc(doc(db, MESSAGES_COLLECTION, d.id), { read: true, delivered: true })));
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
