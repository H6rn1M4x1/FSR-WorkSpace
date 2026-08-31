import { DetailedPayment } from "../types";
import { generateUniqueId } from "./id";
import { saveItemToFirestore } from "../lib/firestoreSyncService";

/**
 * Parses and normalizes various date formats (YYYY-MM-DD, DD/MM/YYYY, with or without time).
 */
export function normalizeDateComponents(dateStr?: string): {
  year: number;
  month: number;
  day: number;
  timePart?: string;
  isoDate: string;
} | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Match DD/MM/YYYY [THH:mm or HH:mm]
  const dmyMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s](\d{2}:\d{2}))?/,
  );
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    const timePart = dmyMatch[4] || undefined;
    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { year, month, day, timePart, isoDate };
  }

  // Match YYYY-MM-DD [THH:mm or HH:mm]
  const ymdMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{2}:\d{2}))?/,
  );
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    const timePart = ymdMatch[4] || undefined;
    const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { year, month, day, timePart, isoDate };
  }

  return null;
}

/**
 * Adds exactly 1 month to a given date string, preserving the day of the month
 * and clamping to the maximum days of the target month (e.g., Aug 31 -> Sep 30).
 */
export function addOneMonthToDateString(dateStr: string): string {
  const parsed = normalizeDateComponents(dateStr);
  if (!parsed) return dateStr;

  let { year, month, day, timePart } = parsed;

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  // Days in target month (nextMonth is 1-indexed, day 0 of following month gives last day of nextMonth)
  const maxDaysInTargetMonth = new Date(nextYear, nextMonth, 0).getDate();
  const nextDay = Math.min(day, maxDaysInTargetMonth);

  const formattedDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
  return timePart ? `${formattedDate}T${timePart}` : formattedDate;
}

/**
 * Checks if a recurring payment has reached its trigger threshold
 * ("un día antes de finalizar el mes").
 *
 * For a payment in month M of year Y:
 * Trigger threshold is 1 day before the last day of month M.
 * E.g., for August (31 days), trigger date is August 30.
 * If today >= triggerDate, the next month's payment (September) is due to be created.
 */
export function isRecurringTriggerDue(
  paymentDueDate: string,
  referenceDate: Date = new Date(),
): boolean {
  const parsed = normalizeDateComponents(paymentDueDate);
  if (!parsed) return false;

  const { year: payYear, month: payMonth } = parsed;

  // Calculate the last day of the payment's due month
  const lastDayOfPaymentMonth = new Date(payYear, payMonth, 0).getDate();
  const triggerDay = Math.max(1, lastDayOfPaymentMonth - 1); // 1 day before the end of the month

  // Reference date components (local system date)
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1; // 1-indexed
  const refDay = referenceDate.getDate();

  // Compare year and month
  if (refYear > payYear) return true;
  if (refYear === payYear && refMonth > payMonth) return true;
  if (refYear === payYear && refMonth === payMonth && refDay >= triggerDay) {
    return true;
  }

  return false;
}

/**
 * Checks whether a given recurring payment requires a new record to be created
 * for the next month.
 */
export function shouldGenerateNextMonthPayment(
  payment: DetailedPayment,
  allPayments: DetailedPayment[],
  referenceDate: Date = new Date(),
): boolean {
  if (!payment.pagoRecurrente || !payment.fechaVencimiento) return false;

  // Check if we reached the trigger time (1 day before end of month or later)
  if (!isRecurringTriggerDue(payment.fechaVencimiento, referenceDate)) {
    return false;
  }

  const nextDueDate = addOneMonthToDateString(payment.fechaVencimiento);
  const nextTargetParsed = normalizeDateComponents(nextDueDate);
  if (!nextTargetParsed) return false;

  const nextMonthKey = `${nextTargetParsed.year}-${String(nextTargetParsed.month).padStart(2, "0")}`;
  const normDesc = payment.descripcion.trim().toLowerCase();

  // Check if there is already a payment for this description, category and target month
  const alreadyExists = allPayments.some((p) => {
    if (p.id === payment.id) return false;
    const pNormDesc = p.descripcion?.trim().toLowerCase();
    if (pNormDesc !== normDesc) return false;
    if (p.categoria !== payment.categoria) return false;

    const pParsed = normalizeDateComponents(p.fechaVencimiento);
    if (!pParsed) return false;

    const pMonthKey = `${pParsed.year}-${String(pParsed.month).padStart(2, "0")}`;
    return pMonthKey === nextMonthKey;
  });

  return !alreadyExists;
}

