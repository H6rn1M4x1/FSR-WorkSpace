export interface AcademicSubject {
  id: string;
  name: string;
  professor?: string;
  classroom?: string;
  schedule: string; // e.g., "Lunes y Miércoles 10:00 - 12:00"
  color: string;
}

export interface AcademicTask {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  type: "Examen" | "Trabajo" | "Tarea" | "Otro" | string;
  grade?: number;
  completed: boolean;
}

export interface AcademicNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string; // e.g., "g", "ml", "unidades", "paquetes"
  minQuantity: number; // For low stock alerts
  expirationDate?: string;
}

export interface MealPlan {
  id: string; // e.g., "lunes", "martes", etc.
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snack?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

export interface DetailedPayment {
  id: string;
  pago: boolean; // Checkbox
  descripcion: string; // Text
  categoria: "Impuestos" | "Prestamos" | "Telefonia e Internet" | "Servicios Digitales" | "Obra Social" | "Tarjeta de Credito" | "Servicios Esenciales";
  fechaVencimiento: string; // Date
  fechaCierre?: string; // Date, conditional
  metodoPago: "Tarjeta de Debito" | "Transferencia Bancaria" | "Debito Automatico";
  montoAPagar: number; // ARS
  pagoRecurrente: boolean; // Checkbox
  facturaEmitida?: string; // File path/identifier
  comprobantePago?: string; // File path/identifier
  conQuePagar: string; // Text
  dondePagar: string; // Text
  observaciones?: string;
}

export interface GastoVario {
  id: string;
  descripcion: string; // Texto
  categoria: string; // Texto
  fecha: string; // YYYY-MM-DD
  metodo: string; // Texto, tarjeta o método del que proviene el gasto
  monto: number; // Número
}

export interface Invoice {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  paid: boolean;
}

export interface PaymentRecord {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
}

export interface MonthlyBudget {
  id: string;
  category: string;
  limit: number;
  spent: number;
}

export interface Inversion {
  id: string;
  lugar: string;
  operacion: string;
  ticker: string;
  fecha: string;
  cantidad: number;
  valorUnitarioPesos: string;
  valorTotalPesos: string;
  estado: string;
  valorUnitarioDolares: string;
  valorTotalDolares: string;
  nombreAccion?: string;
  ratio?: string;
  valorUnitarioActualPesos?: string;
  valorTotalActualPesos?: string;
  variacionDiariaPesos?: string;
  cotizacionDolaresRatio?: string;
  variacionDiariaDolares?: string;
  diferenciaVariacion?: string;
  gananciasAcumuladasPesos?: string;
  gananciasAcumuladasDolares?: string;
  resultado?: string;
}

export interface CotizacionAccion {
  id: string;
  simbolo: string;
  descripcion: string;
  panel: string;
  moneda?: string;
  ultimoPrecio: string;
  variacion: number;
  variacionTexto: string;
  apertura: string;
  minimo: string;
  maximo: string;
  ultimoCierre: string;
  montoOperado?: string;
  fechaActualizacion?: string;
}

export interface CotizacionCripto {
  id: string;
  name: string;
  price: string;
  percent1h: number;
  percent24h: number;
  percent7d: number;
  marketCap: string;
  volume24h: string;
  circulatingSupply: string;
  sentiment: string;
  chart7d?: string;
  image?: string;
  symbol?: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  notes?: string;
  doctorName?: string;
  specialty?: string;
}

export interface RoutineLog {
  id: string;
  title: string;
  frequency: "Diario" | "Semanal" | "Mensual";
  completedDates: string[]; // ISO Dates "YYYY-MM-DD"
  streak: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g., "Cada 8 horas"
  time: string; // e.g., "08:00, 16:00, 00:00"
  takenToday: boolean;
  history: { [date: string]: boolean };
}

export interface BloodPressureLog {
  id: string;
  date: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  notes?: string;
  patient?: "Hernan" | "Modesto" | "Jessica" | "Gladys";
  temperature?: number;
  oxygen?: number;
}

export interface DoctorCard {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface MedicalRecord {
  id: string;
  patient: "Hernan" | "Modesto" | "Jessica" | "Gladys";
  info: string;
  type: "Internacion" | "Cirugia" | "Radioterapia" | "Estudio y/o Analisis";
  location: "Sanatorio San Juan" | "CIMAC" | "Pilar del Oeste";
  doctorId: string; // Doctor ID or doctor name
  fileName?: string;
  fileData?: string; // Base64 or object URL or placeholder
  studyDate: string;
  entryDate?: string;
  exitDate?: string;
  daysCount?: number;
  report: string;
}

export interface WorkspaceSyncConfig {
  driveConnected: boolean;
  sheetsConnected: boolean;
  calendarConnected: boolean;
  gmailConnected: boolean;
  lastSynced?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: "academic" | "meal" | "finance" | "turno" | "health" | "sync" | "appointment" | "medication";
  location?: string;
  lat?: number;
  lon?: number;
  files?: { name: string; url: string; type?: string }[];
  contactName?: string;
  contactPhone?: string;
  amount?: number;
  currency?: string;
  dueDate?: string;
  statusLabel?: string;
  notes?: string;
  actionTab?: string;
  actionSubTab?: string;
  mealId?: string;
  mealImage?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export interface ValoresNutricionales {
  grasas: number;
  proteinas: number;
  carbohidratos: number;
  azucares: number;
  fibra: number;
  sodio: number;
}

export interface MercaderiaItem {
  id: string;
  ingredientes: string;
  categoria: string;
  sector: string;
  comercio: string;
  unidadMedida: string;
  precio?: number;
  calorias?: number;
  valoresNutricionales?: ValoresNutricionales;
}

export interface AlimentoItem {
  id: string;
  mercaderiaName: string;
  ingrediente1?: string;
  cantidad1?: number;
  unidad1?: string;
  ingrediente2?: string;
  cantidad2?: number;
  unidad2?: string;
  ingrediente3?: string;
  cantidad3?: number;
  unidad3?: string;
  calorias?: number;
  valoresNutricionales?: ValoresNutricionales;
}

export interface PlatoItem {
  id: string;
  nombrePlato: string;
  descripcion?: string;
  alimentoId1?: string;
  alimentoId2?: string;
  alimentoId3?: string;
  calorias?: number;
  imagen?: string;
  ingredientesPersonalizados?: string[];
}

export interface OrganizacionSemanalItem {
  id: string;
  fecha: string; // YYYY-MM-DD
  platoId: string;
}

export interface TurnoCompromiso {
  id: string;
  estatus: boolean;
  descripcion: string;
  categoria: "Compromisos" | "Turno - Hernan" | "Turno - Modesto" | "Tramites" | "Medicacion" | "Ocio";
  fecha: string;
  lugar: string;
  estudioInformeDoc?: string;
  pedidoDocumento?: string;
  doctor?: string;
  lat?: number;
  lon?: number;
  medicalRecordId?: string;
  informacionPersonalizada?: string;
  archivosNecesarios?: {name: string, url: string}[];
  transcripcionAutomatica?: string;
}

export interface MedicamentoDetallado {
  id: string;
  marca: string;
  droga: string;
  mg: number;
  unidadMedida: "Comprimidos" | "Capsulas";
  consumoDiario: number;
  cantidad: number;
  imagen?: string; // Base64 representation of uploaded image
  estado: "Sin Determinacion de Consumo" | "Consumiendo" | "Dejo de Consumir";
  funcionTratamiento?: string;
  fechaInicio?: string;
}

export interface DisponibilidadMedicamento {
  id: string;
  receta: boolean;
  medicamentoId: string;
  fechaRegistro: string;
  cantidadRegistrada: number;
}

export interface DeporteActividad {
  id: string;
  fechaDesde: string;
  fechaHasta: string;
  informacion: string;
  calorias: number;
  pasos: number;
  distancia: number;
  tiempoMovimiento: string; // e.g., "1h 30m"
  frecuencia: string; // e.g., "5:30 min/km"
  puntos: number;
}

export type GrupoMuscular = "Espalda" | "Bíceps" | "Tríceps" | "Pecho" | "Hombros" | "Piernas" | "Abdomen";

export interface EjercicioRutina {
  id: string;
  nombre: string; // Nombre del ejercicio en español
  grupoMuscular: GrupoMuscular;
  gifUrl?: string; // GIF animado o video demostración técnica
  seriesObjetivo?: number;
  repeticionesObjetivo?: number;
  pesoObjetivoKg?: number;
  notasTecnica?: string;
  equipamiento?: string;
  dificultad?: string;
}

export interface RutinaGimnasio {
  id: string;
  nombre: string;
  descripcion?: string;
  grupoMuscularPrincipal: GrupoMuscular;
  gruposMuscularesSecundarios?: GrupoMuscular[];
  ejercicios: EjercicioRutina[];
  duracionEstimadaMin?: number;
  fechaCreacion?: string;
  ultimaEdicion?: string;
}

export interface SetRegistro {
  setNumero: number;
  repeticiones: number;
  pesoKg: number;
  rpe?: number;
  completado?: boolean;
}

export interface EjercicioRegistroLog {
  ejercicioId: string;
  ejercicioNombre: string;
  grupoMuscular: GrupoMuscular;
  sets: SetRegistro[];
  seriesTotales: number;
  repeticionesTotales: number;
  pesoMaximoKg: number;
  volumenTotalKg: number;
  caloriasQuemadas: number;
}

export interface RegistroEntrenamiento {
  id: string;
  rutinaId?: string;
  rutinaNombre: string;
  fecha: string;
  duracionMinutos?: number;
  horaInicio?: string;
  horaFin?: string;
  ejerciciosLogs: EjercicioRegistroLog[];
  volumenTotalSesionKg: number;
  caloriasTotalesSesion: number;
  notas?: string;
  sensacionGral?: "Excelente" | "Bueno" | "Normal" | "Exigente" | "Agotador";
}

export interface AlimentacionLog {
  id: string;
  fecha: string;
  estado: "Desayuno" | "Almuerzo" | "Merienda" | "Cena";
  platoId: string;
  cantidad?: number;
  ingredientesConsumidos?: { ingrediente: string; cantidad: number; unidad: string; calorias: number }[];
  calorias: number; // Calculated
  valoresNutricionales?: ValoresNutricionales;
}

export interface HorarioItem {
  id: string;
  dia: "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado" | "Domingo" | string;
  horaInicio: string;
  horaFin: string;
  materia: string;
  aulas: string;
  profesores: string;
  comision?: string;
  modalidad?: string;
}

export interface ExamenItem {
  id: string;
  materia: string;
  fecha: string;
  estado: string; // Parcial, Recuperatorio, Extraordinario, Examen Final
  instancia?: string; // Primero, Segundo, Tercero, Primero/Segundo
  aula: string;
  hora?: string;
  nota?: number;
  contenidos?: string;
}

export interface MateriaInfo {
  id: string;
  estado: "Aprobado" | "Regularizado" | "Sin empezar";
  materia: string;
  anoCursado: string;
  cuatrimestre: string;
  cursadoDebil: string;
  cursadoFuerte: string;
  rendirFuerte: string;
  fechaRegularidad?: string;
  fechaVencimiento?: string;
  fechaAprobado?: string;
}

export interface AgendaShare {
  id?: string;
  fromEmail: string;
  toEmail: string;
  categories: {
    turnos: boolean;
    finanzas: boolean;
    comidas: boolean;
    salud: boolean;
  };
  sharedTurnoCompromisoIds?: string[];
  sharedAppointmentIds?: string[];
  sharedInvoiceIds?: string[];
  sharedDetailedPaymentIds?: string[];
  sharedOrganizacionSemanalIds?: string[];
  sharedDisponibilidadMedicamentoIds?: string[];
  agendaData: {
    appointments?: Appointment[];
    turnosCompromisos?: TurnoCompromiso[];
    invoices?: Invoice[];
    detailedPayments?: DetailedPayment[];
    organizacionSemanal?: OrganizacionSemanalItem[];
    platos?: PlatoItem[];
    disponibilidadMedicamentos?: DisponibilidadMedicamento[];
    medicamentosDetallados?: MedicamentoDetallado[];
  };
  updatedAt: string;
}

// --- Password Vault (client-side end-to-end encrypted) ---
// Every field here is either non-sensitive metadata or an opaque ciphertext.
// The server/Firestore NEVER sees a plaintext site password, master password,
// recovery phrase, or derived encryption key — see src/lib/vaultCrypto.ts.

/** An AES-GCM encrypted blob: base64 IV + base64 ciphertext. */
export interface EncryptedBlob {
  iv: string;
  data: string;
}

/** A password-derived (or recovery-phrase-derived) key wrapping the vault's master key. */
export interface WrappedKey extends EncryptedBlob {
  salt: string;
  iterations: number;
}

/** Per-user vault configuration document (id === user email). Contains no plaintext secrets. */
export interface VaultConfig {
  id: string;
  /** Master encryption key, wrapped (encrypted) with a key derived from the master password. */
  wrappedByPassword: WrappedKey;
  /** Same master encryption key, wrapped with a key derived from the recovery phrase. */
  wrappedByRecovery: WrappedKey;
  /** Whether revealing/copying a stored password additionally requires a live 2FA code. */
  requireTotpToReveal: boolean;
  createdAt: number;
  updatedAt: number;
}

/** One vault entry as stored remotely: fully opaque except for bookkeeping timestamps. */
export interface VaultItemEncrypted extends EncryptedBlob {
  id: string;
  createdAt: number;
  updatedAt: number;
}

/** One vault entry once decrypted client-side for display/editing. */
export interface VaultItemDecrypted {
  id: string;
  site: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// --- Notes (Google Keep-style perpetual sticky notes) ---
export interface StickyNote {
  id: string;
  title?: string;
  text: string; // rich HTML content (see RichTextEditor)
  color: string; // key into the NOTE_COLORS palette (see NotesView.tsx)
  pinned: boolean;
  /** Manual display order (lower = shown first). Only meaningful for notes you own — see useNotes.ts. */
  order?: number;
  attachments?: { name: string; url: string }[];
  createdAt: number;
  updatedAt: number;
  // Present only on a note read via a share (never persisted) — who shared it in.
  __sharedByEmail?: string;
  __sharedByName?: string;
}

// --- Events (San Juan local agenda + followed sports calendars) ---

/** One event scraped from the San Juan local events site (yendly.com), refreshed ~monthly. */
export interface SanJuanEvent {
  id: string;
  title: string;
  date: string; // ISO date (YYYY-MM-DD) when known, else best-effort raw text
  rawDate?: string; // original text from the site, kept for display if parsing was uncertain
  location?: string;
  imageUrl?: string;
  sourceUrl?: string;
}

/** A sport the user can choose to follow (fixed catalog, see lib/sportsCatalog.ts). */
export interface SportCatalogEntry {
  id: string; // e.g. "f1", "tenis", "futbol", "nba", "wwe", "motogp", "ufc", "nfl"
  label: string;
  hasTeams: boolean; // true for team/league sports (fetch teams+badges from TheSportsDB)
  sportsDbSport: string; // the "strSport" value TheSportsDB uses to resolve its league id
  leagueQuery: string; // substring used to find the right league by name
  country?: string; // narrows the league search to one country (e.g. "Argentina" for fútbol)
}

/** A team/driver/league the user picked to follow within a sport they're subscribed to. */
export interface FollowedTeam {
  id: string; // TheSportsDB idTeam (or a slug for sports without teams)
  name: string;
  badgeUrl?: string;
}

/** Per-user event preferences: which sports/teams to show in the events calendar. */
export interface EventPreferences {
  followedSports: string[]; // SportCatalogEntry ids
  followedTeams: Record<string, FollowedTeam[]>; // sportId -> teams followed within it
  updatedAt: number;
}

/** One upcoming sports event, normalized from TheSportsDB, for a followed sport/team. */
export interface SportEvent {
  id: string;
  sportId: string;
  leagueName: string;
  title: string; // e.g. "Boca Juniors vs River Plate" or "Gran Premio de Mónaco"
  date: string; // ISO date (YYYY-MM-DD)
  time?: string; // HH:MM, when known
  homeTeamBadge?: string;
  awayTeamBadge?: string;
  venue?: string;
}


