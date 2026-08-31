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
  setDoc,
  Unsubscribe
} from "firebase/firestore";
import { db } from "./firebase";
import { touchSyncStatus, sanitizeForFirestore, getEffectiveUserId } from "./firestoreSyncService";

export type SharedSectionType = "comidas" | "control_clinico";

export interface SectionLink {
  id?: string;
  fromEmail: string;
  toEmail: string;
  section: SharedSectionType;
  status: "pending" | "accepted" | "rejected";
  sharedDbUserId: string; // The user ID holding the shared database
  createdAt: string;
  updatedAt: string;
}

export const SECTION_CATEGORIES: Record<SharedSectionType, string[]> = {
  comidas: [
    "pantry",
    "meals",
    "shopping",
    "mercaderia",
    "alimentos",
    "platos",
    "organizacion_semanal"
  ],
  control_clinico: [
    "medical_records",
    "doctors",
    "blood_pressure",
    "medications",
    "medicamentos_detallados",
    "disponibilidad_medicamentos"
  ]
};

export const SECTION_NAMES: Record<SharedSectionType, string> = {
  comidas: "Comidas & Nutrición",
  control_clinico: "Control Clínico & Médico"
};

export const SECTION_DESCRIPTIONS: Record<SharedSectionType, string> = {
  comidas: "Alimentos, Platos, Recetas, Alacena, Mercadería, Lista de Compras y Plan Semanal.",
  control_clinico: "Doctores, Presión Arterial, Estudios e Informes Médicos, Medicamentos y Stock."
};

const LINKS_COLLECTION = "section_links";

/**
 * Subscribes in real-time to incoming and outgoing section links for a user
 */
export function subscribeToSectionLinks(
  userEmail: string,
  onUpdate: (data: { incoming: SectionLink[]; outgoing: SectionLink[]; active: SectionLink[] }) => void
): Unsubscribe {
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  if (!normalizedEmail) {
    onUpdate({ incoming: [], outgoing: [], active: [] });
    return () => {};
  }

  let incomingList: SectionLink[] = [];
  let outgoingList: SectionLink[] = [];

  const recalculateAndNotify = () => {
    const allLinks = [...incomingList, ...outgoingList];
    const uniqueMap = new Map<string, SectionLink>();
    allLinks.forEach((link) => {
      if (link.id) uniqueMap.set(link.id, link);
    });

    const uniqueLinks = Array.from(uniqueMap.values());
    const active = uniqueLinks.filter((l) => l.status === "accepted");

    onUpdate({
      incoming: incomingList,
      outgoing: outgoingList,
      active
    });
  };

  const qIncoming = query(
    collection(db, LINKS_COLLECTION),
    where("toEmail", "==", normalizedEmail)
  );

  const qOutgoing = query(
    collection(db, LINKS_COLLECTION),
    where("fromEmail", "==", normalizedEmail)
  );

  const unsubIncoming = onSnapshot(
    qIncoming,
    (snapshot) => {
      incomingList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as SectionLink[];
      recalculateAndNotify();
    },
    (err) => {
      console.warn("[SectionSharing] Error in incoming links snapshot:", err);
    }
  );

  const unsubOutgoing = onSnapshot(
    qOutgoing,
    (snapshot) => {
      outgoingList = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as SectionLink[];
      recalculateAndNotify();
    },
    (err) => {
      console.warn("[SectionSharing] Error in outgoing links snapshot:", err);
    }
  );

  return () => {
    try { unsubIncoming(); } catch (_) {}
    try { unsubOutgoing(); } catch (_) {}
  };
}

/**
 * Sends invitations to link one or more sections with another user
 */
