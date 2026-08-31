import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDocFromServer
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { AgendaShare } from "../types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export let isFirestoreQuotaExceeded = false;

export function setFirestoreQuotaExceeded(val: boolean) {
  isFirestoreQuotaExceeded = val;
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuotaOrOffline = errMsg.includes("quota") || errMsg.includes("Quota") || errMsg.includes("resource-exhausted") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("offline") || errMsg.includes("Offline");

  const errInfo: FirestoreErrorInfo = {
    error: isQuotaOrOffline ? "Firestore Quota exceeded or client offline. Operating in local mode." : errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isQuotaOrOffline) {
    isFirestoreQuotaExceeded = true;
    console.warn("Firestore status (tracked): " + errInfo.error, JSON.stringify(errInfo));
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }

  return errInfo;
}

// Test connection on boot and check if quota is active
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'shares', 'connection_test'));
    isFirestoreQuotaExceeded = false;
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const isQuota = errMsg.includes("quota") || errMsg.includes("Quota") || errMsg.includes("resource-exhausted") || errMsg.includes("RESOURCE_EXHAUSTED");
    if (isQuota) {
      isFirestoreQuotaExceeded = true;
      console.warn("Firestore status (detected): Quota exceeded. Operating in local mode.");
      return false;
    } else {
      // If it throws permission-denied or something else but NOT quota, the server is responding, so quota is NOT exceeded.
      isFirestoreQuotaExceeded = false;
      return true;
    }
  }
}

const SHARES_COLLECTION = "shares";

/**
 * Creates a new share document in Firestore.
 */
export async function createShare(
  fromEmail: string,
  toEmail: string,
  categories: AgendaShare["categories"],
  agendaData: AgendaShare["agendaData"],
  ids?: {
    sharedTurnoCompromisoIds?: string[];
    sharedAppointmentIds?: string[];
    sharedInvoiceIds?: string[];
    sharedDetailedPaymentIds?: string[];
    sharedOrganizacionSemanalIds?: string[];
    sharedDisponibilidadMedicamentoIds?: string[];
  }
): Promise<string> {
  const normalizedFrom = fromEmail.trim().toLowerCase();
  const normalizedTo = toEmail.trim().toLowerCase();
  
  const payload = {
    fromEmail: normalizedFrom,
    toEmail: normalizedTo,
    categories,
    agendaData,
    sharedTurnoCompromisoIds: ids?.sharedTurnoCompromisoIds || [],
    sharedAppointmentIds: ids?.sharedAppointmentIds || [],
    sharedInvoiceIds: ids?.sharedInvoiceIds || [],
    sharedDetailedPaymentIds: ids?.sharedDetailedPaymentIds || [],
    sharedOrganizacionSemanalIds: ids?.sharedOrganizacionSemanalIds || [],
    sharedDisponibilidadMedicamentoIds: ids?.sharedDisponibilidadMedicamentoIds || [],
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, SHARES_COLLECTION), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, SHARES_COLLECTION);
    return "";
  }
}

/**
 * Updates an existing share document's categories and/or data.
 */
export async function updateShare(
  shareId: string,
  categories: AgendaShare["categories"],
  agendaData: AgendaShare["agendaData"],
  ids?: {
    sharedTurnoCompromisoIds?: string[];
    sharedAppointmentIds?: string[];
    sharedInvoiceIds?: string[];
    sharedDetailedPaymentIds?: string[];
    sharedOrganizacionSemanalIds?: string[];
    sharedDisponibilidadMedicamentoIds?: string[];
  }
): Promise<void> {
  const docRef = doc(db, SHARES_COLLECTION, shareId);
  const payload = {
    categories,
    agendaData,
    sharedTurnoCompromisoIds: ids?.sharedTurnoCompromisoIds || [],
    sharedAppointmentIds: ids?.sharedAppointmentIds || [],
    sharedInvoiceIds: ids?.sharedInvoiceIds || [],
    sharedDetailedPaymentIds: ids?.sharedDetailedPaymentIds || [],
    sharedOrganizacionSemanalIds: ids?.sharedOrganizacionSemanalIds || [],
    sharedDisponibilidadMedicamentoIds: ids?.sharedDisponibilidadMedicamentoIds || [],
    updatedAt: new Date().toISOString()
  };

  try {
    await updateDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SHARES_COLLECTION}/${shareId}`);
  }
}

/**
 * Deletes an existing share.
 */
export async function deleteShare(shareId: string): Promise<void> {
  const docRef = doc(db, SHARES_COLLECTION, shareId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SHARES_COLLECTION}/${shareId}`);
  }
}

/**
 * Single static fetch of outgoing shares created by the logged-in user.
 */
export function subscribeOutgoingShares(
  fromEmail: string,
  onUpdate: (shares: AgendaShare[]) => void,
  onError?: (error: Error) => void
) {
  const normalizedEmail = fromEmail.trim().toLowerCase();
  const q = query(
    collection(db, SHARES_COLLECTION),
    where("fromEmail", "==", normalizedEmail)
  );

  getDocs(q)
    .then((snapshot) => {
      const shares: AgendaShare[] = [];
      snapshot.forEach((doc) => {
        shares.push({ id: doc.id, ...doc.data() } as AgendaShare);
      });
      onUpdate(shares);
    })
    .catch((error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, SHARES_COLLECTION);
    });

  return () => {};
}

/**
 * Single static fetch of incoming shares directed to the logged-in user.
 */
export function subscribeIncomingShares(
  toEmail: string,
  onUpdate: (shares: AgendaShare[]) => void,
  onError?: (error: Error) => void
) {
  const normalizedEmail = toEmail.trim().toLowerCase();
  const q = query(
    collection(db, SHARES_COLLECTION),
    where("toEmail", "==", normalizedEmail)
  );

  getDocs(q)
    .then((snapshot) => {
      const shares: AgendaShare[] = [];
      snapshot.forEach((doc) => {
        shares.push({ id: doc.id, ...doc.data() } as AgendaShare);
      });
      onUpdate(shares);
    })
    .catch((error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, SHARES_COLLECTION);
    });

  return () => {};
}
