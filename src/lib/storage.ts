import {
  AcademicSubject,
  AcademicTask,
  AcademicNote,
  PantryItem,
  MealPlan,
  ShoppingItem,
  Invoice,
  PaymentRecord,
  DetailedPayment,
  GastoVario,
  Inversion,
  CotizacionAccion,
  MonthlyBudget,
  Appointment,
  RoutineLog,
  Medication,
  BloodPressureLog,
  DoctorCard,
  AppNotification,
  MercaderiaItem,
  AlimentoItem,
  PlatoItem,
  OrganizacionSemanalItem,
  TurnoCompromiso,
  MedicamentoDetallado,
  DisponibilidadMedicamento,
  MedicalRecord,
  MateriaInfo,
  HorarioItem
} from "../types";

// Empty arrays for initial collection state (no mock data)
const initialSubjects: AcademicSubject[] = [];
const initialTasks: AcademicTask[] = [];
const initialNotes: AcademicNote[] = [];
const initialPantry: PantryItem[] = [];
const initialMeals: MealPlan[] = [];
const initialShopping: ShoppingItem[] = [];
const initialInvoices: Invoice[] = [];
const initialPayments: PaymentRecord[] = [];
const initialGastosVarios: GastoVario[] = [];
const initialBudgets: MonthlyBudget[] = [];
const initialAppointments: Appointment[] = [];
const initialRoutines: RoutineLog[] = [];
const initialMedications: Medication[] = [];
const initialBloodPressure: BloodPressureLog[] = [];
const initialDoctors: DoctorCard[] = [];
const initialNotifications: AppNotification[] = [];
const initialOrganizacionSemanal: OrganizacionSemanalItem[] = [];
const initialMedicamentosDetallados: MedicamentoDetallado[] = [];
const initialMercaderia: MercaderiaItem[] = [];
const initialAlimentos: AlimentoItem[] = [];
const initialPlatos: PlatoItem[] = [];
const initialMaterias: MateriaInfo[] = [];
const initialInversiones: Inversion[] = [];
const initialCotizacionesAcciones: CotizacionAccion[] = [];
const initialCotizacionesCripto: any[] = [];

// In-memory Store for database collections (No localStorage for database data)
const inMemoryStore: Record<string, any> = {};
const inMemoryDeletedIds = new Set<string>();

try {
  const saved = localStorage.getItem("deleted_item_ids");
  if (saved) {
    const arr = JSON.parse(saved);
    if (Array.isArray(arr)) {
      arr.forEach((id) => inMemoryDeletedIds.add(String(id)));
    }
  }
} catch (_) {}

function persistDeletedIds() {
  try {
    localStorage.setItem("deleted_item_ids", JSON.stringify(Array.from(inMemoryDeletedIds).slice(0, 500)));
  } catch (_) {}
}

// Deleted IDs helper functions for sync reconciliation
export function getDeletedIds(): Set<string> {
  return new Set(inMemoryDeletedIds);
}

export function addDeletedId(id: string | number): void {
  if (!id) return;
  inMemoryDeletedIds.add(String(id));
  persistDeletedIds();
}

export function addDeletedIds(ids: (string | number)[]): void {
  if (!Array.isArray(ids) || ids.length === 0) return;
  ids.forEach((id) => {
    if (id) inMemoryDeletedIds.add(String(id));
  });
  persistDeletedIds();
}

import { saveCategoryToFirestore, getEffectiveUserId } from "./firestoreSyncService";

// In-Memory Helper functions for database collections
export function getStoredData<T>(key: string, initial: T): T {
  if (inMemoryStore[key] !== undefined) {
    return inMemoryStore[key] as T;
  }
  const data = Array.isArray(initial) ? (initial as any[]).slice() : initial;
  if (Array.isArray(data)) {
    const now = Date.now();
    data.forEach((item: any) => {
      if (item && typeof item === "object" && (!item.updatedAt || typeof item.updatedAt !== "number")) {
        item.updatedAt = now;
      }
    });
  }
  inMemoryStore[key] = data;
  return data as T;
}

let currentSyncUserId = "hernanmaximiliano10@gmail.com";
export function setSyncUserId(userId: string) {
  if (userId && !userId.startsWith("ya29.") && !userId.startsWith("eyJ")) {
    currentSyncUserId = userId;
  }
}