export async function sendSectionInvitation(
  fromEmail: string,
  toEmail: string,
  sections: SharedSectionType[]
): Promise<{ success: boolean; message: string }> {
  const normFrom = fromEmail.trim().toLowerCase();
  const normTo = toEmail.trim().toLowerCase();

  if (!normFrom || !normTo) {
    return { success: false, message: "Por favor proporciona un correo electrónico válido." };
  }

  if (normFrom === normTo) {
    return { success: false, message: "No puedes enviarte una invitación a ti mismo." };
  }

  if (!sections || sections.length === 0) {
    return { success: false, message: "Selecciona al menos una sección para vincular." };
  }

  try {
    const now = new Date().toISOString();
    for (const sec of sections) {
      // Check if an existing link or pending invitation already exists
      const existingQuery = query(
        collection(db, LINKS_COLLECTION),
        where("fromEmail", "==", normFrom),
        where("toEmail", "==", normTo),
        where("section", "==", sec)
      );
      const snap = await getDocs(existingQuery);
      if (!snap.empty) {
        // Update existing link to pending
        const existingDoc = snap.docs[0];
        await updateDoc(doc(db, LINKS_COLLECTION, existingDoc.id), {
          status: "pending",
          sharedDbUserId: normFrom,
          updatedAt: now
        });
      } else {
        // Create new link
        await addDoc(collection(db, LINKS_COLLECTION), {
          fromEmail: normFrom,
          toEmail: normTo,
          section: sec,
          status: "pending",
          sharedDbUserId: normFrom,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    return { success: true, message: `Invitación enviada con éxito a ${normTo}.` };
  } catch (error: any) {
    console.error("[SectionSharing] Error sending invitation:", error);
    return { success: false, message: error?.message || "Error al enviar la invitación." };
  }
}

/**
 * Accepts a pending section invitation
 */
export async function acceptSectionInvitation(
  link: SectionLink,
  copyLocalDataToShared: boolean = true
): Promise<{ success: boolean; message: string }> {
  if (!link.id) return { success: false, message: "ID de vínculo no válido." };

  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, LINKS_COLLECTION, link.id), {
      status: "accepted",
      updatedAt: now
    });

    // Optionally merge data from acceptor's local DB into the shared DB
    if (copyLocalDataToShared && link.toEmail && link.sharedDbUserId && link.toEmail !== link.sharedDbUserId) {
      const categories = SECTION_CATEGORIES[link.section] || [];
      for (const cat of categories) {
        try {
          const localSnap = await getDocs(collection(db, "users", link.toEmail.toLowerCase(), cat));
          if (!localSnap.empty) {
            for (const docItem of localSnap.docs) {
              const itemData = docItem.data();
              if (itemData) {
                const targetRef = doc(db, "users", link.sharedDbUserId.toLowerCase(), cat, docItem.id);
                await setDoc(targetRef, sanitizeForFirestore(itemData), { merge: true });
              }
            }
            touchSyncStatus(link.sharedDbUserId, cat);
          }
        } catch (e) {
          console.warn(`[SectionSharing] Warning copying ${cat} data:`, e);
        }
      }
    }

    // Touch sync status on both sides so all subscribers refresh
    const categories = SECTION_CATEGORIES[link.section] || [];
    categories.forEach((cat) => {
      touchSyncStatus(link.sharedDbUserId, cat);
    });

    return { success: true, message: "¡Sección vinculada exitosamente! Ahora ambos comparten la misma base de datos." };
  } catch (error: any) {
    console.error("[SectionSharing] Error accepting invitation:", error);
    return { success: false, message: error?.message || "Error al aceptar la invitación." };
  }
}

/**
 * Rejects a pending section invitation
 */
export async function rejectSectionInvitation(linkId: string): Promise<{ success: boolean; message: string }> {
  try {
    await deleteDoc(doc(db, LINKS_COLLECTION, linkId));
    return { success: true, message: "Invitación rechazada." };
  } catch (error: any) {
    console.error("[SectionSharing] Error rejecting invitation:", error);
    return { success: false, message: error?.message || "Error al rechazar la invitación." };
  }
}

/**
 * Unlinks an active shared section
 */
export async function unlinkSection(link: SectionLink): Promise<{ success: boolean; message: string }> {
  if (!link.id) return { success: false, message: "ID de vínculo no válido." };

  try {
    await deleteDoc(doc(db, LINKS_COLLECTION, link.id));
    return { success: true, message: "Sección desvinculada. Cada usuario volverá a utilizar su base de datos independiente." };
  } catch (error: any) {
    console.error("[SectionSharing] Error unlinking section:", error);
    return { success: false, message: error?.message || "Error al desvincular la sección." };
  }
}

/**
 * Resolves the effective user ID for a section.
 * If there is an accepted link for this user and section, returns the sharedDbUserId.
 * Otherwise, returns the user's own email.
 */
export function getEffectiveSectionUserId(
  userEmail: string,
  section: SharedSectionType,
  activeLinks: SectionLink[]
): string {
  const normEmail = (userEmail || "").trim().toLowerCase();
  if (!normEmail) return "hernanmaximiliano10@gmail.com";

  const link = activeLinks.find(
    (l) =>
      l.status === "accepted" &&
      l.section === section &&
      (l.fromEmail.toLowerCase() === normEmail || l.toEmail.toLowerCase() === normEmail)
  );

  if (link && link.sharedDbUserId) {
    return link.sharedDbUserId.toLowerCase().trim();
  }

  return normEmail;
}

/**
 * Gets partner email for an active section link
 */
export function getLinkedPartnerInfo(
  userEmail: string,
  section: SharedSectionType,
  activeLinks: SectionLink[]
): { isLinked: boolean; partnerEmail: string | null; isOwner: boolean; linkId?: string } {
  const normEmail = (userEmail || "").trim().toLowerCase();
  const link = activeLinks.find(
    (l) =>
      l.status === "accepted" &&
      l.section === section &&
      (l.fromEmail.toLowerCase() === normEmail || l.toEmail.toLowerCase() === normEmail)
  );

  if (!link) {
    return { isLinked: false, partnerEmail: null, isOwner: false };
  }

  const partnerEmail =
    link.fromEmail.toLowerCase() === normEmail ? link.toEmail : link.fromEmail;
  const isOwner = link.sharedDbUserId.toLowerCase() === normEmail;

  return {
    isLinked: true,
    partnerEmail,
    isOwner,
    linkId: link.id
  };
}
