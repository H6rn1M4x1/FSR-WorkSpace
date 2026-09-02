import React, { useState, useEffect, useRef } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useToast } from "../context/ToastContext";
import { processAndCreateRecurringPayments } from "../utils/recurringPayments";
import { getLocalDateString } from "../utils/date";
import { createPortal } from "react-dom";
import { TEAMS } from "../data/teams";
import { FavoriteTeamWidget } from "./FavoriteTeamWidget";
import { WeatherWidget } from "./WeatherWidget";
import { MultiTeamMatchWidget } from "./MultiTeamMatchWidget";
import { PillFilterBar } from "./PillFilterBar";
import { getMatchTeamLogos, syncMonthlyMatches } from "../lib/matchScheduler";
import { motion, AnimatePresence } from "motion/react";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  DollarSign,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Stethoscope,
  Info,
  Check,
  ChevronDown,
  X,
  RefreshCw,
  Share2,
  Users,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  ChevronUp,
  Sun,
  Cloud,
  Activity,
  GraduationCap,
  BookOpen,
  FileText,
  FileDown,
  Receipt,
  CreditCard,
  Bell,
  BellRing,
  BellOff,
  Shield,
  AudioLines,
} from "lucide-react";
import { AudioTranscriptionPlayer } from "./AudioTranscriptionPlayer";
import {
  requestNotificationPermission,
  getNotificationPermission,
  evaluateAndNotifyTodayAgenda,
  showAgendaNotification,
  formatAgendaItemNotification,
} from "../services/notificationService";
import {
  Appointment,
  TurnoCompromiso,
  Invoice,
  DetailedPayment,
  OrganizacionSemanalItem,
  PlatoItem,
  DisponibilidadMedicamento,
  MedicamentoDetallado,
  AgendaShare,
  AcademicNote,
  HorarioItem,
  ExamenItem,
  AcademicTask,
  AcademicSubject,
  MateriaInfo,
} from "../types";
import { StorageService } from "../lib/storage";
import { createShare, updateShare, deleteShare } from "../lib/sharing";
import AnimatedList from "./AnimatedList";
import { getTurnoCategoryIcon } from "./AppointmentsView";