export function setStoredData<T>(key: string, data: T, isRemote = false): void {
  const oldArr = inMemoryStore[key] ? [...inMemoryStore[key]] : [];
  const newArr = Array.isArray(data) ? data : [];

  if (Array.isArray(newArr)) {
    const now = Date.now();
    newArr.forEach((item: any) => {
      if (item && typeof item === "object") {
        if (!item.updatedAt || typeof item.updatedAt !== "number") {
          if (typeof item.updatedAt === "string") {
            const t = new Date(item.updatedAt).getTime();
            item.updatedAt = !isNaN(t) && t > 0 ? t : now;
          } else {
            item.updatedAt = now;
          }
        }
      }
    });

    if (!isRemote && Array.isArray(oldArr)) {
      const newIds = new Set(newArr.map((item: any) => String(item?.id || "")).filter(Boolean));
      const deleted: string[] = [];
      oldArr.forEach((item: any) => {
        const itemId = String(item?.id || "");
        if (itemId && !newIds.has(itemId)) {
          deleted.push(itemId);
        }
      });
      if (deleted.length > 0) {
        addDeletedIds(deleted);
      }
    }
  }
  inMemoryStore[key] = newArr;
}

export function setStoredDataSilent<T>(key: string, data: T): void {
  setStoredData(key, data, true);
}

// Aesthetic Preferences Helper (Local Storage EXCLUSIVE for current device)
export class AestheticStorageService {
  static getThemeColor(): string {
    try {
      return localStorage.getItem("theme_color") || "#8ab4f8";
    } catch {
      return "#8ab4f8";
    }
  }

  static setThemeColor(color: string): void {
    try {
      localStorage.setItem("theme_color", color);
    } catch (e) {
      console.error("Error setting theme_color in localStorage:", e);
    }
  }

  static getBackgroundStyle(): "dither" | "pixelblast" | "plasma" {
    try {
      return (localStorage.getItem("liquid_background_style") as "dither" | "pixelblast" | "plasma") || "dither";
    } catch {
      return "dither";
    }
  }

  static setBackgroundStyle(style: string): void {
    try {
      localStorage.setItem("liquid_background_style", style);
    } catch (e) {
      console.error("Error setting liquid_background_style in localStorage:", e);
    }
  }

  static getDarkMode(): boolean {
    try {
      const val = localStorage.getItem("dark_mode");
      return val !== null ? val === "true" : true;
    } catch {
      return true;
    }
  }

  static setDarkMode(enabled: boolean): void {
    try {
      localStorage.setItem("dark_mode", enabled ? "true" : "false");
    } catch (e) {
      console.error("Error setting dark_mode in localStorage:", e);
    }
  }

  static getMenuVisibility(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem("app_menu_visibility");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      appointments: true,
      finances: true,
      academic: true,
      health: true,
      meals: true,
      ai: true,
    };
  }

  static setMenuVisibility(vis: Record<string, boolean>): void {
    try {
      localStorage.setItem("app_menu_visibility", JSON.stringify(vis));
    } catch (e) {
      console.error("Error setting app_menu_visibility in localStorage:", e);
    }
  }
}

// Complete Storage Interface for App State
export class StorageService {
  static getDeletedIds() { return getDeletedIds(); }
  static addDeletedId(id: string | number) { addDeletedId(id); }
  static addDeletedIds(ids: (string | number)[]) { addDeletedIds(ids); }

  static getSubjects() { return getStoredData("subjects", initialSubjects); }
  static setSubjects(data: AcademicSubject[]) { setStoredData("subjects", data); }

  static getMateriasInfo() { return getStoredData("materias_info", initialMaterias); }
  static setMateriasInfo(data: MateriaInfo[]) { setStoredData("materias_info", data); }

  static getHorarios() { return getStoredData("horarios", [] as HorarioItem[]); }
  static setHorarios(data: HorarioItem[]) { setStoredData("horarios", data); }

  static getTasks() { return getStoredData("tasks", initialTasks); }
  static setTasks(data: AcademicTask[]) { setStoredData("tasks", data); }

  static getNotes() { return getStoredData("notes", initialNotes); }
  static setNotes(data: AcademicNote[]) { setStoredData("notes", data); }

  static getPantry() { return getStoredData("pantry", initialPantry); }
  static setPantry(data: PantryItem[]) { setStoredData("pantry", data); }

  static getMeals() { return getStoredData("meals", initialMeals); }
  static setMeals(data: MealPlan[]) { setStoredData("meals", data); }

  static getShopping() { return getStoredData("shopping", initialShopping); }
  static setShopping(data: ShoppingItem[]) { setStoredData("shopping", data); }

  static getInvoices() { return getStoredData("invoices", initialInvoices); }
  static setInvoices(data: Invoice[]) { setStoredData("invoices", data); }

  static getPayments() { return getStoredData("payments", initialPayments); }
  static setPayments(data: PaymentRecord[]) { setStoredData("payments", data); }

  static getDetailedPayments() { return getStoredData("detailed_payments", []); }
  static setDetailedPayments(data: DetailedPayment[]) { setStoredData("detailed_payments", data); }

