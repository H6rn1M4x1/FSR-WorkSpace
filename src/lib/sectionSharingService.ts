import { supabase } from "./supabase";
import { refetchCategory, saveItemToFirestore } from "./firestoreSyncService";

/**
 * Compartir secciones enteras ("Uso Compartido" en Ajustes), migrado a Supabase (antes vivía en
 * la colección Firestore "section_links"). Dos usuarios vinculan una sección completa (Comidas o
 * Control Clínico) y pasan a compartir la misma base de datos para esa sección — ver
 * getEffectiveSectionUserId, usado en App.tsx para resolver de quién son los datos que hay que
 * leer/escribir en cada categoría de esa sección.
 */

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

const LINKS_TABLE = "section_links";

export type Unsubscribe = () => void;

function rowToLink(row: any): SectionLink {
  return {
    id: row.id,
    fromEmail: row.from_email,
    toEmail: row.to_email,
    section: row.section,
    status: row.status,
    sharedDbUserId: row.shared_db_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function linkId(fromEmail: string, toEmail: string, section: string): string {
  return `${fromEmail}__${toEmail}__${section}`.replace(/[^a-zA-Z0-9_@.-]/g, "_");
}

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
  let cancelled = false;

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

  const fetchIncoming = async () => {
    const { data, error } = await supabase.from(LINKS_TABLE).select("*").eq("to_email", normalizedEmail);
    if (cancelled) return;
    if (error) {
      console.warn("[SectionSharing] Error fetching incoming links:", error.message);
      return;
    }
    incomingList = (data || []).map(rowToLink);
    recalculateAndNotify();
  };

  const fetchOutgoing = async () => {
    const { data, error } = await supabase.from(LINKS_TABLE).select("*").eq("from_email", normalizedEmail);
    if (cancelled) return;
    if (error) {
      console.warn("[SectionSharing] Error fetching outgoing links:", error.message);
      return;
    }
    outgoingList = (data || []).map(rowToLink);
    recalculateAndNotify();
  };

  fetchIncoming();
  fetchOutgoing();

  const channel = supabase
    .channel(`section-links-${normalizedEmail}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: LINKS_TABLE, filter: `to_email=eq.${normalizedEmail}` },
      fetchIncoming
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: LINKS_TABLE, filter: `from_email=eq.${normalizedEmail}` },
      fetchOutgoing
    )
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
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
    const rows = sections.map((sec) => ({
      id: linkId(normFrom, normTo, sec),
      from_email: normFrom,
      to_email: normTo,
      section: sec,
      status: "pending",
      shared_db_user_id: normFrom,
      updated_at: now,
    }));
    // created_at solo se manda en la primera vez — un upsert con onConflict no debe pisarlo en
    // un reenvío, así que se completa aparte únicamente para las filas que todavía no existen.
    const { data: existing } = await supabase
      .from(LINKS_TABLE)
      .select("id")
      .in("id", rows.map((r) => r.id));
    const existingIds = new Set((existing || []).map((r: any) => r.id));
    const rowsWithCreatedAt = rows.map((r) => (existingIds.has(r.id) ? r : { ...r, created_at: now }));

    const { error } = await supabase.from(LINKS_TABLE).upsert(rowsWithCreatedAt, { onConflict: "id" });
    if (error) throw error;

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
    const { error } = await supabase
      .from(LINKS_TABLE)
      .update({ status: "accepted", updated_at: now })
      .eq("id", link.id);
    if (error) throw error;

    // Optionally merge data from acceptor's local DB into the shared DB — vía el mismo
    // despachador Supabase/Firestore que usa el resto de la app (refetchCategory/
    // saveItemToFirestore), así lee y escribe en el backend real de cada categoría, no en un
    // Firestore que para estas categorías ya nadie mira.
    if (copyLocalDataToShared && link.toEmail && link.sharedDbUserId && link.toEmail !== link.sharedDbUserId) {
      const categories = SECTION_CATEGORIES[link.section] || [];
      for (const cat of categories) {
        try {
          const items = await refetchCategory(link.toEmail.toLowerCase(), cat);
          for (const item of items) {
            if (item) {
              await saveItemToFirestore(link.sharedDbUserId.toLowerCase(), cat, item);
            }
          }
        } catch (e) {
          console.warn(`[SectionSharing] Warning copying ${cat} data:`, e);
        }
      }
    }

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
    const { error } = await supabase.from(LINKS_TABLE).delete().eq("id", linkId);
    if (error) throw error;
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
    const { error } = await supabase.from(LINKS_TABLE).delete().eq("id", link.id);
    if (error) throw error;
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