/**
 * Constructs a new DetailedPayment for the next month based on the recurring source payment.
 * Fields copied as requested:
 * - Descripcion
 * - Categoria
 * - Monto (montoAPagar)
 * - Fecha de Vencimiento + 1 mes
 * - Metodo de pago
 * - Con que pagar
 * - Donde pagar
 * - Pago Recurrente (true)
 * - Pago (false - initially unpaid)
 */
export function buildNextMonthDetailedPayment(
  sourcePayment: DetailedPayment,
): DetailedPayment {
  const nextFechaVencimiento = addOneMonthToDateString(
    sourcePayment.fechaVencimiento,
  );

  const nextFechaCierre = sourcePayment.fechaCierre
    ? addOneMonthToDateString(sourcePayment.fechaCierre)
    : undefined;

  return {
    id: generateUniqueId("dp"),
    pago: false, // New month starts unpaid
    descripcion: sourcePayment.descripcion.trim(),
    categoria: sourcePayment.categoria,
    montoAPagar: Number(sourcePayment.montoAPagar) || 0,
    fechaVencimiento: nextFechaVencimiento,
    fechaCierre:
      sourcePayment.categoria === "Tarjeta de Credito"
        ? nextFechaCierre
        : undefined,
    metodoPago: sourcePayment.metodoPago,
    pagoRecurrente: true, // Remains recurring for future cycles
    conQuePagar: sourcePayment.conQuePagar || "",
    dondePagar: sourcePayment.dondePagar || "",
    facturaEmitida: undefined,
    comprobantePago: undefined,
    observaciones: sourcePayment.observaciones || undefined,
  };
}

// In-memory set to prevent concurrent duplicate generation during the same session
const inFlightGenerations = new Set<string>();

/**
 * Scans all detailed payments, detects recurring payments that are due for next-month creation,
 * automatically generates the new records, persists them to Firestore, and returns the updated list.
 */
export async function processAndCreateRecurringPayments(
  currentPayments: DetailedPayment[],
  userId: string = "hernanmaximiliano10@gmail.com",
  referenceDate: Date = new Date(),
): Promise<{
  updatedPayments: DetailedPayment[];
  newPaymentsCreated: DetailedPayment[];
}> {
  if (!currentPayments || currentPayments.length === 0) {
    return { updatedPayments: currentPayments || [], newPaymentsCreated: [] };
  }

  const recurringPayments = currentPayments.filter((p) => p.pagoRecurrente);
  if (recurringPayments.length === 0) {
    return { updatedPayments: currentPayments, newPaymentsCreated: [] };
  }

  const newPaymentsToCreate: DetailedPayment[] = [];
  const workingPayments = [...currentPayments];

  for (const recPay of recurringPayments) {
    if (
      shouldGenerateNextMonthPayment(recPay, workingPayments, referenceDate)
    ) {
      const nextDueDate = addOneMonthToDateString(recPay.fechaVencimiento);
      const nextParsed = normalizeDateComponents(nextDueDate);
      const genKey = `${recPay.descripcion.trim().toLowerCase()}_${recPay.categoria}_${nextParsed?.isoDate || nextDueDate}`;

      if (inFlightGenerations.has(genKey)) {
        continue;
      }
      inFlightGenerations.add(genKey);

      const newPayment = buildNextMonthDetailedPayment(recPay);
      newPaymentsToCreate.push(newPayment);
      workingPayments.unshift(newPayment);
    }
  }

  if (newPaymentsToCreate.length > 0) {
    // Persist all new records in parallel to Firestore
    try {
      await Promise.all(
        newPaymentsToCreate.map((np) =>
          saveItemToFirestore(userId, "detailed_payments", np),
        ),
      );
    } catch (err) {
      console.error(
        "Error guardando nuevos pagos recurrentes en Firestore:",
        err,
      );
    }
  }

  return {
    updatedPayments: workingPayments,
    newPaymentsCreated: newPaymentsToCreate,
  };
}