  static getGastosVarios() { return getStoredData("gastos_varios", initialGastosVarios); }
  static setGastosVarios(data: GastoVario[]) { setStoredData("gastos_varios", data); }

  static getInversiones() { return getStoredData("inversiones", initialInversiones); }
  static setInversiones(data: Inversion[]) { setStoredData("inversiones", data); }

  static getCotizacionesAcciones() {
    return getStoredData("cotizaciones_acciones", []);
  }
  static setCotizacionesAcciones(data: CotizacionAccion[]) { setStoredData("cotizaciones_acciones", data); }

  static getCotizacionesCripto() {
    return getStoredData("cotizaciones_cripto", []);
  }
  static setCotizacionesCripto(data: any[]) { setStoredData("cotizaciones_cripto", data); }

  static getBudgets() { return getStoredData("budgets", initialBudgets); }
  static setBudgets(data: MonthlyBudget[]) { setStoredData("budgets", data); }

  static getAppointments() { return getStoredData("appointments", initialAppointments); }
  static setAppointments(data: Appointment[]) { setStoredData("appointments", data); }

  static getRoutines() { return getStoredData("routines", initialRoutines); }
  static setRoutines(data: RoutineLog[]) { setStoredData("routines", data); }

  static getMedications() { return getStoredData("medications", initialMedications); }
  static setMedications(data: Medication[]) { setStoredData("medications", data); }

  static getMedicamentosDetallados() { return getStoredData("medicamentos_detallados", initialMedicamentosDetallados); }
  static setMedicamentosDetallados(data: MedicamentoDetallado[]) { setStoredData("medicamentos_detallados", data); }

  static getBloodPressure() { return getStoredData("blood_pressure", initialBloodPressure); }
  static setBloodPressure(data: BloodPressureLog[]) { setStoredData("blood_pressure", data); }

  static getDoctors() { return getStoredData("doctors", initialDoctors); }
  static setDoctors(data: DoctorCard[]) { setStoredData("doctors", data); }

  static getNotifications() { return getStoredData("notifications", initialNotifications); }
  static setNotifications(data: AppNotification[]) { setStoredData("notifications", data); }

  static getMercaderia() {
    return getStoredData("mercaderia", []);
  }
  static setMercaderia(data: MercaderiaItem[]) { setStoredData("mercaderia", data); }

  static getAlimentos() {
    return getStoredData("alimentos", []);
  }
  static setAlimentos(data: AlimentoItem[]) { setStoredData("alimentos", data); }

  static getPlatos() {
    return getStoredData("platos", []);
  }
  static setPlatos(data: PlatoItem[]) { setStoredData("platos", data); }

  static getOrganizacionSemanal() { return getStoredData("organizacion_semanal", initialOrganizacionSemanal); }
  static setOrganizacionSemanal(data: OrganizacionSemanalItem[]) { setStoredData("organizacion_semanal", data); }

  static getTurnosCompromisos() { return getStoredData("turnos_compromisos", []); }
  static setTurnosCompromisos(data: TurnoCompromiso[]) { setStoredData("turnos_compromisos", data); }

  static getDisponibilidadMedicamentos() { return getStoredData("disponibilidad_medicamentos", []); }
  static setDisponibilidadMedicamentos(data: DisponibilidadMedicamento[]) { setStoredData("disponibilidad_medicamentos", data); }


  static getDeportesActividades() { return getStoredData("deportes_actividades", []); }
  static setDeportesActividades(data: any[]) { setStoredData("deportes_actividades", data); }
  static getRutinasGimnasio() { return getStoredData("rutinas_gimnasio", []); }
  static setRutinasGimnasio(data: any[]) { setStoredData("rutinas_gimnasio", data); }
  static getRegistrosEntrenamiento() { return getStoredData("registros_entrenamiento", []); }
  static setRegistrosEntrenamiento(data: any[]) { setStoredData("registros_entrenamiento", data); }
  static getAlimentacionLogs() { return getStoredData("alimentacion_logs", []); }
  static setAlimentacionLogs(data: any[]) { setStoredData("alimentacion_logs", data); }
  static getMedicalRecords() { return getStoredData("medical_records", []); }
  static setMedicalRecords(data: MedicalRecord[]) { setStoredData("medical_records", data); }

  static getExamenes() { return getStoredData("examenes", []); }
  static setExamenes(data: any[]) { setStoredData("examenes", data); }

  // Clear or reset all in-memory database items
  static resetAll() {
    for (const key in inMemoryStore) {
      delete inMemoryStore[key];
    }
    inMemoryDeletedIds.clear();
    return true;
  }
}