interface HomeViewProps {
  darkMode: boolean;
  user: any;
  userProfile?: any;
  outgoingShares: AgendaShare[];
  incomingShares: AgendaShare[];
  notes?: AcademicNote[];
  // Finanzas
  invoices: Invoice[];
  detailedPayments: DetailedPayment[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setDetailedPayments: React.Dispatch<React.SetStateAction<DetailedPayment[]>>;
  // Turnos
  appointments: Appointment[];
  turnosCompromisos: TurnoCompromiso[];
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
  setTurnosCompromisos: React.Dispatch<React.SetStateAction<TurnoCompromiso[]>>;
  // Comidas
  organizacionSemanal: OrganizacionSemanalItem[];
  setOrganizacionSemanal: React.Dispatch<
    React.SetStateAction<OrganizacionSemanalItem[]>
  >;
  platos: PlatoItem[];
  token: string | null;
  setToken: (token: string | null) => void;
  // Salud
  disponibilidadMedicamentos?: DisponibilidadMedicamento[];
  medicamentosDetallados?: MedicamentoDetallado[];
  // Académico
  horarios?: HorarioItem[];
  examenes?: ExamenItem[];
  tasks?: AcademicTask[];
  setTasks?: React.Dispatch<React.SetStateAction<AcademicTask[]>>;
  subjects?: AcademicSubject[];
  materiasInfo?: MateriaInfo[];
}

export default function HomeView({
  darkMode,
  user,
  userProfile,
  outgoingShares = [],
  incomingShares = [],
  notes = [],
  invoices,
  detailedPayments,
  setInvoices,
  setDetailedPayments,
  appointments,
  turnosCompromisos,
  setAppointments,
  setTurnosCompromisos,
  organizacionSemanal,
  setOrganizacionSemanal,
  platos,
  token,
  setToken,
  disponibilidadMedicamentos = [],
  medicamentosDetallados = [],
  horarios = [],
  examenes = [],
  tasks = [],
  setTasks,
  subjects = [],
  materiasInfo = [],
}: HomeViewProps) {
  const { showToast } = useToast();

  // Opens a stored file safely: plain http(s) links open directly, but base64 data:
  // URLs often show a blank tab if opened via a normal link — this converts them to a
  // proper downloadable Blob first (same fix already applied in Finanzas).
  const openStoredFile = async (url: string, filename: string) => {
    if (!url.startsWith("data:")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = filename || "archivo";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      showToast("No se pudo abrir el archivo.", "error");
    }
  };

  // Calendar dates
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(
    () => new Date(),
  );
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    string | null
  >(() => {
    // Default to today
    const local = new Date();
    const offset = local.getTimezoneOffset();
    const withOffset = new Date(local.getTime() - offset * 60 * 1000);
    return withOffset.toISOString().split("T")[0];
  });

  // State for selected note details modal
  const [expandedHomeItemId, setExpandedHomeItemId] = useState<string | null>(null);
  const [homeAgendaFilter, setHomeAgendaFilter] = useState<"todos" | "turnos" | "facturas" | "salud" | "comidas" | "academico">("todos");
  const [activeDetailItem, setActiveDetailItem] = useState<{
    type: "meal" | "appointment" | "turno" | "invoice" | "detailedPayment" | "medication";
    data: any;
  } | null>(null);

  // Raw foods / Alimentos for recipe detail mapping
  const [alimentos, setAlimentos] = useState<any[]>([]);
  const [confirmUnshareId, setConfirmUnshareId] = useState<string | null>(null);

  useEffect(() => {
    const refreshAlimentos = () => {
      try {
        const storedAlimentos = StorageService.getAlimentos();
        setAlimentos(storedAlimentos || []);
      } catch (e) {
        console.error("Error loading alimentos for HomeView:", e);
      }
    };
    refreshAlimentos();
    window.addEventListener("storage", refreshAlimentos);
    return () => window.removeEventListener("storage", refreshAlimentos);
  }, [platos, organizacionSemanal]);

  // NOTE: invoices, detailed_payments, appointments, turnos_compromisos and
  // organizacion_semanal used to have their own duplicate real-time Firestore
  // subscription here. They already arrive as live props from App.tsx's single
  // central subscription, so the extra listener here was removed.

  // Automatic recurring payments check (triggers 1 day before month end or later)
  useEffect(() => {
    if (detailedPayments && detailedPayments.length > 0) {
      const userId = user?.email || userProfile?.email || "hernanmaximiliano10@gmail.com";
      processAndCreateRecurringPayments(detailedPayments, userId).then(
        ({ newPaymentsCreated }) => {
          if (newPaymentsCreated.length > 0) {
            setDetailedPayments?.((prev) => {
              const newIds = new Set(newPaymentsCreated.map((np) => np.id));
              const filteredPrev = prev.filter((p) => !newIds.has(p.id));
              return [...newPaymentsCreated, ...filteredPrev];
            });
          }
        },
      );
    }
  }, [detailedPayments?.length, user?.email, userProfile?.email]);

  useEffect(() => {
    const handleOpenShare = (e: any) => {
      if (e.detail && e.detail.itemType && e.detail.itemData) {
        setContextMenu({
          x: window.innerWidth / 2 - 100,
          y: window.innerHeight / 2 - 100,
          itemType: e.detail.itemType,
          data: e.detail.itemData
        });
      }
    };
    window.addEventListener('open-share-modal', handleOpenShare);
    return () => window.removeEventListener('open-share-modal', handleOpenShare);
  }, []);

  // Sharing states
  const [showMySharePanel, setShowMySharePanel] = useState(false);
  const [showSharedWithMe, setShowSharedWithMe] = useState(false);
  const [shareEmailInput, setShareEmailInput] = useState("");
  const [shareCategories, setShareCategories] = useState({
    turnos: true,
    finanzas: true,
    comidas: true,
    salud: true,
  });
  const [selectedTurnoCompromisoIds, setSelectedTurnoCompromisoIds] = useState<
    string[]
  >([]);
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<
    string[]
  >([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectedDetailedPaymentIds, setSelectedDetailedPaymentIds] = useState<
    string[]
  >([]);
  const [selectedOrganizacionSemanalIds, setSelectedOrganizacionSemanalIds] =
    useState<string[]>([]);
  const [
    selectedDisponibilidadMedicamentoIds,
    setSelectedDisponibilidadMedicamentoIds,
  ] = useState<string[]>([]);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<string>(() => getNotificationPermission());
  const [notifSuccessMsg, setNotifSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setNotifPerm(getNotificationPermission());
  }, []);

  const handleRequestNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      const isToday = selectedDateStr === getLocalDateString();
      if (isToday && agendaListItems.length > 0) {
        const res = await evaluateAndNotifyTodayAgenda(agendaListItems, true, true);
        setNotifSuccessMsg(`¡Notificaciones Push activadas! Se enviaron ${res.count} avisos para hoy.`);
      } else {
        await showAgendaNotification({
          title: "Agenda Central Integrada",
          body: "¡Notificaciones activadas! Te avisaremos de tus turnos, tareas y eventos pendientes de hoy.",
          category: "turnos",
          tag: "test-notif-initial",
        });
        setNotifSuccessMsg("¡Notificaciones Push activadas con éxito!");
      }
      setTimeout(() => setNotifSuccessMsg(null), 5000);
    }
  };

  const handleTestTodayNotifications = async () => {
    if (agendaListItems.length === 0) {
      await showAgendaNotification({
        title: "Agenda Central Integrada",
        body: "No tienes actividades pendientes para hoy. ¡Todo al día!",
        category: "turnos",
        tag: `test-${Date.now()}`,
      });
      setNotifSuccessMsg("Aviso de prueba enviado a tu móvil.");
    } else {
      let sentCount = 0;
      const sentTitles: string[] = [];
      for (const item of agendaListItems) {
        const payload = formatAgendaItemNotification(item);
        if (payload) {
          // Ensure unique tag for manual test so mobile doesn't collapse or skip
          payload.tag = `${payload.tag}-test-${Date.now()}`;
          const ok = await showAgendaNotification(payload);
          if (ok) {
            sentCount++;
            sentTitles.push(payload.title);
          }
        }
      }
      if (sentCount > 0) {
        setNotifSuccessMsg(`Se enviaron ${sentCount} avisos: ${sentTitles.slice(0, 2).join(", ")}${sentTitles.length > 2 ? "..." : ""}`);
      } else {
        setNotifSuccessMsg("Asegúrate de permitir las notificaciones en la app instalada.");
      }
    }
    setTimeout(() => setNotifSuccessMsg(null), 6000);
  };

  const handleScheduleMatches = async () => {
    const favTeam = userProfile?.favoriteTeam || "Boca Juniors";
    const { addedCount } = await syncMonthlyMatches(
      favTeam,
      turnosCompromisos,
      setTurnosCompromisos,
      true
    );
    showToast(
      `¡Partidos de ${favTeam} agendados con éxito (${addedCount} partidos) en Agenda Central Integrada y Calendario Unificado (Categoría: Ocio)!`,
      "success"
    );
  };
  const [selectedIncomingShareId, setSelectedIncomingShareId] = useState<
    string | null
  >(null);

  // Right-click context menu and sharing modal states
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemType:
      | "appointment"
      | "turno"
      | "invoice"
      | "detailedPayment"
      | "meal"
      | "medication";
    data: any;
  } | null>(null);

  const [sharingModalOpen, setSharingModalOpen] = useState(false);

  useLockBodyScroll(
    Boolean(sharingModalOpen || activeDetailItem)
  );
  const [sharingModalItem, setSharingModalItem] = useState<{
    type:
      | "appointment"
      | "turno"
      | "invoice"
      | "detailedPayment"
      | "meal"
      | "medication";
    data: any;
  } | null>(null);

  const [customShareEmail, setCustomShareEmail] = useState("");
  const [specificShareMode, setSpecificShareMode] = useState<"only" | "append">(
    "append",
  );

  const handleEventContextMenu = (
    e: React.MouseEvent,
    itemType:
      | "appointment"
      | "turno"
      | "invoice"
      | "detailedPayment"
      | "meal"
      | "medication",
    data: any,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent menu overflowing offscreen
    const menuWidth = 240;
    const menuHeight = 260;
    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    setContextMenu({
      x,
      y,
      itemType,
      data,
    });
  };

  // Set default selected incoming share if empty and incoming shares are present
  useEffect(() => {
    if (incomingShares.length > 0 && !selectedIncomingShareId) {
      setSelectedIncomingShareId(incomingShares[0].id || null);
    }
  }, [incomingShares, selectedIncomingShareId]);

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareError(null);
    setShareSuccess(null);

    const email = shareEmailInput.trim().toLowerCase();
    if (!email) {
      setShareError("Por favor, introduce un correo electrónico.");
      return;
    }

    if (!user || !user.email) {
      setShareError("Debes iniciar sesión para compartir tu agenda.");
      return;
    }

    if (email === user.email.toLowerCase()) {
      setShareError("No puedes compartir tu agenda contigo mismo.");
      return;
    }

    const alreadyShared = outgoingShares.some(
      (s) => s.toEmail.toLowerCase() === email,
    );
    if (alreadyShared) {
      setShareError("Ya estás compartiendo tu agenda con este usuario.");
      return;
    }

    try {
      const filteredData: any = {};
      if (shareCategories.turnos) {
        filteredData.appointments = appointments.filter((a) =>
          selectedAppointmentIds.includes(a.id),
        );
        filteredData.turnosCompromisos = turnosCompromisos.filter((t) =>
          selectedTurnoCompromisoIds.includes(t.id),
        );
      }
      if (shareCategories.finanzas) {
        filteredData.invoices = invoices.filter((i) =>
          selectedInvoiceIds.includes(i.id),
        );
        filteredData.detailedPayments = detailedPayments.filter((d) =>
          selectedDetailedPaymentIds.includes(d.id),
        );
      }
      if (shareCategories.comidas) {
        filteredData.organizacionSemanal = organizacionSemanal.filter((o) =>
          selectedOrganizacionSemanalIds.includes(o.id),
        );
        filteredData.platos = platos;
      }
      if (shareCategories.salud) {
        filteredData.disponibilidadMedicamentos = (
          disponibilidadMedicamentos || []
        ).filter((d) => selectedDisponibilidadMedicamentoIds.includes(d.id));
        filteredData.medicamentosDetallados = medicamentosDetallados;
      }

      const idsPayload = {
        sharedTurnoCompromisoIds: selectedTurnoCompromisoIds,
        sharedAppointmentIds: selectedAppointmentIds,
        sharedInvoiceIds: selectedInvoiceIds,
        sharedDetailedPaymentIds: selectedDetailedPaymentIds,
        sharedOrganizacionSemanalIds: selectedOrganizacionSemanalIds,
        sharedDisponibilidadMedicamentoIds:
          selectedDisponibilidadMedicamentoIds,
      };

      await createShare(
        user.email,
        email,
        shareCategories,
        filteredData,
        idsPayload,
      );
      setShareSuccess(`¡Agenda compartida con ${email}!`);
      setShareEmailInput("");
      setSelectedTurnoCompromisoIds([]);
      setSelectedAppointmentIds([]);
      setSelectedInvoiceIds([]);
      setSelectedDetailedPaymentIds([]);
      setSelectedOrganizacionSemanalIds([]);
      setSelectedDisponibilidadMedicamentoIds([]);
    } catch (err: any) {
      setShareError("Error al compartir: " + err.message);
    }
  };

  const handleUpdateShareCategory = async (
    share: AgendaShare,
    category: keyof AgendaShare["categories"],
  ) => {
    const updatedCategories = {
      ...share.categories,
      [category]: !share.categories[category],
    };

    const idsPayload = {
      sharedTurnoCompromisoIds: share.sharedTurnoCompromisoIds || [],
      sharedAppointmentIds: share.sharedAppointmentIds || [],
      sharedInvoiceIds: share.sharedInvoiceIds || [],
      sharedDetailedPaymentIds: share.sharedDetailedPaymentIds || [],
      sharedOrganizacionSemanalIds: share.sharedOrganizacionSemanalIds || [],
      sharedDisponibilidadMedicamentoIds:
        share.sharedDisponibilidadMedicamentoIds || [],
    };

    const filteredData: any = {
      platos: platos,
      medicamentosDetallados: medicamentosDetallados,
    };

    if (updatedCategories.turnos) {
      filteredData.appointments = appointments.filter((a) =>
        idsPayload.sharedAppointmentIds.includes(a.id),
      );
      filteredData.turnosCompromisos = turnosCompromisos.filter((t) =>
        idsPayload.sharedTurnoCompromisoIds.includes(t.id),
      );
    }
    if (updatedCategories.finanzas) {
      filteredData.invoices = invoices.filter((i) =>
        idsPayload.sharedInvoiceIds.includes(i.id),
      );
      filteredData.detailedPayments = detailedPayments.filter((d) =>
        idsPayload.sharedDetailedPaymentIds.includes(d.id),
      );
    }
    if (updatedCategories.comidas) {
      filteredData.organizacionSemanal = organizacionSemanal.filter((o) =>
        idsPayload.sharedOrganizacionSemanalIds.includes(o.id),
      );
    }
    if (updatedCategories.salud) {
      filteredData.disponibilidadMedicamentos = (
        disponibilidadMedicamentos || []
      ).filter((d) =>
        idsPayload.sharedDisponibilidadMedicamentoIds.includes(d.id),
      );
    }

    try {
      await updateShare(share.id!, updatedCategories, filteredData, idsPayload);
    } catch (err: any) {
      console.error("Error updating share categories:", err);
    }
  };

  const handleToggleItemOnExistingShare = async (
    share: AgendaShare,
    itemType:
      | "turno"
      | "appointment"
      | "invoice"
      | "detailedPayment"
      | "organizacionSemanal"
      | "disponibilidadMedicamento",
    itemId: string,
  ) => {
    const idsPayload = {
      sharedTurnoCompromisoIds: share.sharedTurnoCompromisoIds || [],
      sharedAppointmentIds: share.sharedAppointmentIds || [],
      sharedInvoiceIds: share.sharedInvoiceIds || [],
      sharedDetailedPaymentIds: share.sharedDetailedPaymentIds || [],
      sharedOrganizacionSemanalIds: share.sharedOrganizacionSemanalIds || [],
      sharedDisponibilidadMedicamentoIds:
        share.sharedDisponibilidadMedicamentoIds || [],
    };

    let key: keyof typeof idsPayload;
    if (itemType === "turno") key = "sharedTurnoCompromisoIds";
    else if (itemType === "appointment") key = "sharedAppointmentIds";
    else if (itemType === "invoice") key = "sharedInvoiceIds";
    else if (itemType === "detailedPayment") key = "sharedDetailedPaymentIds";
    else if (itemType === "organizacionSemanal")
      key = "sharedOrganizacionSemanalIds";
    else key = "sharedDisponibilidadMedicamentoIds";

    const existingIds = idsPayload[key] || [];
    const updatedIds = existingIds.includes(itemId)
      ? existingIds.filter((id) => id !== itemId)
      : [...existingIds, itemId];

    const updatedIdsPayload = {
      ...idsPayload,
      [key]: updatedIds,
    };

    const updatedAgendaData = {
      ...share.agendaData,
      appointments: appointments.filter((a) =>
        updatedIdsPayload.sharedAppointmentIds.includes(a.id),
      ),
      turnosCompromisos: turnosCompromisos.filter((t) =>
        updatedIdsPayload.sharedTurnoCompromisoIds.includes(t.id),
      ),
      invoices: invoices.filter((i) =>
        updatedIdsPayload.sharedInvoiceIds.includes(i.id),
      ),
      detailedPayments: detailedPayments.filter((d) =>
        updatedIdsPayload.sharedDetailedPaymentIds.includes(d.id),
      ),
      organizacionSemanal: organizacionSemanal.filter((o) =>
        updatedIdsPayload.sharedOrganizacionSemanalIds.includes(o.id),
      ),
      disponibilidadMedicamentos: (disponibilidadMedicamentos || []).filter(
        (d) =>
          updatedIdsPayload.sharedDisponibilidadMedicamentoIds.includes(d.id),
      ),
      platos: platos,
      medicamentosDetallados: medicamentosDetallados,
    };

    try {
      await updateShare(
        share.id!,
        share.categories,
        updatedAgendaData,
        updatedIdsPayload,
      );
    } catch (err) {
      console.error("Error toggling item on share:", err);
    }
  };

  const handleUnshare = async (shareId: string) => {
    setConfirmUnshareId(shareId);
  };

  const executeUnshare = async (shareId: string) => {
    try {
      await deleteShare(shareId);
    } catch (err: any) {
      console.error("Error unsharing:", err);
    } finally {
      setConfirmUnshareId(null);
    }
  };

  const handleShareSpecificItem = async (
    targetEmail: string,
    itemType:
      | "appointment"
      | "turno"
      | "invoice"
      | "detailedPayment"
      | "meal"
      | "medication",
    itemData: any,
    mode: "only" | "append",
  ) => {
    if (!user || !user.email) {
      alert("Debes iniciar sesión para compartir tu agenda.");
      return;
    }
    const email = targetEmail.trim().toLowerCase();
    if (email === user.email.toLowerCase()) {
      alert("No puedes compartir tu agenda contigo mismo.");
      return;
    }

    try {
      // Find if we already have an outgoing share with this user
      const existingShare = outgoingShares.find(
        (s) => s.toEmail.toLowerCase() === email,
      );

      // Determine IDs and Categories
      let targetCategories = {
        turnos: false,
        finanzas: false,
        comidas: false,
        salud: false,
      };

      let targetIds = {
        sharedTurnoCompromisoIds: [] as string[],
        sharedAppointmentIds: [] as string[],
        sharedInvoiceIds: [] as string[],
        sharedDetailedPaymentIds: [] as string[],
        sharedOrganizacionSemanalIds: [] as string[],
        sharedDisponibilidadMedicamentoIds: [] as string[],
      };

      if (existingShare && mode === "append") {
        targetCategories = { ...existingShare.categories };
        targetIds = {
          sharedTurnoCompromisoIds: [
            ...(existingShare.sharedTurnoCompromisoIds || []),
          ],
          sharedAppointmentIds: [...(existingShare.sharedAppointmentIds || [])],
          sharedInvoiceIds: [...(existingShare.sharedInvoiceIds || [])],
          sharedDetailedPaymentIds: [
            ...(existingShare.sharedDetailedPaymentIds || []),
          ],
          sharedOrganizacionSemanalIds: [
            ...(existingShare.sharedOrganizacionSemanalIds || []),
          ],
          sharedDisponibilidadMedicamentoIds: [
            ...(existingShare.sharedDisponibilidadMedicamentoIds || []),
          ],
        };
      }

      // Add the specific item
      const itemId = itemType === "medication" ? itemData.disp.id : itemData.id;
      if (itemType === "appointment") {
        targetCategories.turnos = true;
        if (!targetIds.sharedAppointmentIds.includes(itemId)) {
          targetIds.sharedAppointmentIds.push(itemId);
        }
      } else if (itemType === "turno") {
        targetCategories.turnos = true;
        if (!targetIds.sharedTurnoCompromisoIds.includes(itemId)) {
          targetIds.sharedTurnoCompromisoIds.push(itemId);
        }
      } else if (itemType === "invoice") {
        targetCategories.finanzas = true;
        if (!targetIds.sharedInvoiceIds.includes(itemId)) {
          targetIds.sharedInvoiceIds.push(itemId);
        }
      } else if (itemType === "detailedPayment") {
        targetCategories.finanzas = true;
        if (!targetIds.sharedDetailedPaymentIds.includes(itemId)) {
          targetIds.sharedDetailedPaymentIds.push(itemId);
        }
      } else if (itemType === "meal") {
        targetCategories.comidas = true;
        if (!targetIds.sharedOrganizacionSemanalIds.includes(itemId)) {
          targetIds.sharedOrganizacionSemanalIds.push(itemId);
        }
      } else if (itemType === "medication") {
        targetCategories.salud = true;
        if (!targetIds.sharedDisponibilidadMedicamentoIds.includes(itemId)) {
          targetIds.sharedDisponibilidadMedicamentoIds.push(itemId);
        }
      }

      // Build agendaData payload
      const filteredData: any = {
        platos: platos,
        medicamentosDetallados: medicamentosDetallados,
      };

      if (targetCategories.turnos) {
        filteredData.appointments = appointments.filter((a) =>
          targetIds.sharedAppointmentIds.includes(a.id),
        );
        filteredData.turnosCompromisos = turnosCompromisos.filter((t) =>
          targetIds.sharedTurnoCompromisoIds.includes(t.id),
        );
      }
      if (targetCategories.finanzas) {
        filteredData.invoices = invoices.filter((i) =>
          targetIds.sharedInvoiceIds.includes(i.id),
        );
        filteredData.detailedPayments = detailedPayments.filter((d) =>
          targetIds.sharedDetailedPaymentIds.includes(d.id),
        );
      }
      if (targetCategories.comidas) {
        filteredData.organizacionSemanal = organizacionSemanal.filter((o) =>
          targetIds.sharedOrganizacionSemanalIds.includes(o.id),
        );
      }
      if (targetCategories.salud) {
        filteredData.disponibilidadMedicamentos = (
          disponibilidadMedicamentos || []
        ).filter((d) =>
          targetIds.sharedDisponibilidadMedicamentoIds.includes(d.id),
        );
      }

      if (existingShare) {
        await updateShare(
          existingShare.id!,
          targetCategories,
          filteredData,
          targetIds,
        );
      } else {
        await createShare(
          user.email,
          email,
          targetCategories,
          filteredData,
          targetIds,
        );
      }
      setSharingModalOpen(false);
      setSharingModalItem(null);
    } catch (err: any) {
      alert("Error al compartir el evento específico: " + err.message);
    }
  };

  const isItemSharedWith = (
    share: AgendaShare,
    itemType:
      | "appointment"
      | "turno"
      | "invoice"
      | "detailedPayment"
      | "meal"
      | "medication",
    itemData: any,
  ): boolean => {
    const itemId = itemType === "medication" ? itemData.disp.id : itemData.id;
    if (itemType === "appointment") {
      return !!(
        share.categories.turnos && share.sharedAppointmentIds?.includes(itemId)
      );
    }
    if (itemType === "turno") {
      return !!(
        share.categories.turnos &&
        share.sharedTurnoCompromisoIds?.includes(itemId)
      );
    }
    if (itemType === "invoice") {
      return !!(
        share.categories.finanzas && share.sharedInvoiceIds?.includes(itemId)
      );
    }
    if (itemType === "detailedPayment") {
      return !!(
        share.categories.finanzas &&
        share.sharedDetailedPaymentIds?.includes(itemId)
      );
    }
    if (itemType === "meal") {
      return !!(
        share.categories.comidas &&
        share.sharedOrganizacionSemanalIds?.includes(itemId)
      );
    }
    if (itemType === "medication") {
      return !!(
        share.categories.salud &&
        share.sharedDisponibilidadMedicamentoIds?.includes(itemId)
      );
    }
    return false;
  };

  const handleToggleShareForUser = async (
    share: AgendaShare,
    itemType:
      | "appointment"
      | "turno"
      | "invoice"
      | "detailedPayment"
      | "meal"
      | "medication",
    itemData: any,
  ) => {
    let mappedType:
      | "turno"
      | "appointment"
      | "invoice"
      | "detailedPayment"
      | "organizacionSemanal"
      | "disponibilidadMedicamento";
    if (itemType === "meal") mappedType = "organizacionSemanal";
    else if (itemType === "medication")
      mappedType = "disponibilidadMedicamento";
    else mappedType = itemType;

    const itemId = itemType === "medication" ? itemData.disp.id : itemData.id;
    const isShared = isItemSharedWith(share, itemType, itemData);

    const updatedCategories = { ...share.categories };
    if (!isShared) {
      if (itemType === "appointment" || itemType === "turno")
        updatedCategories.turnos = true;
      else if (itemType === "invoice" || itemType === "detailedPayment")
        updatedCategories.finanzas = true;
      else if (itemType === "meal") updatedCategories.comidas = true;
      else if (itemType === "medication") updatedCategories.salud = true;
    }

    const idsPayload = {
      sharedTurnoCompromisoIds: share.sharedTurnoCompromisoIds || [],
      sharedAppointmentIds: share.sharedAppointmentIds || [],
      sharedInvoiceIds: share.sharedInvoiceIds || [],
      sharedDetailedPaymentIds: share.sharedDetailedPaymentIds || [],
      sharedOrganizacionSemanalIds: share.sharedOrganizacionSemanalIds || [],
      sharedDisponibilidadMedicamentoIds:
        share.sharedDisponibilidadMedicamentoIds || [],
    };

    let key: keyof typeof idsPayload;
    if (mappedType === "turno") key = "sharedTurnoCompromisoIds";
    else if (mappedType === "appointment") key = "sharedAppointmentIds";
    else if (mappedType === "invoice") key = "sharedInvoiceIds";
    else if (mappedType === "detailedPayment") key = "sharedDetailedPaymentIds";
    else if (mappedType === "organizacionSemanal")
      key = "sharedOrganizacionSemanalIds";
    else key = "sharedDisponibilidadMedicamentoIds";

    const existingIds = idsPayload[key] || [];
    const updatedIds = existingIds.includes(itemId)
      ? existingIds.filter((id) => id !== itemId)
      : [...existingIds, itemId];

    const updatedIdsPayload = {
      ...idsPayload,
      [key]: updatedIds,
    };

    const updatedAgendaData = {
      ...share.agendaData,
      appointments: appointments.filter((a) =>
        updatedIdsPayload.sharedAppointmentIds.includes(a.id),
      ),
      turnosCompromisos: turnosCompromisos.filter((t) =>
        updatedIdsPayload.sharedTurnoCompromisoIds.includes(t.id),
      ),
      invoices: invoices.filter((i) =>
        updatedIdsPayload.sharedInvoiceIds.includes(i.id),
      ),
      detailedPayments: detailedPayments.filter((d) =>
        updatedIdsPayload.sharedDetailedPaymentIds.includes(d.id),
      ),
      organizacionSemanal: organizacionSemanal.filter((o) =>
        updatedIdsPayload.sharedOrganizacionSemanalIds.includes(o.id),
      ),
      disponibilidadMedicamentos: (disponibilidadMedicamentos || []).filter(
        (d) =>
          updatedIdsPayload.sharedDisponibilidadMedicamentoIds.includes(d.id),
      ),
      platos: platos,
      medicamentosDetallados: medicamentosDetallados,
    };

    try {
      await updateShare(
        share.id!,
        updatedCategories,
        updatedAgendaData,
        updatedIdsPayload,
      );
    } catch (err) {
      console.error("Error toggling share for user:", err);
      alert(
        "Error al actualizar compartido: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  };

  // Google Calendar Sync state
  const [syncStatus, setSyncStatus] = useState<{
    loading: boolean;
    success?: boolean;
    count?: number;
    error?: string | null;
  }>({ loading: false });

  const formatEventsForSync = (evs: any, dateStr: string) => {
    const list: any[] = [];

    // Appointments (Turnos Citas)
    for (const app of evs.appointments) {
      list.push({
        id: `app-${app.id}`,
        title: `Cita Médica: ${app.title}`,
        description: `Médico: ${app.doctorName || "No especificado"} (${app.specialty || "Sin especialidad"})\nNotas: ${app.notes || "Sin notas adicionales."}`,
        location: app.location || "",
        date: dateStr,
        time: app.time || "",
      });
    }

    // Turnos Compromisos
    for (const tc of evs.turnos) {
      list.push({
        id: `tc-${tc.id}`,
        title: `Compromiso: ${tc.descripcion}`,
        description: `Categoría: ${tc.categoria || "General"}\nProfesional/Contacto: ${tc.doctor || "No especificado"}\nEstado: ${tc.estatus ? "Realizado" : "Pendiente"}`,
        location: tc.lugar || "",
        date: dateStr,
      });
    }

    // Invoices
    for (const inv of evs.invoices) {
      list.push({
        id: `inv-${inv.id}`,
        title: `Factura: ${inv.title}`,
        description: `Vencimiento de pago.\nMonto: $${inv.amount.toLocaleString("es-AR")} ARS\nEstado: ${inv.paid ? "Pagado" : "Pendiente de pago"}`,
        date: dateStr,
      });
    }

    // Detailed Payments
    for (const dp of evs.detailedPayments) {
      const isClosing = dp.fechaCierre === dateStr;
      list.push({
        id: `dp-${dp.id}-${isClosing ? "close" : "due"}`,
        title: isClosing
          ? `Cierre Tarjeta: ${dp.descripcion}`
          : `Vencimiento Pago: ${dp.descripcion}`,
        description: isClosing
          ? `Fecha de cierre para la tarjeta/pago: ${dp.descripcion}\nEstado: ${dp.pago ? "Liquidado" : "Pendiente"}`
          : `Fecha de vencimiento para el pago: ${dp.descripcion}\nMonto: $${(dp.montoAPagar || 0).toLocaleString("es-AR")} ARS\nEstado: ${dp.pago ? "Liquidado" : "Pendiente"}`,
        date: dateStr,
      });
    }

    // Meals
    for (const os of evs.meals) {
      const matchedPlato = platos.find((p) => p.id === os.platoId);
      const platoNombre = matchedPlato
        ? matchedPlato.nombrePlato
        : "Comida Desconocida";
      list.push({
        id: `meal-${os.id}`,
        title: `Comida: ${platoNombre}`,
        description: `Plato planeado: ${platoNombre}\nCategoría: Comidas\nNotas: Planificado en Organización Semanal`,
        date: dateStr,
      });
    }

    // Medications
    if (evs.medications) {
      for (const m of evs.medications) {
        list.push({
          id: `med-${m.disp.id}`,
          title: `${m.details.estado}: ${m.details.marca}`,
          description: `Medicamento: ${m.details.marca}\nDroga: ${m.details.droga}\nEstado: ${m.details.estado}\nTratamiento: ${m.details.funcionTratamiento}\nDisponible hasta: ${m.details.disponibleHasta}`,
          date: dateStr,
        });
      }
    }

    // Academic Classes (Horarios)
    if (evs.horarios) {
      for (const h of evs.horarios) {
        list.push({
          id: `clase-${h.id}-${dateStr}`,
          title: `Clase: ${h.materia}`,
          description: `Cursada: ${h.materia}\nHorario: ${h.horaInicio || "--:--"} - ${h.horaFin || "--:--"} hs\nAula: ${h.aulas || "Sin especificar"}\nProfesor: ${h.profesores || "Sin especificar"}\nComisión: ${h.comision || ""}`,
          location: h.aulas || "",
          date: dateStr,
          time: h.horaInicio || undefined,
        });
      }
    }

    // Academic Exams (Examenes)
    if (evs.examenes) {
      for (const e of evs.examenes) {
        list.push({
          id: `examen-${e.id}`,
          title: `Examen: ${e.materia}`,
          description: `Evaluación de ${e.materia}\nInstancia: ${e.instancia || "Examen"}\nEstado: ${e.estado || "Programado"}\nAula: ${e.aula || "Sin especificar"}\nTemas: ${e.contenidos || "No especificados"}`,
          location: e.aula || "",
          date: dateStr,
          time: e.hora || undefined,
        });
      }
    }

    // Academic Tasks (Trabajos)
    if (evs.tasks) {
      for (const t of evs.tasks) {
        const subName = (subjects || []).find((s) => s.id === t.subjectId)?.name || "Materia";
        list.push({
          id: `trabajo-${t.id}`,
          title: `Entrega: ${t.title}`,
          description: `Trabajo para: ${subName}\nTipo: ${t.type || "Trabajo"}\nEstado: ${t.completed ? "Completado" : "Pendiente"}\nDescripción: ${t.description || ""}`,
          date: dateStr,
        });
      }
    }

    return list;
  };

  const handleGoogleCalendarSync = async (scope: "day" | "month") => {
    if (!token) {
      // The main Google login (Supabase) already requests Calendar access — if we don't
      // have a token here, it just means that session's Google token isn't available
      // right now (e.g. it expired). Ask the user to re-login instead of falling back
      // to the old, separate Firebase popup flow, which needs its own domain setup.
      setSyncStatus({
        loading: false,
        error: "No se encontró el permiso de Google Calendar. Cerrá sesión y volvé a iniciar sesión con Google para renovarlo.",
      });
      return;
    }

    setSyncStatus({ loading: true, error: null });

    // Build list of events to sync
    let eventsToSync: any[] = [];

    if (scope === "day") {
      const evs = getEventsForDate(selectedDateStr);
      eventsToSync = formatEventsForSync(evs, selectedDateStr);
    } else {
      // Sync entire month: loop through all days of currentCalendarDate's month
      const days = getDaysInMonth(currentCalendarDate);
      for (const d of days) {
        if (d !== null) {
          const dStr = `${currentCalendarDate.getFullYear()}-${String(
            currentCalendarDate.getMonth() + 1,
          ).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const evs = getEventsForDate(dStr);
          eventsToSync = [...eventsToSync, ...formatEventsForSync(evs, dStr)];
        }
      }
    }

    if (eventsToSync.length === 0) {
      setSyncStatus({ loading: false, success: true, count: 0 });
      return;
    }

    try {
      const { WorkspaceService } = await import("../lib/workspace");
      const result = await WorkspaceService.syncCalendarEvents(
        eventsToSync,
        token,
      );
      if (result.success) {
        setSyncStatus({
          loading: false,
          success: true,
          count: result.syncedCount,
        });
        setTimeout(() => {
          setSyncStatus((prev) => (prev.success ? { loading: false } : prev));
        }, 5000);
      } else {
        setSyncStatus({
          loading: false,
          error: result.error || "Ocurrió un error en la sincronización.",
        });
      }
    } catch (err: any) {
      setSyncStatus({ loading: false, error: err.message });
    }
  };

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    return days;
  };

  // Replicating calculation logic from HealthView
  const calculateDispDetails = (disp: DisponibilidadMedicamento) => {
    const med = medicamentosDetallados.find((m) => m.id === disp.medicamentoId);
    if (!med) {
      return {
        marca: "Medicamento no encontrado",
        droga: "",
        consumoDiario: 0,
        cantidad: 0,
        funcionTratamiento: "Sin Información",
        diasPasados: 0,
        cantidadDisponible: 0,
        disponibleParaDias: 0,
        disponibleHasta: disp.fechaRegistro,
        estado: "Sin Información",
      };
    }

    const cd = med.consumoDiario || 1; // avoid division by zero
    const cant = med.cantidad || 0;
    const cantReg = disp.cantidadRegistrada || 0;

    const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      const clean = dateStr.split("T")[0];
      const parts = clean.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
      }
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Days transcurridos since registration
    const regDate = parseLocalDate(disp.fechaRegistro);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - regDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const diasPasados = diffDays < 0 ? 0 : diffDays;

    // Formula: "Cantidad Disponible": "Cantidad Registrada" - (Consumo Diario * Días transcurridos desde el registro)
    let cantidadDisponible = cantReg - cd * diasPasados;
    if (cantidadDisponible < 0) {
      cantidadDisponible = 0;
    }

    // Disponible Para: "Cantidad Disponible" / "Consumo Diario" in Days
    const disponibleParaDias = cd > 0 ? cantidadDisponible / cd : 0;

    // Disponible Hasta: baseDate + disponibleParaDias (days)
    const baseDate = today.getTime() > regDate.getTime() ? new Date(today) : new Date(regDate);
    baseDate.setDate(baseDate.getDate() + Math.max(0, Math.floor(disponibleParaDias)));
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, "0");
    const day = String(baseDate.getDate()).padStart(2, "0");
    const disponibleHasta = `${y}-${m}-${day}`;

    // Estado logic
    let estado = "Sin Información";
    if (disp.receta) {
      estado = "Con Receta";
    } else {
      if (disponibleParaDias > 14) {
        estado = "Con Medicacion";
      } else if (disponibleParaDias <= 14 && disponibleParaDias >= 7) {
        estado = "Pedir Receta";
      } else if (disponibleParaDias < 7) {
        estado = "Comprar Medicamento";
      }
    }

    return {
      marca: med.marca,
      droga: med.droga,
      consumoDiario: cd,
      cantidad: cant,
      funcionTratamiento: med.funcionTratamiento || "Quimioterapia",
      diasPasados,
      cantidadDisponible,
      disponibleParaDias,
      disponibleHasta,
      estado,
    };
  };

  // Helper to extract day name in Spanish from YYYY-MM-DD
  const getDayNameFromDateStr = (dateStr: string): string => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNum = dateObj.getDay();
    const dayMap: Record<number, string> = {
      0: "Domingo",
      1: "Lunes",
      2: "Martes",
      3: "Miércoles",
      4: "Jueves",
      5: "Viernes",
      6: "Sábado",
    };
    return dayMap[dayNum] || "";
  };

  const getSubjectName = (subjectId: string) => {
    const sub = (subjects || []).find((s) => s.id === subjectId);
    return sub ? sub.name : "Materia";
  };

  // Toggle Academic Task completion
  const handleToggleAcademicTask = (taskId: string) => {
    if (setTasks) {
      setTasks((prev) => {
        const updated = prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t));
        StorageService.setTasks(updated);
        return updated;
      });
    }
  };

  // Extract events for a specific date
  const getEventsForDate = (dateStr: string) => {
    const dayTurnos = turnosCompromisos.filter((tc) => tc.fecha === dateStr || tc.fecha.startsWith(dateStr));
    const dayAppointments = appointments.filter((app) => app.date === dateStr);
    const dayInvoices = invoices.filter((inv) => inv.dueDate === dateStr);
    const dayDetailedPayments = detailedPayments.filter(
      (dp) =>
        dp.fechaVencimiento === dateStr ||
        (dp.fechaCierre && dp.fechaCierre === dateStr),
    );
    const dayMeals = organizacionSemanal.filter((os) => os.fecha === dateStr);

    const dayMeds = (disponibilidadMedicamentos || [])
      .map((disp) => {
        const details = calculateDispDetails(disp);
        return { disp, details };
      })
      .filter(({ details }) => {
        return (
          (details.estado === "Comprar Medicamento" ||
            details.estado === "Pedir Receta") &&
          details.disponibleHasta === dateStr
        );
      });

    // Académico: Cursada (Horarios), Exámenes y Trabajos/Entregas
    const dayName = getDayNameFromDateStr(dateStr);
    const dayHorarios = (horarios || []).filter((h) => h.dia === dayName);
    const dayExamenes = (examenes || []).filter(
      (e) => e.fecha && e.fecha.startsWith(dateStr),
    );
    const dayTasks = (tasks || []).filter(
      (t) => t.dueDate && t.dueDate.startsWith(dateStr),
    );

    return {
      turnos: dayTurnos,
      appointments: dayAppointments,
      invoices: dayInvoices,
      detailedPayments: dayDetailedPayments,
      meals: dayMeals,
      medications: dayMeds,
      horarios: dayHorarios,
      examenes: dayExamenes,
      tasks: dayTasks,
    };
  };

  // Extract shared events for a specific date and share configuration
  const getSharedEventsForDate = (dateStr: string, share: AgendaShare) => {
    if (!share || !share.agendaData) return null;

    const data = share.agendaData;
    const shareCats = share.categories;

    const dayTurnos =
      shareCats.turnos && data.turnosCompromisos
        ? data.turnosCompromisos.filter(
            (tc) =>
              (tc.fecha === dateStr || tc.fecha.startsWith(dateStr)) &&
              (share.sharedTurnoCompromisoIds || []).includes(tc.id),
          )
        : [];
    const dayAppointments =
      shareCats.turnos && data.appointments
        ? data.appointments.filter(
            (app) =>
              app.date === dateStr &&
              (share.sharedAppointmentIds || []).includes(app.id),
          )
        : [];
    const dayInvoices =
      shareCats.finanzas && data.invoices
        ? data.invoices.filter(
            (inv) =>
              inv.dueDate === dateStr &&
              (share.sharedInvoiceIds || []).includes(inv.id),
          )
        : [];
    const dayDetailedPayments =
      shareCats.finanzas && data.detailedPayments
        ? data.detailedPayments.filter(
            (dp) =>
              (dp.fechaVencimiento === dateStr ||
                (dp.fechaCierre && dp.fechaCierre === dateStr)) &&
              (share.sharedDetailedPaymentIds || []).includes(dp.id),
          )
        : [];
    const dayMeals =
      shareCats.comidas && data.organizacionSemanal
        ? data.organizacionSemanal.filter(
            (os) =>
              os.fecha === dateStr &&
              (share.sharedOrganizacionSemanalIds || []).includes(os.id),
          )
        : [];

    const dayMeds =
      shareCats.salud && data.disponibilidadMedicamentos
        ? (data.disponibilidadMedicamentos || [])
            .filter((disp) =>
              (share.sharedDisponibilidadMedicamentoIds || []).includes(
                disp.id,
              ),
            )
            .map((disp) => {
              const med = data.medicamentosDetallados?.find(
                (m) => m.id === disp.medicamentoId,
              );
              if (!med) return null;
              const cd = med.consumoDiario || 1;
              const cantReg = disp.cantidadRegistrada || 0;
              const parseLocalDate = (dateStr: string) => {
                if (!dateStr) return new Date();
                const clean = dateStr.split("T")[0];
                const parts = clean.split("-");
                if (parts.length === 3) {
                  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
                }
                const d = new Date(dateStr);
                d.setHours(0, 0, 0, 0);
                return d;
              };
              const regDate = parseLocalDate(disp.fechaRegistro);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffDays = Math.round(
                (today.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24),
              );
              const diasPasados = diffDays < 0 ? 0 : diffDays;
              let cantidadDisponible = cantReg - cd * diasPasados;
              if (cantidadDisponible < 0) cantidadDisponible = 0;
              const disponibleParaDias = cd > 0 ? cantidadDisponible / cd : 0;
              const baseDate = today.getTime() > regDate.getTime() ? new Date(today) : new Date(regDate);
              baseDate.setDate(
                baseDate.getDate() +
                  Math.max(0, Math.floor(disponibleParaDias)),
              );
              const y = baseDate.getFullYear();
              const m = String(baseDate.getMonth() + 1).padStart(2, "0");
              const day = String(baseDate.getDate()).padStart(2, "0");
              const disponibleHasta = `${y}-${m}-${day}`;
              let estado = "Sin Información";
              if (disp.receta) {
                estado = "Con Receta";
              } else {
                if (disponibleParaDias > 14) {
                  estado = "Con Medicacion";
                } else if (
                  disponibleParaDias <= 14 &&
                  disponibleParaDias >= 7
                ) {
                  estado = "Pedir Receta";
                } else if (disponibleParaDias < 7) {
                  estado = "Comprar Medicamento";
                }
              }
              return {
                disp,
                details: {
                  marca: med.marca,
                  droga: med.droga,
                  estado,
                  disponibleHasta,
                  cantidadDisponible,
                  disponibleParaDias,
                  funcionTratamiento: med.funcionTratamiento,
                },
              };
            })
            .filter(Boolean)
            .filter((item: any) => {
              return (
                (item.details.estado === "Comprar Medicamento" ||
                  item.details.estado === "Pedir Receta") &&
                item.details.disponibleHasta === dateStr
              );
            })
        : [];

    return {
      turnos: dayTurnos,
      appointments: dayAppointments,
      invoices: dayInvoices,
      detailedPayments: dayDetailedPayments,
      meals: dayMeals,
      medications: dayMeds,
      platos: data.platos || [],
    };
  };

  // Get total events counts or specific colors for rendering indicator dots
  const hasEventsForDate = (dateStr: string) => {
    const ev = getEventsForDate(dateStr);
    return {
      hasTurnos: ev.turnos.length > 0 || ev.appointments.length > 0,
      hasFinanzas: ev.invoices.length > 0 || ev.detailedPayments.length > 0,
      hasComidas: ev.meals.length > 0,
      hasSalud: ev.medications.length > 0,
      hasAcademico:
        ev.horarios.length > 0 || ev.examenes.length > 0 || ev.tasks.length > 0,
      totalCount:
        ev.turnos.length +
        ev.appointments.length +
        ev.invoices.length +
        ev.detailedPayments.length +
        ev.meals.length +
        ev.medications.length +
        ev.horarios.length +
        ev.examenes.length +
        ev.tasks.length,
    };
  };

  // Format date display (e.g., "Domingo, 19 de Julio de 2026")
  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return "";
    let cleanDateStr = dateStr;
    let timeStr = "";

    if (dateStr.includes("T")) {
      const parts = dateStr.split("T");
      cleanDateStr = parts[0];
      timeStr = parts[1];
    } else if (dateStr.includes(" ")) {
      const parts = dateStr.split(" ");
      cleanDateStr = parts[0];
      timeStr = parts.slice(1).join(" ");
    }

    const parts = cleanDateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const dateObj = new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
    );
    const dayOfWeek = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ][dateObj.getDay()];
    const dayNum = parts[2];
    const monthName = monthNames[dateObj.getMonth()];
    const yearNum = parts[0];
    
    let result = `${dayOfWeek}, ${dayNum} de ${monthName} de ${yearNum}`;
    if (timeStr) {
      const cleanTime = timeStr.replace("hs", "").trim();
      result += ` - ${cleanTime} hs`;
    }
    return result;
  };

  // Extract hour from fecha string if present
  const getHoraFromFecha = (fecha: string) => {
    if (!fecha) return "";
    if (fecha.includes("T")) {
      return fecha.split("T")[1];
    }
    const parts = fecha.split(" ");
    if (parts.length >= 2) {
      return parts[1].replace("hs", "").trim();
    }
    return "";
  };

  // Toggle TurnoCompromiso status
  const handleToggleTurnoStatus = (id: string) => {
    setTurnosCompromisos((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, estatus: !item.estatus, updatedAt: Date.now() } : item,
      );
      StorageService.setTurnosCompromisos(updated);
      return updated;
    });
  };

  // Toggle DetailedPayment status
  const handleToggleDetailedPaymentStatus = (id: string) => {
    setDetailedPayments((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, pago: !item.pago, updatedAt: Date.now() } : item,
      );
      StorageService.setDetailedPayments(updated);
      return updated;
    });
  };

  // Toggle Invoice status
  const handleToggleInvoiceStatus = (id: string) => {
    setInvoices((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, paid: !item.paid, updatedAt: Date.now() } : item,
      );
      StorageService.setInvoices(updated);
      return updated;
    });
  };

  // Selected date events
  const selectedDateStr = selectedCalendarDate || getLocalDateString();
  const selectedEvents = getEventsForDate(selectedDateStr);
  const totalSelectedEvents =
    selectedEvents.turnos.length +
    selectedEvents.appointments.length +
    selectedEvents.invoices.length +
    selectedEvents.detailedPayments.length +
    selectedEvents.meals.length +
    (selectedEvents.medications ? selectedEvents.medications.length : 0) +
    (selectedEvents.horarios ? selectedEvents.horarios.length : 0) +
    (selectedEvents.examenes ? selectedEvents.examenes.length : 0) +
    (selectedEvents.tasks ? selectedEvents.tasks.length : 0);

  const agendaListItems = [
    ...(selectedEvents.appointments || []).map((app, idx) => ({
      itemType: "appointment" as const,
      data: app,
      id: `app-${app.id}-${idx}`,
    })),
    ...(selectedEvents.turnos || []).map((tc, idx) => ({
      itemType: "turno" as const,
      data: tc,
      id: `tc-${tc.id}-${idx}`,
    })),
    ...(selectedEvents.invoices || []).map((inv, idx) => ({
      itemType: "invoice" as const,
      data: inv,
      id: `inv-${inv.id}-${idx}`,
    })),
    ...(selectedEvents.detailedPayments || []).map((dp, idx) => ({
      itemType: "detailedPayment" as const,
      data: dp,
      id: `dp-${dp.id}-${idx}`,
    })),
    ...(selectedEvents.medications || []).map(({ disp, details }, idx) => ({
      itemType: "medication" as const,
      data: { disp, details },
      id: `med-${disp.id}-${idx}`,
    })),
    ...(selectedEvents.meals || []).map((m, idx) => {
      const matchedPlato = (platos || []).find((p: any) => p.id === m.platoId);
      return {
        itemType: "meal" as const,
        data: {
          ...m,
          nombrePlato: matchedPlato ? matchedPlato.nombrePlato : ((m as any).nombrePlato || "Pollo al Horno con Papa y Zanahoria"),
          descripcionPlato: matchedPlato ? matchedPlato.descripcion : undefined,
        },
        id: `meal-${m.id}-${idx}`,
      };
    }),
    ...(selectedEvents.horarios || []).map((h, idx) => ({
      itemType: "clase" as const,
      data: h,
      id: `clase-${h.id}-${idx}`,
    })),
    ...(selectedEvents.examenes || []).map((e, idx) => ({
      itemType: "examen" as const,
      data: e,
      id: `examen-${e.id}-${idx}`,
    })),
    ...(selectedEvents.tasks || []).map((t, idx) => ({
      itemType: "trabajo" as const,
      data: t,
      id: `trabajo-${t.id}-${idx}`,
    })),
  ].filter((item) => {
    if (homeAgendaFilter === "todos") return true;
    if (homeAgendaFilter === "turnos") return item.itemType === "appointment" || item.itemType === "turno";
    if (homeAgendaFilter === "facturas") return item.itemType === "invoice" || item.itemType === "detailedPayment";
    if (homeAgendaFilter === "salud") return item.itemType === "medication";
    if (homeAgendaFilter === "comidas") return item.itemType === "meal";
    if (homeAgendaFilter === "academico")
      return (
        item.itemType === "clase" ||
        item.itemType === "examen" ||
        item.itemType === "trabajo"
      );
    return true;
  });

  // Automatically evaluate and send notifications for today's pending agenda tasks (100% in-memory, 0 Firebase/network calls)
  const agendaListItemsRef = useRef(agendaListItems);
  useEffect(() => {
    agendaListItemsRef.current = agendaListItems;
  }, [agendaListItems]);

  useEffect(() => {
    const checkNotifications = () => {
      const isToday = selectedDateStr === getLocalDateString();
      if (isToday && notifPerm === "granted" && agendaListItemsRef.current.length > 0) {
        evaluateAndNotifyTodayAgenda(agendaListItemsRef.current, true, false).catch((err) =>
          console.error("Auto notification error:", err)
        );
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60000);
    return () => clearInterval(interval);
  }, [selectedDateStr, notifPerm]);

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6" id="home-view-container">
      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: The Linked Interactive Calendar */}
        <div
          id="calendar-card"
          className={`p-6 rounded-3xl border flex flex-col lg:col-span-5 justify-between shadow-xs app-calendar-container ${
            darkMode
              ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
              : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary animate-pulse" />
                <span>Calendario Unificado</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const newCal = new Date(currentCalendarDate);
                    newCal.setMonth(newCal.getMonth() - 1);
                    setCurrentCalendarDate(newCal);
                  }}
                  className="p-1.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-primary cursor-pointer transition-colors"
                  title="Mes Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const newCal = new Date(currentCalendarDate);
                    newCal.setMonth(newCal.getMonth() + 1);
                    setCurrentCalendarDate(newCal);
                  }}
                  className="p-1.5 rounded-xl bg-zinc-500/10 hover:bg-zinc-500/20 text-primary cursor-pointer transition-colors"
                  title="Mes Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-center font-extrabold text-xs mb-4 text-slate-800 dark:text-zinc-200 uppercase tracking-widest bg-slate-50 dark:bg-black/40 py-2 rounded-xl">
              {monthNames[currentCalendarDate.getMonth()]}{" "}
              {currentCalendarDate.getFullYear()}
            </div>

            <div className={`p-4 rounded-3xl ${darkMode ? "bg-zinc-950 shadow-sm" : "bg-white shadow-sm border border-slate-100"}`}>
{/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
              {weekDays.map((wd) => (
                <div key={wd} className="py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentCalendarDate).map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="p-1" />;
                }

                const dateStr = `${currentCalendarDate.getFullYear()}-${String(
                  currentCalendarDate.getMonth() + 1,
                ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                const {
                  hasTurnos,
                  hasFinanzas,
                  hasComidas,
                  hasSalud,
                  totalCount,
                } = hasEventsForDate(dateStr);
                const isSelected = selectedCalendarDate === dateStr;
                const isToday = getLocalDateString() === dateStr;

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => {
                      setSelectedCalendarDate(isSelected ? null : dateStr);
                    }}
                    className={`p-1.5 rounded-full flex flex-col items-center justify-center relative cursor-pointer transition-all h-9 w-full font-bold text-xs ${
                      isSelected
                        ? "border-2 border-primary text-primary dark:text-primary bg-primary/10 scale-105 shadow-sm"
                        : isToday
                          ? "bg-primary text-white dark:text-blue-950 shadow-md font-bold"
                          : "hover:bg-primary/10 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <span>{day}</span>

                    {totalCount > 0 && (
                      <span
                        className={`absolute bottom-1 w-1 h-1 rounded-full ${
                          isSelected
                            ? "bg-primary"
                            : "bg-primary animate-pulse"
                        }`}
                        title={`${totalCount} evento(s)`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
</div>

          {/* Calendar Legend and Actions */}
          <div className="mt-6 pt-4 border-t border-zinc-800/10 dark:border-zinc-800/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Turnos</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Finanzas</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Universidad</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Salud</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Comidas</span>
              </span>
              <button
                onClick={() => {
                  setCurrentCalendarDate(new Date());
                  setSelectedCalendarDate(getLocalDateString());
                }}
                className="text-primary hover:underline cursor-pointer font-bold lowercase normal-case"
              >
                Ir a Hoy
              </button>
            </div>
          </div>

          {/* Sincronización con Google Calendar */}
          <div className="mt-5 pt-4 border-t border-zinc-800/10 dark:border-zinc-800/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-primary"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-5-8h-4v4h4v-4z" />
                </svg>
                <span>Google Calendar</span>
              </h4>
              {token ? (
                <span className="flex items-center gap-1 text-[10px] text-primary font-extrabold bg-primary/10 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Conectado
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800/40 px-2 py-0.5 rounded-lg">
                  Sin vincular
                </span>
              )}
            </div>

            {!token ? (
              <button
                onClick={() => handleGoogleCalendarSync("day")}
                disabled={syncStatus.loading}
                className="w-full py-2 px-3 rounded-full bg-primary hover:bg-primary active:scale-[0.98] disabled:opacity-50 text-white dark:text-blue-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncStatus.loading ? "animate-spin" : ""}`}
                />
                Vincular Google Calendar
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleGoogleCalendarSync("day")}
                    disabled={syncStatus.loading}
                    className="py-2 px-2.5 rounded-full bg-primary/10 hover:bg-primary/10 active:scale-[0.98] disabled:opacity-50 text-primary font-extrabold text-[11px] flex items-center justify-center gap-1.5 border border-primary/20 transition-all cursor-pointer"
                    title="Sincroniza todas las citas, compromisos, comidas y vencimientos de hoy / día seleccionado"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${syncStatus.loading ? "animate-spin" : ""}`}
                    />
                    Sincronizar Día
                  </button>
                  <button
                    onClick={() => handleGoogleCalendarSync("month")}
                    disabled={syncStatus.loading}
                    className="py-2 px-2.5 rounded-full bg-primary hover:bg-primary active:scale-[0.98] disabled:opacity-50 text-white dark:text-blue-950 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Sincroniza todos los eventos del mes calendario que estás visualizando"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${syncStatus.loading ? "animate-spin" : ""}`}
                    />
                    Sincronizar Mes
                  </button>
                </div>
              </div>
            )}

            {syncStatus.loading && (
              <p className="text-[10px] text-primary animate-pulse font-bold mt-2 text-center">
                Procesando sincronización con Google Calendar...
              </p>
            )}

            {syncStatus.success && (
              <div className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded-xl text-[10px] text-primary font-bold flex items-start gap-1.5 animate-fadeIn">
                <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Sincronización exitosa. Se procesaron{" "}
                  {syncStatus.count !== undefined
                    ? syncStatus.count
                    : "todos los"}{" "}
                  eventos sin duplicados.
                </span>
              </div>
            )}

            {syncStatus.error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-500 font-bold flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{syncStatus.error}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Unified Interactive Agenda */}
        <div
          id="agenda-card"
          className={`p-6 rounded-3xl border flex flex-col lg:col-span-7 justify-between shadow-xs ${
            darkMode
              ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
              : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
          }`}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/10 dark:border-zinc-800/40 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h3 className="font-extrabold text-sm">
                  Agenda Central Integrada
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Push Notification Toggle & Test Button */}
                {notifPerm === "granted" ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleTestTodayNotifications}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-primary text-white dark:text-zinc-950 hover:bg-primary/90 transition-all cursor-pointer active:scale-95 shadow-xs"
                      title="Probar y enviar las notificaciones de hoy a la barra de estado de tu móvil"
                    >
                      <BellRing className="w-3.5 h-3.5 shrink-0" />
                      <span>Probar Aviso</span>
                    </button>
                    <span
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      title="Notificaciones Push activas en este dispositivo"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Push Activo</span>
                    </span>
                  </div>
                ) : notifPerm === "denied" ? (
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                    title="Permiso de notificaciones bloqueado en los ajustes del dispositivo/navegador"
                  >
                    <BellOff className="w-3.5 h-3.5 shrink-0" />
                    <span>Push Bloqueado</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotifications}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-primary/10 hover:bg-primary text-primary hover:text-white dark:hover:text-blue-950 border border-primary/20 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Activar notificaciones nativas en tu dispositivo para avisarte de tus tareas de hoy"
                  >
                    <Bell className="w-3.5 h-3.5 shrink-0" />
                    <span>Activar Push</span>
                  </button>
                )}

                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg">
                  {totalSelectedEvents} Eventos / Notas
                </span>
              </div>
            </div>

            {notifSuccessMsg && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{notifSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifSuccessMsg(null)}
                  className="p-1 hover:bg-emerald-500/20 rounded-lg cursor-pointer text-emerald-600 dark:text-emerald-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Dynamic Date Header & Filter Pills Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-4 bg-slate-50 dark:bg-black/40 border border-slate-150 dark:border-zinc-800/50 rounded-2xl">
              <div>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                  Día Seleccionado
                </p>
                <p className="text-xs md:text-sm font-extrabold text-black dark:text-zinc-200 mt-0.5" style={{ color: darkMode ? undefined : '#222222' }}>
                  {formatDateFriendly(selectedDateStr)}
                </p>
              </div>

              {/* Filter Pills */}
              <PillFilterBar
                options={[
                  { id: "todos", label: "Todos" },
                  { id: "turnos", label: "Turnos" },
                  { id: "facturas", label: "Finanzas" },
                  { id: "academico", label: "Universidad" },
                  { id: "salud", label: "Salud" },
                  { id: "comidas", label: "Comidas" },
                ]}
                activeValue={homeAgendaFilter}
                onChange={(val) => setHomeAgendaFilter(val as any)}
                layoutIdPrefix="homeAgendaFilter"
                className="self-start sm:self-auto"
                resetButton={
                  selectedCalendarDate ? (
                    <button
                      type="button"
                      onClick={() => setSelectedCalendarDate(null)}
                      className="px-2 py-1 text-[10px] text-primary font-bold hover:underline cursor-pointer ml-1 whitespace-nowrap shrink-0"
                      title="Restablecer a hoy"
                    >
                      Hoy
                    </button>
                  ) : null
                }
              />
            </div>

            {/* Unified Agenda Event Listings */}
            <AnimatePresence mode="wait">
              <motion.div
                key={homeAgendaFilter}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3.5 max-h-[440px] pr-1"
              >
                {totalSelectedEvents === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <Info className="w-8 h-8 text-zinc-400" />
                  <p className="text-zinc-500 text-xs font-semibold max-w-sm italic">
                    No tienes actividades o recordatorios guardados para este
                    día. ¡Disfruta de una jornada libre!
                  </p>
                </div>
              ) : (
                <AnimatedList
                  items={agendaListItems}
                  showGradients={false}
                  enableArrowNavigation={true}
                  className="max-h-[390px]"
                  renderItem={(item, itemIdx) => {
                    const itemData = item.data as any;
                    const itemId = `${item.itemType}-${itemData?.id || itemData?.disp?.id || Math.random()}`;
                    const isExpanded = expandedHomeItemId === itemId;

                    if (item.itemType === "appointment") {
                      const app = item.data;
                      return (
                        <div
                          key={`app-${app.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          onContextMenu={(e) =>
                            handleEventContextMenu(e, "appointment", app)
                          }
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-3 group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más info desplegada"
                        >
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                                <Calendar className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                    Turno Cita
                                  </span>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                                <h4 className="font-extrabold text-xs text-black dark:text-white mt-1.5" style={{ color: darkMode ? undefined : '#000000' }}>
                                  {app.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400 mt-1.5 font-medium">
                                  {app.time && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-primary" />
                                      <span>{app.time} hs</span>
                                    </span>
                                  )}
                                  {app.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-primary" />
                                      <span className="truncate">{app.location}</span>
                                    </span>
                                  )}
                                  {app.doctorName && (
                                    <span className="flex items-center gap-1">
                                      <Stethoscope className="w-3.5 h-3.5 text-primary" />
                                      <span>
                                        {app.doctorName} ({app.specialty})
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Profesional / Especialidad
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {app.doctorName || "Sin asignar"} {app.specialty ? `(${app.specialty})` : ""}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Lugar / Dirección
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {app.location || "Sin lugar registrado"}
                                    </span>
                                  </div>
                                </div>
                                {app.notes && (
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider mb-1">
                                      Notas
                                    </span>
                                    <p className="text-zinc-700 dark:text-zinc-300 italic">
                                      {app.notes}
                                    </p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (item.itemType === "turno") {
                      const tc = item.data;
                      const matchLogos = getMatchTeamLogos(tc);
                      const CatIcon = getTurnoCategoryIcon(tc.categoria);
                      return (
                        <div
                          key={`tc-${tc.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          onContextMenu={(e) =>
                            handleEventContextMenu(e, "turno", tc)
                          }
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : tc.estatus
                                ? "border border-primary bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-950 shadow-xs"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más info desplegada"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                  <CatIcon className="w-3 h-3 shrink-0" />
                                  <span>{tc.categoria}</span>
                                </span>
                                {tc.estatus && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                    Realizado
                                  </span>
                                )}
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>

                              {matchLogos && (matchLogos.homeLogo || matchLogos.awayLogo) ? (
                                <div className="flex items-center gap-2.5 my-2 py-1.5 w-full justify-start flex-wrap">
                                  {/* Home Team */}
                                  <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40 shrink-0">
                                    {matchLogos.homeLogo ? (
                                      <img
                                        src={matchLogos.homeLogo}
                                        alt={matchLogos.homeTeam || "Home"}
                                        className="w-4 h-4 object-contain shrink-0"
                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                      />
                                    ) : (
                                      <Shield className="w-4 h-4 text-zinc-400 shrink-0" />
                                    )}
                                    <span className={`text-[10px] font-bold truncate max-w-[85px] leading-tight ${tc.estatus ? "line-through text-zinc-400" : "text-zinc-900 dark:text-white"}`} style={{ color: tc.estatus ? undefined : (darkMode ? undefined : '#000000') }}>
                                      {matchLogos.homeTeam || "Local"}
                                    </span>
                                  </div>

                                  {/* VS */}
                                  <span className="text-[9px] font-black text-primary px-0.5 shrink-0 select-none">VS</span>

                                  {/* Away Team */}
                                  <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/60 px-2 py-1 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40 shrink-0">
                                    {matchLogos.awayLogo ? (
                                      <img
                                        src={matchLogos.awayLogo}
                                        alt={matchLogos.awayTeam || "Away"}
                                        className="w-4 h-4 object-contain shrink-0"
                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                      />
                                    ) : (
                                      <Shield className="w-4 h-4 text-zinc-400 shrink-0" />
                                    )}
                                    <span className={`text-[10px] font-bold truncate max-w-[85px] leading-tight ${tc.estatus ? "line-through text-zinc-400" : "text-zinc-900 dark:text-white"}`} style={{ color: tc.estatus ? undefined : (darkMode ? undefined : '#000000') }}>
                                      {matchLogos.awayTeam || "Visitante"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-1.5 min-w-0">
                                  <div
                                    className="shrink-0 flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={tc.estatus}
                                      onChange={() => handleToggleTurnoStatus(tc.id)}
                                      className="w-4 h-4 accent-primary rounded cursor-pointer block m-0"
                                    />
                                  </div>
                                  <h4
                                    className={`font-extrabold text-xs leading-none truncate flex items-center gap-1.5 ${tc.estatus ? "line-through text-zinc-400" : "text-black dark:text-white"}`}
                                    style={{ color: tc.estatus ? undefined : (darkMode ? undefined : '#000000') }}
                                  >
                                    <CatIcon className="w-3.5 h-3.5 text-primary shrink-0 self-center" />
                                    <span className="self-center translate-y-[0.5px] truncate">{tc.descripcion.replace(/⚽\s*/g, "")}</span>
                                  </h4>
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400 mt-1.5 font-medium">
                                {getHoraFromFecha(tc.fecha) && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{getHoraFromFecha(tc.fecha)} hs</span>
                                  </span>
                                )}
                                {tc.lugar &&
                                  tc.lugar.trim() &&
                                  tc.lugar.toLowerCase() !== "sin dirección" &&
                                  tc.lugar.toLowerCase() !== "sin direccion" &&
                                  tc.lugar.toLowerCase() !== "sin lugar asignado" && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                    <span className="truncate">{tc.lugar}</span>
                                  </span>
                                )}
                                {tc.doctor && (
                                  <span className="flex items-center gap-1">
                                    <Stethoscope className="w-3.5 h-3.5 text-primary" />
                                    <span>{tc.doctor}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Fecha y Hora
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {formatDateFriendly ? formatDateFriendly(tc.fecha) : tc.fecha}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Lugar / Ubicación
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {tc.lugar &&
                                      tc.lugar.trim() &&
                                      tc.lugar.toLowerCase() !== "sin dirección" &&
                                      tc.lugar.toLowerCase() !== "sin direccion" &&
                                      tc.lugar.toLowerCase() !== "sin lugar asignado"
                                        ? tc.lugar
                                        : "Sin lugar asignado"}
                                    </span>
                                  </div>
                                  {!String(tc.id).startsWith("match-") && (
                                    <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                      <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                        Profesional / Asignado
                                      </span>
                                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                        {tc.doctor || "Sin profesional asignado"}
                                      </span>
                                    </div>
                                  )}
                                  {!String(tc.id).startsWith("match-") && (
                                    <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                      <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                        Categoría y Estatus
                                      </span>
                                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                        {tc.categoria} • {(() => {
                                          if (tc.estatus) return "Realizado";
                                          const todayStr = getLocalDateString();
                                          const datePortion = tc.fecha ? tc.fecha.substring(0, 10) : "";
                                          if (datePortion && datePortion.length === 10 && datePortion < todayStr) return "Realizado";
                                          if (tc.fecha === todayStr || datePortion === todayStr) return "Initinere Diario";
                                          return "Pendiente";
                                        })()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {tc.informacionPersonalizada && !String(tc.id).startsWith("match-") && (
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider mb-1">
                                      Información Personalizada
                                    </span>
                                    <div
                                      className="text-zinc-700 dark:text-zinc-300 italic text-[11px]"
                                      dangerouslySetInnerHTML={{ __html: tc.informacionPersonalizada }}
                                    />
                                  </div>
                                )}
                                {tc.transcripcionAutomatica && (
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="flex items-center gap-1 text-[9px] font-extrabold text-green-500 uppercase tracking-wider mb-1">
                                      <AudioLines className="w-3 h-3" /> Transcripción de Audio
                                    </span>
                                    {(() => {
                                      const audioFile = tc.archivosNecesarios?.find((a: any) => a.name.startsWith('Audio_') && a.url.startsWith('data:audio/'));
                                      if (audioFile) {
                                        return <AudioTranscriptionPlayer audioUrl={audioFile.url} transcript={tc.transcripcionAutomatica} />;
                                      }
                                      return (
                                        <div className="text-zinc-700 dark:text-zinc-300 italic text-[11px] max-h-[100px] overflow-y-auto">
                                          {tc.transcripcionAutomatica}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                                {(tc.pedidoDocumento || tc.estudioInformeDoc || (tc.archivosNecesarios && tc.archivosNecesarios.length > 0)) && (
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 flex flex-wrap gap-2">
                                    {tc.pedidoDocumento && (
                                      <button
                                        type="button"
                                        onClick={() => openStoredFile(tc.pedidoDocumento!, "Pedido")}
                                        className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline cursor-pointer"
                                      >
                                        <FileDown className="w-3 h-3" />
                                        <span>Ver Pedido</span>
                                      </button>
                                    )}
                                    {tc.estudioInformeDoc && (
                                      <button
                                        type="button"
                                        onClick={() => openStoredFile(tc.estudioInformeDoc!, "Estudio")}
                                        className="flex items-center gap-1 px-2 py-1 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary rounded-lg text-[10px] font-extrabold hover:underline cursor-pointer"
                                      >
                                        <FileDown className="w-3 h-3" />
                                        <span>Ver Estudio</span>
                                      </button>
                                    )}
                                    {(tc.archivosNecesarios || []).map((archivo: any, idx: number) => (
                                      <button
                                        type="button"
                                        key={`home-att-${idx}`}
                                        onClick={() => openStoredFile(archivo.url, archivo.name)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                                      >
                                        <FileText className="w-3 h-3 text-slate-500 dark:text-zinc-500" />
                                        <span className="max-w-[100px] truncate" title={archivo.name}>{archivo.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (item.itemType === "invoice") {
                      const inv = item.data;
                      return (
                        <div
                          key={`inv-${inv.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          onContextMenu={(e) =>
                            handleEventContextMenu(e, "invoice", inv)
                          }
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : inv.paid
                                ? "border border-primary bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-950 shadow-xs"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más info desplegada"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                  Factura / Finanzas
                                </span>
                                {inv.paid ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                    Pagado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-red-500/15 text-red-500">
                                    Vencimiento
                                  </span>
                                )}
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 min-w-0">
                                <div
                                  className="shrink-0 flex items-center justify-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={inv.paid}
                                    onChange={() => handleToggleInvoiceStatus(inv.id)}
                                    className="w-4 h-4 accent-primary rounded cursor-pointer block m-0"
                                  />
                                </div>
                                <h4
                                  className={`font-extrabold text-xs leading-none truncate ${inv.paid ? "line-through text-zinc-400" : "text-black dark:text-white"}`}
                                  style={{ color: inv.paid ? undefined : (darkMode ? undefined : '#000000') }}
                                >
                                  Vence: {inv.title}
                                </h4>
                              </div>
                              <p className="text-xs font-bold text-primary mt-1.5">
                                ${inv.amount.toLocaleString("es-AR")} ARS
                              </p>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Monto
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      ${inv.amount.toLocaleString("es-AR")} ARS
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Estado de Pago
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {inv.paid ? "Pagado / Al día" : "Pendiente de pago"}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Vencimiento
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {inv.dueDate}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Categoría
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {inv.category || "General"}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (item.itemType === "detailedPayment") {
                      const dp = item.data;
                      const isClosing = dp.fechaCierre === selectedDateStr;
                      return (
                        <div
                          key={`dp-${dp.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          onContextMenu={(e) =>
                            handleEventContextMenu(e, "detailedPayment", dp)
                          }
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : dp.pago
                                ? "border border-primary bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-950 shadow-xs"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más info desplegada"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                              {isClosing || dp.categoria === "Tarjeta de Credito" ? (
                                <CreditCard className="w-4 h-4" />
                              ) : (
                                <Receipt className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                  {isClosing
                                    ? "Cierre Tarjeta"
                                    : "Vencimiento Pago"}
                                </span>
                                {dp.pago ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                    Liquidado
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${isClosing ? "bg-primary/10 text-primary" : "bg-red-500/15 text-red-500"}`}
                                  >
                                    {isClosing ? "Pendiente" : "Impago"}
                                  </span>
                                )}
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 min-w-0">
                                <div
                                  className="shrink-0 flex items-center justify-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={dp.pago}
                                    onChange={() =>
                                      handleToggleDetailedPaymentStatus(dp.id)
                                    }
                                    className="w-4 h-4 accent-primary rounded cursor-pointer block m-0"
                                  />
                                </div>
                                <h4
                                  className={`font-extrabold text-xs leading-none truncate ${dp.pago ? "line-through text-zinc-400" : "text-black dark:text-white"}`}
                                  style={{ color: dp.pago ? undefined : (darkMode ? undefined : '#000000') }}
                                >
                                  {isClosing
                                    ? `Cierre: ${dp.descripcion}`
                                    : `Vence: ${dp.descripcion}`}
                                </h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-zinc-400 mt-2 font-medium">
                                <span className="text-xs font-extrabold text-primary">
                                  ${dp.montoAPagar.toLocaleString("es-AR")} ARS
                                </span>
                                {dp.metodoPago && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                                    <span>{dp.metodoPago}</span>
                                  </span>
                                )}
                                {dp.dondePagar && (
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-zinc-400 font-bold">
                                      Dónde:
                                    </span>
                                    <span>{dp.dondePagar}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Categoría / Método
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {dp.categoria || "General"} • {dp.metodoPago || "Efectivo/Debito"}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      ¿Dónde Pagar?
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {dp.dondePagar || "No especificado"}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      ¿Con Qué Pagar?
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {dp.conQuePagar || "No especificado"}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Recurrente
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {dp.pagoRecurrente ? "Sí" : "No"}
                                    </span>
                                  </div>
                                  {dp.fechaCierre && (
                                    <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                      <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                        Fecha de Cierre
                                      </span>
                                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                        {dp.fechaCierre}
                                      </span>
                                    </div>
                                  )}
                                  {(dp.facturaEmitida || dp.comprobantePago) && (
                                    <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                      <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                        Archivos
                                      </span>
                                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                        {dp.facturaEmitida ? "Factura ✓" : "Sin factura"} • {dp.comprobantePago ? "Comprobante ✓" : "Sin comprobante"}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {dp.observaciones && (
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider mb-1">
                                      Observaciones
                                    </span>
                                    <p className="text-zinc-700 dark:text-zinc-300 italic">
                                      {dp.observaciones}
                                    </p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (item.itemType === "medication") {
                      const { disp, details } = item.data;
                      return (
                        <div
                          key={`disp-${disp.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          onContextMenu={(e) =>
                            handleEventContextMenu(e, "medication", {
                              disp,
                              details,
                            })
                          }
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más info desplegada"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                              <Stethoscope className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                  Salud / Medicamento
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                                    details.estado === "Comprar Medicamento"
                                      ? "bg-red-500/15 text-red-500"
                                      : "bg-primary/10 text-primary"
                                  }`}
                                >
                                  {details.estado}
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                              <h4 className="font-extrabold text-xs text-black dark:text-white mt-1.5 truncate" style={{ color: darkMode ? undefined : '#000000' }}>
                                {details.marca}
                              </h4>
                              {details.droga && (
                                <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                                  Droga: {details.droga}
                                </p>
                              )}
                              <p className="text-[10px] text-zinc-400 mt-1 font-semibold">
                                Vence/Termina el stock el{" "}
                                {details.disponibleHasta}
                              </p>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Droga / Fármaco
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {details.droga || "No especificada"}
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Función / Tratamiento
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {details.funcionTratamiento || "General"}
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Disponibilidad
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {details.disponibleHasta} ({details.disponibleParaDias.toFixed(1)} días)
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Stock (Inicial / Restante)
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {disp.cantidadRegistrada} registradas / {details.cantidadDisponible.toFixed(1)} restantes
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (item.itemType === "meal") {
                      const m = item.data;
                      const matchedPlato = (platos || []).find((p: any) => p.id === m.platoId);
                      return (
                        <div
                          key={`meal-${m.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          onContextMenu={(e) =>
                            handleEventContextMenu(e, "meal", m)
                          }
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más info desplegada"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                              <UtensilsCrossed className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                  Comidas
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                              <h4 className="font-extrabold text-xs text-black dark:text-white mt-1.5 truncate" style={{ color: darkMode ? undefined : '#000000' }}>
                                Plato Planeado:{" "}
                                {matchedPlato
                                  ? matchedPlato.nombrePlato
                                  : "Comida Desconocida"}
                              </h4>
                              <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                                Configurado en tu menú diario de comidas.
                              </p>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && matchedPlato && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                  <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider mb-1">
                                    Detalles del Plato
                                  </span>
                                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                                    {matchedPlato.nombrePlato}
                                  </span>
                                  {matchedPlato.descripcion && (
                                    <p className="text-zinc-600 dark:text-zinc-400 mt-1 italic">
                                      {matchedPlato.descripcion}
                                    </p>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Calorías
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {matchedPlato.calorias !== undefined && matchedPlato.calorias !== null
                                        ? `${matchedPlato.calorias} kcal`
                                        : "No especificadas"}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                    <span className="block text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Ingredientes
                                    </span>
                                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                      {matchedPlato.ingredientesPersonalizados && matchedPlato.ingredientesPersonalizados.length > 0
                                        ? matchedPlato.ingredientesPersonalizados.join(", ")
                                        : (matchedPlato.alimentoId1 || matchedPlato.alimentoId2 || matchedPlato.alimentoId3)
                                        ? [matchedPlato.alimentoId1, matchedPlato.alimentoId2, matchedPlato.alimentoId3]
                                            .filter(Boolean)
                                            .map((id) => (alimentos || []).find((a: any) => a.id === id)?.mercaderiaName || id)
                                            .join(", ")
                                        : "No especificados"}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (item.itemType === "clase") {
                      const h = item.data as HorarioItem;
                      return (
                        <div
                          key={`clase-${h.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más detalles de la clase"
                        >
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                                <GraduationCap className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                    Clase Académica
                                  </span>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                                <h4
                                  className="font-extrabold text-xs text-black dark:text-white mt-1.5 truncate"
                                  style={{ color: darkMode ? undefined : "#000000" }}
                                >
                                  {h.materia}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400 mt-1 font-medium">
                                  {(h.horaInicio || h.horaFin) && (
                                    <span className="flex items-center gap-1 font-semibold text-primary">
                                      <Clock className="w-3 h-3 text-primary" />
                                      <span>
                                        {h.horaInicio || "--:--"} - {h.horaFin || "--:--"} hs
                                      </span>
                                    </span>
                                  )}
                                  {h.dia && <span>Día: {h.dia}</span>}
                                  {h.aulas && <span>Aula: {h.aulas}</span>}
                                  {h.profesores && <span>Prof: {h.profesores}</span>}
                                </div>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Detalles de Cursada
                                    </span>
                                    <span className="text-[10px] font-bold text-zinc-500">
                                      {h.dia}
                                    </span>
                                  </div>
                                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                    {h.materia}
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                                    <div>
                                      <span className="font-semibold text-zinc-400">Horario: </span>
                                      {h.horaInicio || "--:--"} a {h.horaFin || "--:--"} hs
                                    </div>
                                    {h.aulas && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Aula / Espacio: </span>
                                        {h.aulas}
                                      </div>
                                    )}
                                    {h.profesores && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Profesores: </span>
                                        {h.profesores}
                                      </div>
                                    )}
                                    {h.comision && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Comisión: </span>
                                        {h.comision}
                                      </div>
                                    )}
                                    {h.modalidad && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Modalidad: </span>
                                        {h.modalidad}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (item.itemType === "examen") {
                      const e = item.data as ExamenItem;
                      return (
                        <div
                          key={`examen-${e.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más detalles del examen"
                        >
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="p-2 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-primary/10 text-primary">
                                    {e.estado || "Examen"}
                                  </span>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                                <h4
                                  className="font-extrabold text-xs text-black dark:text-white mt-1.5 truncate"
                                  style={{ color: darkMode ? undefined : "#000000" }}
                                >
                                  {e.materia}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400 mt-1 font-medium">
                                  {e.instancia && (
                                    <span className="font-semibold text-primary">
                                      Instancia: {e.instancia}
                                    </span>
                                  )}
                                  {e.hora && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-primary" />
                                      <span>{e.hora} hs</span>
                                    </span>
                                  )}
                                  {e.aula && <span>Aula: {e.aula}</span>}
                                  {e.nota !== undefined && e.nota !== null && (
                                    <span className="font-bold text-primary">
                                      Nota: {e.nota}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Evaluación Programada
                                    </span>
                                    <span className="text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-md">
                                      {e.estado || "Programado"}
                                    </span>
                                  </div>
                                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                    {e.materia}
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                                    {e.instancia && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Instancia: </span>
                                        {e.instancia}
                                      </div>
                                    )}
                                    {e.fecha && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Fecha: </span>
                                        {e.fecha}
                                      </div>
                                    )}
                                    {e.hora && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Hora: </span>
                                        {e.hora} hs
                                      </div>
                                    )}
                                    {e.aula && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Aula: </span>
                                        {e.aula}
                                      </div>
                                    )}
                                    {e.nota !== undefined && e.nota !== null && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Calificación: </span>
                                        <span className="font-bold text-primary">{e.nota}</span>
                                      </div>
                                    )}
                                    {e.contenidos && (
                                      <div className="col-span-full">
                                        <span className="font-semibold text-zinc-400">Temas / Contenidos: </span>
                                        {e.contenidos}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    if (item.itemType === "trabajo") {
                      const t = item.data as AcademicTask;
                      const subjectName = getSubjectName(t.subjectId);
                      return (
                        <div
                          key={`trabajo-${t.id}-${itemIdx}`}
                          onClick={() =>
                            setExpandedHomeItemId(isExpanded ? null : itemId)
                          }
                          className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group relative overflow-hidden ${
                            isExpanded
                              ? "bg-white dark:bg-black/85 backdrop-blur-md border-primary/50 shadow-md ring-1 ring-primary/20"
                              : t.completed
                                ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/5 opacity-80"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          }`}
                          title="Click para ver más detalles del trabajo"
                        >
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`p-2 rounded-xl shrink-0 mt-0.5 transition-colors ${
                                  t.completed
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "bg-primary/10 text-primary"
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                                      t.completed
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : "bg-primary/10 text-primary"
                                    }`}
                                  >
                                    {t.type || "Trabajo"}
                                  </span>
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 text-primary transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                                <h4
                                  className={`font-extrabold text-xs mt-1.5 truncate ${
                                    t.completed
                                      ? "line-through text-zinc-400 dark:text-zinc-500"
                                      : "text-black dark:text-white"
                                  }`}
                                  style={{
                                    color: darkMode
                                      ? undefined
                                      : t.completed
                                        ? undefined
                                        : "#000000",
                                  }}
                                >
                                  {t.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400 mt-1 font-medium">
                                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                                    {subjectName}
                                  </span>
                                  {t.dueDate && (
                                    <span className="flex items-center gap-1 text-primary">
                                      <Clock className="w-3 h-3 text-primary" />
                                      <span>Entrega: {t.dueDate}</span>
                                    </span>
                                  )}
                                  <span
                                    className={`font-bold ${
                                      t.completed ? "text-emerald-500" : "text-amber-500"
                                    }`}
                                  >
                                    {t.completed ? "Completado" : "Pendiente"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Checkbox toggle status */}
                            {setTasks && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAcademicTask(t.id);
                                }}
                                className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                                  t.completed
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : "border-zinc-300 dark:border-zinc-700 hover:border-primary text-transparent hover:text-primary/50"
                                }`}
                                title={
                                  t.completed
                                    ? "Marcar como pendiente"
                                    : "Marcar como completado"
                                }
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-2 border-t border-primary/20 space-y-2 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-3 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider">
                                      Entrega Académica
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        t.completed
                                          ? "bg-emerald-500/20 text-emerald-500"
                                          : "bg-amber-500/20 text-amber-500"
                                      }`}
                                    >
                                      {t.completed ? "Completado" : "Pendiente"}
                                    </span>
                                  </div>
                                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                    {t.title}
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                                    <div>
                                      <span className="font-semibold text-zinc-400">Materia: </span>
                                      {subjectName}
                                    </div>
                                    {t.dueDate && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Fecha Límite: </span>
                                        {t.dueDate}
                                      </div>
                                    )}
                                    {t.type && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Tipo: </span>
                                        {t.type}
                                      </div>
                                    )}
                                    {t.grade !== undefined && t.grade !== null && (
                                      <div>
                                        <span className="font-semibold text-zinc-400">Calificación: </span>
                                        <span className="font-bold text-primary">{t.grade}</span>
                                      </div>
                                    )}
                                    {t.description && (
                                      <div className="col-span-full">
                                        <span className="font-semibold text-zinc-400">Descripción: </span>
                                        {t.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    return null;
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/10 dark:border-zinc-800/40 text-[10px] text-zinc-400 dark:text-zinc-500 text-center font-medium">
            *Nota: Al marcar las tareas, turnos o pagos como realizados aquí o
            en sus detalles, se actualizarán automáticamente en sus respectivas
            pestañas.
          </div>
        </div>
      </div>

      {/* Widgets under Calendar and Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Weather Widget - aligned with Calendario Unificado (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <WeatherWidget userProfile={userProfile} darkMode={darkMode} />
        </div>

        {/* Favorite Team Widget - aligned with Agenda Central Integrada (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <FavoriteTeamWidget
            favoriteTeamName={userProfile?.favoriteTeam}
            darkMode={darkMode}
            onScheduleMonthlyMatches={handleScheduleMatches}
            isScheduled={turnosCompromisos.some((t) => t.categoria === "Ocio" && t.id.startsWith("match-"))}
          />
        </div>
      </div>

      {/* Multi-Team Tracking Weekly Widget */}
      <div className="w-full relative z-30">
        <MultiTeamMatchWidget darkMode={darkMode} />
      </div>

      {/* DETAILED MODAL POPUP (Mini Menu Desplegado) */}
      {activeDetailItem &&
        createPortal(
          <div
            onClick={() => setActiveDetailItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl relative transition-all cursor-default ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-white shadow-primary/5"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-slate-200"
              }`}
            >
              {/* Close button */}
              <button
                onClick={() => setActiveDetailItem(null)}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Meal Details */}
              {activeDetailItem.type === "meal" &&
                (() => {
                  const matchedPlato = platos.find(
                    (p) => p.id === activeDetailItem.data.platoId,
                  );
                  const matchedAlimentos = [
                    alimentos.find((a) => a.id === matchedPlato?.alimentoId1),
                    alimentos.find((a) => a.id === matchedPlato?.alimentoId2),
                    alimentos.find((a) => a.id === matchedPlato?.alimentoId3),
                  ].filter(Boolean);

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                        <UtensilsCrossed className="w-4 h-4" />
                        <span>Organización Semanal / Comidas</span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                        {matchedPlato
                          ? matchedPlato.nombrePlato
                          : "Comida Desconocida"}
                      </h3>
                      <div className="text-xs text-zinc-400 font-bold bg-slate-50 dark:bg-black/60 p-3 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
                          Fecha del Menú
                        </p>
                        <p className="text-slate-800 dark:text-zinc-200 font-extrabold mt-0.5">
                          {formatDateFriendly(activeDetailItem.data.fecha)}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">
                          Ingredientes y Composición del Plato:
                        </h4>
                        {matchedAlimentos.length > 0 ? (
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {matchedAlimentos.map((ali: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60"
                              >
                                <p className="text-xs font-extrabold text-primary">
                                  {ali.mercaderiaName}
                                </p>
                                <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] text-zinc-400 font-semibold">
                                  {ali.ingrediente1 && (
                                    <div>
                                      <p className="text-[8px] uppercase tracking-wider text-zinc-500">
                                        Ingr. 1
                                      </p>
                                      <p className="text-zinc-700 dark:text-zinc-300 font-extrabold truncate">
                                        {ali.ingrediente1}
                                      </p>
                                      <p className="text-primary font-bold">
                                        {ali.cantidad1} {ali.unidad1}
                                      </p>
                                    </div>
                                  )}
                                  {ali.ingrediente2 && (
                                    <div>
                                      <p className="text-[8px] uppercase tracking-wider text-zinc-500">
                                        Ingr. 2
                                      </p>
                                      <p className="text-zinc-700 dark:text-zinc-300 font-extrabold truncate">
                                        {ali.ingrediente2}
                                      </p>
                                      <p className="text-primary font-bold">
                                        {ali.cantidad2} {ali.unidad2}
                                      </p>
                                    </div>
                                  )}
                                  {ali.ingrediente3 && (
                                    <div>
                                      <p className="text-[8px] uppercase tracking-wider text-zinc-500">
                                        Ingr. 3
                                      </p>
                                      <p className="text-zinc-700 dark:text-zinc-300 font-extrabold truncate">
                                        {ali.ingrediente3}
                                      </p>
                                      <p className="text-primary font-bold">
                                        {ali.cantidad3} {ali.unidad3}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-dashed border-zinc-700 text-center text-xs text-zinc-400 font-medium">
                            No hay ingredientes específicos guardados para este
                            plato en tu despensa.
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setActiveDetailItem(null)}
                          className="px-5 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer"
                        >
                          Entendido / Cerrar
                        </button>
                      </div>
                    </div>
                  );
                })()}

              {/* Appointment Details */}
              {activeDetailItem.type === "appointment" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                    <Calendar className="w-4 h-4" />
                    <span>Agenda de Turnos y Citas Médicas</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                    {activeDetailItem.data.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Fecha del Turno
                      </p>
                      <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                        {formatDateFriendly(activeDetailItem.data.date)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Hora del Turno
                      </p>
                      <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                        {activeDetailItem.data.time || "Sin especificar"} hs
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Ubicación / Consultorio / Dirección
                      </p>
                      <p className="font-bold mt-1 text-zinc-700 dark:text-zinc-300">
                        {activeDetailItem.data.location || "No especificada"}
                      </p>
                    </div>
                    {(activeDetailItem.data.doctorName ||
                      activeDetailItem.data.specialty) && (
                      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl col-span-2">
                        <p className="text-[9px] uppercase tracking-wider text-primary font-bold">
                          Médico / Especialista
                        </p>
                        <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-100">
                          {activeDetailItem.data.doctorName || "No asignado"}
                        </p>
                        {activeDetailItem.data.specialty && (
                          <p className="text-[10px] text-primary font-bold mt-0.5">
                            {activeDetailItem.data.specialty}
                          </p>
                        )}
                      </div>
                    )}
                    {activeDetailItem.data.notes && (
                      <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                          Notas Adicionales
                        </p>
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400 whitespace-pre-line font-medium">
                          {activeDetailItem.data.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveDetailItem(null)}
                      className="px-5 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer text-primary"
                    >
                      Cerrar Detalle
                    </button>
                  </div>
                </div>
              )}

              {/* TurnoCompromiso Details */}
              {activeDetailItem.type === "turno" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pr-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                      <Calendar className="w-4 h-4" />
                      <span>{activeDetailItem.data.categoria}</span>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide ${
                        activeDetailItem.data.estatus
                          ? "bg-primary/10 text-primary"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {activeDetailItem.data.estatus
                        ? "Completado"
                        : "Pendiente"}
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                    {activeDetailItem.data.descripcion.replace(/⚽\s*/g, "")}
                  </h3>

                  {(() => {
                    const modalLogos = getMatchTeamLogos(activeDetailItem.data);
                    if (!modalLogos) return null;
                    return (
                      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/50 flex flex-wrap items-center justify-center gap-4 my-3">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 justify-end min-w-0 flex-1">
                          {modalLogos.homeLogo ? (
                            <img
                              src={modalLogos.homeLogo}
                              alt={modalLogos.homeTeam || "Local"}
                              className="w-10 h-10 object-contain drop-shadow-xs"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <Shield className="w-10 h-10 text-zinc-400" />
                          )}
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100 truncate max-w-[120px]">
                            {modalLogos.homeTeam || "Local"}
                          </span>
                        </div>

                        {/* VS */}
                        <div className="px-1 shrink-0 text-center">
                          <span className="text-xs font-black text-primary bg-primary/20 px-3 py-1 rounded-full border border-primary/30 uppercase tracking-widest">
                            VS
                          </span>
                          {modalLogos.competition && (
                            <p className="text-[9px] font-extrabold text-primary mt-1.5 uppercase max-w-[100px] truncate">
                              {modalLogos.competition}
                            </p>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2 justify-start min-w-0 flex-1">
                          {modalLogos.awayLogo ? (
                            <img
                              src={modalLogos.awayLogo}
                              alt={modalLogos.awayTeam || "Visitante"}
                              className="w-10 h-10 object-contain drop-shadow-xs"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <Shield className="w-10 h-10 text-zinc-400" />
                          )}
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-zinc-100 truncate max-w-[120px]">
                            {modalLogos.awayTeam || "Visitante"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Fecha programada
                      </p>
                      <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                        {formatDateFriendly(activeDetailItem.data.fecha)}
                      </p>
                    </div>
                    {activeDetailItem.data.lugar &&
                      activeDetailItem.data.lugar.trim() &&
                      activeDetailItem.data.lugar.toLowerCase() !== "sin dirección" &&
                      activeDetailItem.data.lugar.toLowerCase() !== "sin direccion" &&
                      activeDetailItem.data.lugar.toLowerCase() !== "sin lugar asignado" && (
                      <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                          Lugar
                        </p>
                        <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                          {activeDetailItem.data.lugar}
                        </p>
                      </div>
                    )}
                    {activeDetailItem.data.doctor && (
                      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl col-span-2">
                        <p className="text-[9px] uppercase tracking-wider text-primary font-bold">
                          Médico / Profesional a cargo
                        </p>
                        <p className="font-extrabold mt-1 text-black dark:text-white" style={{ color: darkMode ? undefined : '#000000' }}>
                          {activeDetailItem.data.doctor}
                        </p>
                      </div>
                    )}
                    {(activeDetailItem.data.estudioInformeDoc ||
                      activeDetailItem.data.pedidoDocumento) && (
                      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl col-span-2 space-y-2">
                        <p className="text-[9px] uppercase tracking-wider text-primary font-bold">
                          Documentos vinculados
                        </p>
                        {activeDetailItem.data.estudioInformeDoc && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span>
                              Informe: {activeDetailItem.data.estudioInformeDoc}
                            </span>
                          </div>
                        )}
                        {activeDetailItem.data.pedidoDocumento && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span>
                              Pedido: {activeDetailItem.data.pedidoDocumento}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-zinc-800/10 dark:border-zinc-800/30 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setActiveDetailItem(null)}
                      className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => {
                        handleToggleTurnoStatus(activeDetailItem.data.id);
                        setActiveDetailItem((prev) =>
                          prev
                            ? {
                                ...prev,
                                data: {
                                  ...prev.data,
                                  estatus: !prev.data.estatus,
                                },
                              }
                            : null,
                        );
                      }}
                      className={`px-4 py-2.5 rounded-full text-xs font-extrabold cursor-pointer transition-all flex items-center gap-2 ${
                        activeDetailItem.data.estatus
                          ? "bg-primary/10 text-primary hover:bg-primary/10"
                          : "bg-primary text-white dark:text-blue-950 hover:bg-primary"
                      }`}
                    >
                      {activeDetailItem.data.estatus
                        ? "Marcar como Pendiente"
                        : "Marcar como Completado"}
                    </button>
                  </div>
                </div>
              )}

              {/* Invoice Details */}
              {activeDetailItem.type === "invoice" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pr-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                      <DollarSign className="w-4 h-4" />
                      <span>Facturas / Gastos</span>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide ${
                        activeDetailItem.data.paid
                          ? "bg-primary/10 text-primary"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {activeDetailItem.data.paid
                        ? "Pagado"
                        : "Pendiente de Pago"}
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                    Vencimiento: {activeDetailItem.data.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Fecha de Vencimiento
                      </p>
                      <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                        {formatDateFriendly(activeDetailItem.data.dueDate)}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Monto Total
                      </p>
                      <p className="font-extrabold text-sm text-primary mt-1">
                        ${activeDetailItem.data.amount.toLocaleString("es-AR")}{" "}
                        ARS
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Categoría de Gasto
                      </p>
                      <p className="font-bold mt-1 text-zinc-700 dark:text-zinc-300">
                        {activeDetailItem.data.category}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/10 dark:border-zinc-800/30 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setActiveDetailItem(null)}
                      className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => {
                        handleToggleInvoiceStatus(activeDetailItem.data.id);
                        setActiveDetailItem((prev) =>
                          prev
                            ? {
                                ...prev,
                                data: { ...prev.data, paid: !prev.data.paid },
                              }
                            : null,
                        );
                      }}
                      className={`px-4 py-2.5 rounded-full text-xs font-extrabold cursor-pointer transition-all flex items-center gap-2 ${
                        activeDetailItem.data.paid
                          ? "bg-primary/10 text-primary hover:bg-primary/10"
                          : "bg-primary text-white dark:text-blue-950 hover:bg-primary"
                      }`}
                    >
                      {activeDetailItem.data.paid
                        ? "Marcar como Impago"
                        : "Marcar como Pagado"}
                    </button>
                  </div>
                </div>
              )}

              {/* DetailedPayment Details */}
              {activeDetailItem.type === "detailedPayment" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pr-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold w-fit">
                      <DollarSign className="w-4 h-4" />
                      <span>{activeDetailItem.data.categoria}</span>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide ${
                        activeDetailItem.data.pago
                          ? "bg-primary/10 text-primary"
                          : "bg-red-500/15 text-red-500"
                      }`}
                    >
                      {activeDetailItem.data.pago ? "Liquidado" : "Pendiente"}
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                    {activeDetailItem.data.descripcion}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Fecha de Vencimiento de Pago
                      </p>
                      <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                        {formatDateFriendly(
                          activeDetailItem.data.fechaVencimiento,
                        )}
                      </p>
                    </div>
                    {activeDetailItem.data.fechaCierre && (
                      <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                          Fecha de Cierre Resumen
                        </p>
                        <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                          {formatDateFriendly(
                            activeDetailItem.data.fechaCierre,
                          )}
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Monto a Liquidar
                      </p>
                      <p className="font-extrabold text-sm text-primary mt-1">
                        $
                        {activeDetailItem.data.montoAPagar.toLocaleString(
                          "es-AR",
                        )}{" "}
                        ARS
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Método de Pago
                      </p>
                      <p className="font-bold mt-1 text-zinc-700 dark:text-zinc-300">
                        {activeDetailItem.data.metodoPago || "Sin especificar"}
                      </p>
                    </div>
                    {activeDetailItem.data.conQuePagar && (
                      <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold font-bold">
                          Fondo / Con qué Pagar
                        </p>
                        <p className="font-semibold mt-1 text-zinc-700 dark:text-zinc-300">
                          {activeDetailItem.data.conQuePagar}
                        </p>
                      </div>
                    )}
                    {activeDetailItem.data.dondePagar && (
                      <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold font-bold">
                          Canal / Dónde Pagar
                        </p>
                        <p className="font-semibold mt-1 text-zinc-700 dark:text-zinc-300">
                          {activeDetailItem.data.dondePagar}
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Tipo Recurrencia
                      </p>
                      <p className="font-bold mt-1 text-zinc-700 dark:text-zinc-300">
                        {activeDetailItem.data.pagoRecurrente
                          ? "Mensual Recurrente"
                          : "Pago Único"}
                      </p>
                    </div>
                    {(activeDetailItem.data.facturaEmitida ||
                      activeDetailItem.data.comprobantePago) && (
                      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl col-span-2 space-y-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-primary font-bold">
                          Adjuntos y Comprobantes
                        </p>
                        {activeDetailItem.data.facturaEmitida && (
                          <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                            📄 Factura: {activeDetailItem.data.facturaEmitida}
                          </p>
                        )}
                        {activeDetailItem.data.comprobantePago && (
                          <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                            🧾 Comprobante:{" "}
                            {activeDetailItem.data.comprobantePago}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-zinc-800/10 dark:border-zinc-800/30 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setActiveDetailItem(null)}
                      className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      onClick={() => {
                        handleToggleDetailedPaymentStatus(
                          activeDetailItem.data.id,
                        );
                        setActiveDetailItem((prev) =>
                          prev
                            ? {
                                ...prev,
                                data: { ...prev.data, pago: !prev.data.pago },
                              }
                            : null,
                        );
                      }}
                      className={`px-4 py-2.5 rounded-full text-xs font-extrabold cursor-pointer transition-all flex items-center gap-2 ${
                        activeDetailItem.data.pago
                          ? "bg-primary/10 text-primary hover:bg-primary/10"
                          : "bg-primary text-white dark:text-blue-950 hover:bg-primary"
                      }`}
                    >
                      {activeDetailItem.data.pago
                        ? "Marcar como Impago"
                        : "Marcar como Liquidado"}
                    </button>
                  </div>
                </div>
              )}

              {/* Medication Details */}
              {activeDetailItem.type === "medication" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pr-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-container text-primary rounded-xl text-xs font-bold w-fit">
                      <Stethoscope className="w-4 h-4" />
                      <span>Salud / Control de Stock</span>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide ${
                        activeDetailItem.data.details.estado ===
                        "Comprar Medicamento"
                          ? "bg-red-500/15 text-red-500"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {activeDetailItem.data.details.estado}
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 pr-8">
                    {activeDetailItem.data.details.marca}
                  </h3>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {activeDetailItem.data.details.droga && (
                      <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                        <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                          Droga / Principio Activo
                        </p>
                        <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                          {activeDetailItem.data.details.droga}
                        </p>
                      </div>
                    )}
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Fecha Límite Disponible
                      </p>
                      <p className="font-extrabold mt-1 text-slate-800 dark:text-zinc-200">
                        {formatDateFriendly(
                          activeDetailItem.data.details.disponibleHasta,
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Cantidad Disponible
                      </p>
                      <p className="font-extrabold text-sm text-primary mt-1">
                        {Math.round(
                          activeDetailItem.data.details.cantidadDisponible,
                        )}{" "}
                        unidades
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Disponible para
                      </p>
                      <p className="font-bold mt-1 text-zinc-700 dark:text-zinc-300">
                        {Math.ceil(
                          activeDetailItem.data.details.disponibleParaDias,
                        )}{" "}
                        días
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-black/40 border border-slate-100 dark:border-zinc-800/60 rounded-xl col-span-2">
                      <p className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                        Tratamiento / Función
                      </p>
                      <p className="font-bold mt-1 text-zinc-700 dark:text-zinc-300">
                        {activeDetailItem.data.details.funcionTratamiento ||
                          "No especificada"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/10 dark:border-zinc-800/30 flex items-center justify-end">
                    <button
                      onClick={() => setActiveDetailItem(null)}
                      className="px-4 py-2.5 rounded-full bg-zinc-500/10 hover:bg-zinc-500/20 text-xs font-bold cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Custom Context Menu Backdrop & Floating Context Menu rendered via Portal */}
      {contextMenu &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-50 bg-transparent cursor-default"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
              }}
            />

            <div
              style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
              className="fixed z-[60] min-w-[220px] bg-white dark:bg-black/85 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 animate-fade-in text-slate-800 dark:text-zinc-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-1.5">
                <p className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400">
                  Opciones de Evento
                </p>
                <p className="text-xs font-bold truncate mt-0.5 max-w-[190px]">
                  {contextMenu.itemType === "appointment" &&
                    contextMenu.data.title}
                  {contextMenu.itemType === "turno" &&
                    contextMenu.data.descripcion}
                  {contextMenu.itemType === "invoice" && contextMenu.data.title}
                  {contextMenu.itemType === "detailedPayment" &&
                    contextMenu.data.descripcion}
                  {contextMenu.itemType === "meal" && "Comida Planeada"}
                  {contextMenu.itemType === "medication" &&
                    contextMenu.data.details.marca}
                </p>
              </div>
              <button
                onClick={() => {
                  setSharingModalItem({
                    type: contextMenu.itemType,
                    data: contextMenu.data,
                  });
                  setCustomShareEmail("");
                  setSharingModalOpen(true);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-primary/10 hover:text-primary rounded-full transition-all text-left cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-primary" />
                <span>Compartir solo esta nota...</span>
              </button>

              {/* List of users currently having access */}
              {(() => {
                const sharingUsers = outgoingShares.filter((share) =>
                  isItemSharedWith(
                    share,
                    contextMenu.itemType,
                    contextMenu.data,
                  ),
                );
                if (sharingUsers.length > 0) {
                  return (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-1.5 mt-1.5 px-3">
                      <p className="text-[9px] uppercase font-extrabold text-red-500 mb-1">
                        Dejar de compartir con:
                      </p>
                      <div className="space-y-1 max-h-[100px] overflow-y-auto">
                        {sharingUsers.map((share) => (
                          <button
                            key={share.id}
                            onClick={() => {
                              handleToggleShareForUser(
                                share,
                                contextMenu.itemType,
                                contextMenu.data,
                              );
                              setContextMenu(null);
                            }}
                            className="w-full flex items-center justify-between text-[10px] font-bold text-zinc-500 hover:text-red-500 py-1 transition-all text-left truncate cursor-pointer"
                            title={`Quitar acceso a ${share.toEmail}`}
                          >
                            <span className="truncate max-w-[140px]">
                              {share.toEmail}
                            </span>
                            <X className="w-3 h-3 text-red-500 shrink-0 ml-1.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <button
                onClick={() => {
                  setActiveDetailItem({
                    type: contextMenu.itemType as any,
                    data: contextMenu.data,
                  });
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-all text-left cursor-pointer mt-1"
              >
                <Info className="w-4 h-4 text-zinc-400" />
                <span>Ver detalles</span>
              </button>
            </div>
          </>,
          document.body,
        )}

      {/* Select User Sharing Modal */}
      {sharingModalOpen &&
        sharingModalItem &&
        createPortal(
          <div
            onClick={() => {
              setSharingModalOpen(false);
              setSharingModalItem(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border cursor-default ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-white"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary" />
                  <h3 className="font-extrabold text-sm">
                    Compartir Evento Único
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSharingModalOpen(false);
                    setSharingModalItem(null);
                  }}
                  className="p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="my-4 p-3 rounded-2xl bg-zinc-500/5 border border-zinc-500/10 space-y-1">
                <p className="text-[9px] uppercase font-bold text-zinc-400">
                  Evento seleccionado:
                </p>
                <p className="text-xs font-extrabold text-black dark:text-white" style={{ color: darkMode ? undefined : '#000000' }}>
                  {sharingModalItem.type === "appointment" &&
                    sharingModalItem.data.title}
                  {sharingModalItem.type === "turno" &&
                    sharingModalItem.data.descripcion}
                  {sharingModalItem.type === "invoice" &&
                    sharingModalItem.data.title}
                  {sharingModalItem.type === "detailedPayment" &&
                    sharingModalItem.data.descripcion}
                  {sharingModalItem.type === "meal" &&
                    "Menú Diario Planificado"}
                  {sharingModalItem.type === "medication" &&
                    sharingModalItem.data.details.marca}
                </p>
                <p className="text-[9px] text-zinc-400 font-semibold">
                  Categoría:{" "}
                  <span className="font-extrabold uppercase">
                    {sharingModalItem.type === "appointment" &&
                      "Turnos / Citas"}
                    {sharingModalItem.type === "turno" && "Turnos / Citas"}
                    {sharingModalItem.type === "invoice" && "Finanzas"}
                    {sharingModalItem.type === "detailedPayment" && "Finanzas"}
                    {sharingModalItem.type === "meal" && "Comidas"}
                    {sharingModalItem.type === "medication" && "Salud"}
                  </span>
                </p>
              </div>

              {/* Selection Mode Selector */}
              <div className="mb-4">
                <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
                  Modo de Compartido:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSpecificShareMode("append")}
                    className={`py-2 px-3 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                      specificShareMode === "append"
                        ? "bg-white dark:bg-black/85 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-primary shadow-sm"
                        : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                    }`}
                    title="Añadirá este evento a los elementos que ya estás compartiendo con este usuario"
                  >
                    Añadir al Compartido
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpecificShareMode("only")}
                    className={`py-2 px-3 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                      specificShareMode === "only"
                        ? "bg-white dark:bg-black/85 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-primary shadow-sm"
                        : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                    }`}
                    title="Sobrescribirá la configuración del usuario para que SOLO vea esta nota"
                  >
                    Compartir SOLO esta nota
                  </button>
                </div>
              </div>

              {/* List of existing shared users */}
              <div className="space-y-2 mb-4">
                <label className="block text-[10px] uppercase font-bold text-zinc-400">
                  Usuarios Existentes (con los que ya compartiste):
                </label>
                {outgoingShares.length === 0 ? (
                  <p className="text-[10px] text-zinc-400 italic">
                    No tienes ningún usuario con agenda compartida todavía.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                    {outgoingShares.map((share) => {
                      const isShared = isItemSharedWith(
                        share,
                        sharingModalItem.type,
                        sharingModalItem.data,
                      );
                      return (
                        <div
                          key={share.id}
                          className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-left transition-all text-xs font-bold flex items-center justify-between gap-3 bg-zinc-500/5"
                        >
                          <span className="truncate flex-1 font-bold">
                            {share.toEmail}
                          </span>
                          {isShared ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold bg-primary/10 text-primary uppercase tracking-wide">
                                Compartido
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleShareForUser(
                                    share,
                                    sharingModalItem.type,
                                    sharingModalItem.data,
                                  )
                                }
                                className="px-2 py-1 text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-full transition-all cursor-pointer flex items-center gap-1"
                                title="Dejar de compartir esta nota con este usuario"
                              >
                                <X className="w-3 h-3" />
                                <span>Quitar</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleShareForUser(
                                  share,
                                  sharingModalItem.type,
                                  sharingModalItem.data,
                                )
                              }
                              className="px-2.5 py-1 text-[9px] bg-primary hover:bg-primary text-white dark:text-blue-950 font-extrabold rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              title="Compartir esta nota con este usuario"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Compartir</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Share with new user */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                <label className="block text-[10px] uppercase font-bold text-zinc-400">
                  Compartir con Nuevo Correo:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="nuevo-usuario@correo.com"
                    value={customShareEmail}
                    onChange={(e) => setCustomShareEmail(e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold outline-hidden transition-all border ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary/20"
                        : "bg-slate-50 border-zinc-200 text-zinc-800 focus:border-primary/20"
                    }`}
                  />
                  <button
                    onClick={() => {
                      const email = customShareEmail.trim();
                      if (!email) {
                        alert("Por favor, introduce un correo electrónico.");
                        return;
                      }
                      handleShareSpecificItem(
                        email,
                        sharingModalItem.type,
                        sharingModalItem.data,
                        specificShareMode,
                      );
                    }}
                    className="px-4 py-2 bg-primary hover:bg-primary text-white dark:text-blue-950 font-extrabold text-xs rounded-full transition-all cursor-pointer"
                  >
                    Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmUnshareId}
        title="Dejar de Compartir"
        message="¿Seguro que quieres dejar de compartir con este usuario?"
        onConfirm={async () => {
          if (confirmUnshareId) {
            await executeUnshare(confirmUnshareId);
          }
        }}
        onClose={() => setConfirmUnshareId(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
