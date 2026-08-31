import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  Share2,
  Users,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  UtensilsCrossed,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { AgendaShare } from "../types";
import { createShare, updateShare, deleteShare } from "../lib/sharing";
import { SmartDateTimePicker } from "./SmartDateTimePicker";

interface AgendaSharingManagerProps {
  user: any;
  darkMode?: boolean;
  outgoingShares?: AgendaShare[];
  incomingShares?: AgendaShare[];
  appointments?: any[];
  turnosCompromisos?: any[];
  invoices?: any[];
  detailedPayments?: any[];
  organizacionSemanal?: any[];
  platos?: any[];
  disponibilidadMedicamentos?: any[];
  medicamentosDetallados?: any[];
}

export function AgendaSharingManager({
  user,
  darkMode = false,
  outgoingShares = [],
  incomingShares = [],
  appointments = [],
  turnosCompromisos = [],
  invoices = [],
  detailedPayments = [],
  organizacionSemanal = [],
  platos = [],
  disponibilidadMedicamentos = [],
  medicamentosDetallados = [],
}: AgendaSharingManagerProps) {
  // Accordion collapse states
  const [showMySharePanel, setShowMySharePanel] = useState(true);
  const [showSharedWithMe, setShowSharedWithMe] = useState(true);

  // New share form states
  const [shareEmailInput, setShareEmailInput] = useState("");
  const [shareCategories, setShareCategories] = useState({
    turnos: true,
    finanzas: true,
    comidas: true,
    salud: true,
  });
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmUnshareId, setConfirmUnshareId] = useState<string | null>(null);

  // Specific selected items to share
  const [selectedTurnoCompromisoIds, setSelectedTurnoCompromisoIds] = useState<string[]>([]);
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [selectedDetailedPaymentIds, setSelectedDetailedPaymentIds] = useState<string[]>([]);
  const [selectedOrganizacionSemanalIds, setSelectedOrganizacionSemanalIds] = useState<string[]>([]);
  const [selectedDisponibilidadMedicamentoIds, setSelectedDisponibilidadMedicamentoIds] = useState<string[]>([]);

  // Incoming shares states
  const [selectedIncomingShareId, setSelectedIncomingShareId] = useState<string | null>(
    incomingShares.length > 0 ? (incomingShares[0].id || null) : null
  );
  const [selectedViewDate, setSelectedViewDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareError(null);
    setShareSuccess(null);

    const email = shareEmailInput.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setShareError("Por favor, introduce un correo electrónico válido.");
      return;
    }

    const currentEmail = user?.email?.toLowerCase();
    if (!currentEmail) {
      setShareError("Debes iniciar sesión para compartir tu agenda.");
      return;
    }

    if (email === currentEmail) {
      setShareError("No puedes compartir tu agenda contigo mismo.");
      return;
    }

    const alreadyShared = outgoingShares.some(
      (s) => s.toEmail.toLowerCase() === email
    );
    if (alreadyShared) {
      setShareError("Ya estás compartiendo tu agenda con este usuario.");
      return;
    }

    setIsSubmitting(true);
    try {
      const filteredData: any = {};
      if (shareCategories.turnos) {
        filteredData.appointments = appointments.filter((a) =>
          selectedAppointmentIds.includes(a.id)
        );
        filteredData.turnosCompromisos = turnosCompromisos.filter((t) =>
          selectedTurnoCompromisoIds.includes(t.id)
        );
      }
      if (shareCategories.finanzas) {
        filteredData.invoices = invoices.filter((i) =>
          selectedInvoiceIds.includes(i.id)
        );
        filteredData.detailedPayments = detailedPayments.filter((d) =>
          selectedDetailedPaymentIds.includes(d.id)
        );
      }
      if (shareCategories.comidas) {
        filteredData.organizacionSemanal = organizacionSemanal.filter((o) =>
          selectedOrganizacionSemanalIds.includes(o.id)
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
        sharedDisponibilidadMedicamentoIds: selectedDisponibilidadMedicamentoIds,
      };

      await createShare(
        currentEmail,
        email,
        shareCategories,
        filteredData,
        idsPayload
      );

      setShareSuccess(`¡Agenda compartida con éxito con ${email}!`);
      setShareEmailInput("");
      setSelectedTurnoCompromisoIds([]);
      setSelectedAppointmentIds([]);
      setSelectedInvoiceIds([]);
      setSelectedDetailedPaymentIds([]);
      setSelectedOrganizacionSemanalIds([]);
      setSelectedDisponibilidadMedicamentoIds([]);
    } catch (err: any) {
      setShareError("Error al compartir: " + (err.message || "Error desconocido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateShareCategory = async (
    share: AgendaShare,
    category: keyof AgendaShare["categories"]
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
      sharedDisponibilidadMedicamentoIds: share.sharedDisponibilidadMedicamentoIds || [],
    };

    const filteredData: any = {
      platos: platos,
      medicamentosDetallados: medicamentosDetallados,
    };

    if (updatedCategories.turnos) {
      filteredData.appointments = appointments.filter((a) =>
        idsPayload.sharedAppointmentIds.includes(a.id)
      );
      filteredData.turnosCompromisos = turnosCompromisos.filter((t) =>
        idsPayload.sharedTurnoCompromisoIds.includes(t.id)
      );
    }
    if (updatedCategories.finanzas) {
      filteredData.invoices = invoices.filter((i) =>
        idsPayload.sharedInvoiceIds.includes(i.id)
      );
      filteredData.detailedPayments = detailedPayments.filter((d) =>
        idsPayload.sharedDetailedPaymentIds.includes(d.id)
      );
    }
    if (updatedCategories.comidas) {
      filteredData.organizacionSemanal = organizacionSemanal.filter((o) =>
        idsPayload.sharedOrganizacionSemanalIds.includes(o.id)
      );
    }
    if (updatedCategories.salud) {
      filteredData.disponibilidadMedicamentos = (
        disponibilidadMedicamentos || []
      ).filter((d) =>
        idsPayload.sharedDisponibilidadMedicamentoIds.includes(d.id)
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
    itemId: string
  ) => {
    const idsPayload = {
      sharedTurnoCompromisoIds: share.sharedTurnoCompromisoIds || [],
      sharedAppointmentIds: share.sharedAppointmentIds || [],
      sharedInvoiceIds: share.sharedInvoiceIds || [],
      sharedDetailedPaymentIds: share.sharedDetailedPaymentIds || [],
      sharedOrganizacionSemanalIds: share.sharedOrganizacionSemanalIds || [],
      sharedDisponibilidadMedicamentoIds: share.sharedDisponibilidadMedicamentoIds || [],
    };

    let key: keyof typeof idsPayload;
    if (itemType === "turno") key = "sharedTurnoCompromisoIds";
    else if (itemType === "appointment") key = "sharedAppointmentIds";
    else if (itemType === "invoice") key = "sharedInvoiceIds";
    else if (itemType === "detailedPayment") key = "sharedDetailedPaymentIds";
    else if (itemType === "organizacionSemanal") key = "sharedOrganizacionSemanalIds";
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
        updatedIdsPayload.sharedAppointmentIds.includes(a.id)
      ),
      turnosCompromisos: turnosCompromisos.filter((t) =>
        updatedIdsPayload.sharedTurnoCompromisoIds.includes(t.id)
      ),
      invoices: invoices.filter((i) =>
        updatedIdsPayload.sharedInvoiceIds.includes(i.id)
      ),
      detailedPayments: detailedPayments.filter((d) =>
        updatedIdsPayload.sharedDetailedPaymentIds.includes(d.id)
      ),
      organizacionSemanal: organizacionSemanal.filter((o) =>
        updatedIdsPayload.sharedOrganizacionSemanalIds.includes(o.id)
      ),
      disponibilidadMedicamentos: (disponibilidadMedicamentos || []).filter(
        (d) => updatedIdsPayload.sharedDisponibilidadMedicamentoIds.includes(d.id)
      ),
      platos: platos,
      medicamentosDetallados: medicamentosDetallados,
    };

    try {
      await updateShare(
        share.id!,
        share.categories,
        updatedAgendaData,
        updatedIdsPayload
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

  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return dateStr;
  };

  const getHoraFromFecha = (fecha: string) => {
    if (!fecha) return "";
    if (fecha.includes("T")) return fecha.split("T")[1]?.substring(0, 5) || "";
    if (fecha.includes(" ")) return fecha.split(" ")[1]?.substring(0, 5) || "";
    return "";
  };

  const getSharedEventsForDate = (dateStr: string, share: AgendaShare) => {
    if (!share || !share.agendaData) return null;
    const data = share.agendaData;
    const cats = share.categories;

    const matchedAppointments = (cats?.turnos && data.appointments ? data.appointments : []).filter(
      (a) => a.date === dateStr || (a.date && a.date.startsWith(dateStr))
    );
    const matchedTurnos = (cats?.turnos && data.turnosCompromisos ? data.turnosCompromisos : []).filter(
      (t) => t.fecha === dateStr || (t.fecha && t.fecha.startsWith(dateStr))
    );
    const matchedInvoices = (cats?.finanzas && data.invoices ? data.invoices : []).filter(
      (i) => i.dueDate === dateStr || (i.dueDate && i.dueDate.startsWith(dateStr))
    );
    const matchedPayments = (cats?.finanzas && data.detailedPayments ? data.detailedPayments : []).filter(
      (p) => p.fechaVencimiento === dateStr || (p.fechaVencimiento && p.fechaVencimiento.startsWith(dateStr))
    );
    const matchedMeals = (cats?.comidas && data.organizacionSemanal ? data.organizacionSemanal : []).filter(
      (m) => m.fecha === dateStr || (m.fecha && m.fecha.startsWith(dateStr))
    );
    const matchedMeds = cats?.salud && data.disponibilidadMedicamentos
      ? data.disponibilidadMedicamentos
          .map((disp) => {
            const details = (data.medicamentosDetallados || []).find(
              (m) => m.id === disp.medicamentoId
            );
            return details ? { disp, details } : null;
          })
          .filter(Boolean) as { disp: any; details: any }[]
      : [];

    return {
      appointments: matchedAppointments,
      turnos: matchedTurnos,
      invoices: matchedInvoices,
      detailedPayments: matchedPayments,
      meals: matchedMeals,
      platos: data.platos || [],
      medications: matchedMeds,
    };
  };

  return (
    <div className="space-y-6">
      {/* 1. SECCIÓN: COMPARTIR AGENDA CENTRAL INTEGRADA */}
      <div className="space-y-3">
        <div
          onClick={() => setShowMySharePanel(!showMySharePanel)}
          className={`flex items-center justify-between p-4.5 border rounded-2xl cursor-pointer transition-all shadow-xs ${
            darkMode
              ? "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800"
              : "bg-white hover:bg-slate-50/80 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                  Compartir Agenda Central Integrada
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" /> Sincronización en tiempo real
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                Permite que otros usuarios visualicen tu planificación en tiempo real.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 transition-colors cursor-pointer"
          >
            {showMySharePanel ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showMySharePanel && (
            <motion.div
              key="my-share-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                className={`border rounded-2xl p-5 ${
                  darkMode
                    ? "bg-zinc-900/40 border-zinc-800/80 text-white"
                    : "bg-white border-slate-200 text-zinc-800 shadow-xs"
                }`}
              >
                {!user ? (
                  <div className="p-6 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-xs text-zinc-400 font-semibold space-y-2">
                    <p>
                      Debes iniciar sesión con tu cuenta para usar la sincronización y el compartido en la nube.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Formulario para compartir */}
                    <form onSubmit={handleCreateShare} className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Compartir con Nuevo Usuario
                      </h4>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                          Correo Electrónico del Destinatario
                        </label>
                        <input
                          type="email"
                          value={shareEmailInput}
                          onChange={(e) => setShareEmailInput(e.target.value)}
                          placeholder="ejemplo@correo.com"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-hidden transition-all border ${
                            darkMode
                              ? "bg-zinc-900 border-zinc-800 text-white focus:border-primary focus:ring-1 focus:ring-primary"
                              : "bg-slate-50 border-zinc-200 text-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-2">
                          Módulos a compartir:
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <button
                            type="button"
                            onClick={() =>
                              setShareCategories((prev) => ({
                                ...prev,
                                turnos: !prev.turnos,
                              }))
                            }
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              shareCategories.turnos
                                ? "bg-primary/10 border-primary text-primary shadow-xs"
                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                            }`}
                          >
                            <span>Turnos / Citas</span>
                            <Check
                              className={`w-4 h-4 shrink-0 transition-opacity ${
                                shareCategories.turnos ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setShareCategories((prev) => ({
                                ...prev,
                                finanzas: !prev.finanzas,
                              }))
                            }
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              shareCategories.finanzas
                                ? "bg-primary/10 border-primary text-primary shadow-xs"
                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                            }`}
                          >
                            <span>Finanzas / Pagos</span>
                            <Check
                              className={`w-4 h-4 shrink-0 transition-opacity ${
                                shareCategories.finanzas ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setShareCategories((prev) => ({
                                ...prev,
                                comidas: !prev.comidas,
                              }))
                            }
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              shareCategories.comidas
                                ? "bg-primary/10 border-primary text-primary shadow-xs"
                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                            }`}
                          >
                            <span>Menú de Comidas</span>
                            <Check
                              className={`w-4 h-4 shrink-0 transition-opacity ${
                                shareCategories.comidas ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setShareCategories((prev) => ({
                                ...prev,
                                salud: !prev.salud,
                              }))
                            }
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              shareCategories.salud
                                ? "bg-primary/10 border-primary text-primary shadow-xs"
                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                            }`}
                          >
                            <span>Salud / Remedios</span>
                            <Check
                              className={`w-4 h-4 shrink-0 transition-opacity ${
                                shareCategories.salud ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Selectores de elementos específicos */}
                        <div className="space-y-3">
                          {shareCategories.turnos && (
                            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 space-y-2 text-xs">
                              <p className="text-[10px] uppercase font-extrabold text-primary">
                                Selecciona Turnos y Citas a compartir:
                              </p>
                              {turnosCompromisos.length === 0 && appointments.length === 0 ? (
                                <p className="text-[10px] text-zinc-400 italic">
                                  No tienes turnos o citas creadas actualmente.
                                </p>
                              ) : (
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  {turnosCompromisos.map((t, idx) => {
                                    const isChecked = selectedTurnoCompromisoIds.includes(t.id);
                                    return (
                                      <label
                                        key={`tc-${t.id}-${idx}`}
                                        className="flex items-start justify-between gap-3 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-primary/10 cursor-pointer transition-colors"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-200 text-[11px] truncate">
                                            {t.descripcion}
                                          </p>
                                          <p className="text-[9px] text-zinc-400 font-bold uppercase">
                                            {t.fecha} • {t.lugar}
                                          </p>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            if (isChecked) {
                                              setSelectedTurnoCompromisoIds((prev) =>
                                                prev.filter((id) => id !== t.id)
                                              );
                                            } else {
                                              setSelectedTurnoCompromisoIds((prev) => [...prev, t.id]);
                                            }
                                          }}
                                          className="accent-primary rounded-sm w-3.5 h-3.5 shrink-0 mt-0.5 cursor-pointer"
                                        />
                                      </label>
                                    );
                                  })}
                                  {appointments.map((a, idx) => {
                                    const isChecked = selectedAppointmentIds.includes(a.id);
                                    return (
                                      <label
                                        key={`app-${a.id}-${idx}`}
                                        className="flex items-start justify-between gap-3 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-primary/10 cursor-pointer transition-colors"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-200 text-[11px] truncate">
                                            {a.title}
                                          </p>
                                          <p className="text-[9px] text-zinc-400 font-bold uppercase">
                                            {a.date} {a.time} • {a.location}
                                          </p>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            if (isChecked) {
                                              setSelectedAppointmentIds((prev) =>
                                                prev.filter((id) => id !== a.id)
                                              );
                                            } else {
                                              setSelectedAppointmentIds((prev) => [...prev, a.id]);
                                            }
                                          }}
                                          className="accent-primary rounded-sm w-3.5 h-3.5 shrink-0 mt-0.5 cursor-pointer"
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {shareCategories.finanzas && (
                            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 space-y-2 text-xs">
                              <p className="text-[10px] uppercase font-extrabold text-primary">
                                Selecciona Pagos y Facturas a compartir:
                              </p>
                              {detailedPayments.length === 0 && invoices.length === 0 ? (
                                <p className="text-[10px] text-zinc-400 italic">
                                  No tienes finanzas registradas.
                                </p>
                              ) : (
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  {detailedPayments.map((d) => {
                                    const isChecked = selectedDetailedPaymentIds.includes(d.id);
                                    return (
                                      <label
                                        key={d.id}
                                        className="flex items-start justify-between gap-3 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-primary/10 cursor-pointer transition-colors"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-200 text-[11px] truncate">
                                            {d.descripcion}
                                          </p>
                                          <p className="text-[9px] text-zinc-400 font-bold uppercase">
                                            Monto: ARS {d.montoAPagar?.toLocaleString()} • Vence: {d.fechaVencimiento}
                                          </p>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            if (isChecked) {
                                              setSelectedDetailedPaymentIds((prev) =>
                                                prev.filter((id) => id !== d.id)
                                              );
                                            } else {
                                              setSelectedDetailedPaymentIds((prev) => [...prev, d.id]);
                                            }
                                          }}
                                          className="accent-primary rounded-sm w-3.5 h-3.5 shrink-0 mt-0.5 cursor-pointer"
                                        />
                                      </label>
                                    );
                                  })}
                                  {invoices.map((i) => {
                                    const isChecked = selectedInvoiceIds.includes(i.id);
                                    return (
                                      <label
                                        key={i.id}
                                        className="flex items-start justify-between gap-3 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-primary/10 cursor-pointer transition-colors"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-200 text-[11px] truncate">
                                            {i.title}
                                          </p>
                                          <p className="text-[9px] text-zinc-400 font-bold uppercase">
                                            Monto: ARS {i.amount?.toLocaleString()} • Vence: {i.dueDate}
                                          </p>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            if (isChecked) {
                                              setSelectedInvoiceIds((prev) =>
                                                prev.filter((id) => id !== i.id)
                                              );
                                            } else {
                                              setSelectedInvoiceIds((prev) => [...prev, i.id]);
                                            }
                                          }}
                                          className="accent-primary rounded-sm w-3.5 h-3.5 shrink-0 mt-0.5 cursor-pointer"
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {shareCategories.comidas && (
                            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 space-y-2 text-xs">
                              <p className="text-[10px] uppercase font-extrabold text-primary">
                                Selecciona Comidas Planificadas a compartir:
                              </p>
                              {organizacionSemanal.length === 0 ? (
                                <p className="text-[10px] text-zinc-400 italic">
                                  No tienes planificación de comidas.
                                </p>
                              ) : (
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  {organizacionSemanal.map((o) => {
                                    const isChecked = selectedOrganizacionSemanalIds.includes(o.id);
                                    const matchedPlato = platos.find((p) => p.id === o.platoId);
                                    return (
                                      <label
                                        key={o.id}
                                        className="flex items-start justify-between gap-3 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-primary/10 cursor-pointer transition-colors"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-200 text-[11px] truncate">
                                            {matchedPlato ? matchedPlato.nombrePlato : "Plato planificado"}
                                          </p>
                                          <p className="text-[9px] text-zinc-400 font-bold uppercase">
                                            Fecha: {o.fecha}
                                          </p>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            if (isChecked) {
                                              setSelectedOrganizacionSemanalIds((prev) =>
                                                prev.filter((id) => id !== o.id)
                                              );
                                            } else {
                                              setSelectedOrganizacionSemanalIds((prev) => [...prev, o.id]);
                                            }
                                          }}
                                          className="accent-primary rounded-sm w-3.5 h-3.5 shrink-0 mt-0.5 cursor-pointer"
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {shareCategories.salud && (
                            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 space-y-2 text-xs">
                              <p className="text-[10px] uppercase font-extrabold text-primary">
                                Selecciona Control de Remedios a compartir:
                              </p>
                              {!disponibilidadMedicamentos || disponibilidadMedicamentos.length === 0 ? (
                                <p className="text-[10px] text-zinc-400 italic">
                                  No tienes control de medicamentos registrado.
                                </p>
                              ) : (
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  {disponibilidadMedicamentos.map((d) => {
                                    const isChecked = selectedDisponibilidadMedicamentoIds.includes(d.id);
                                    const med = medicamentosDetallados?.find((m) => m.id === d.medicamentoId);
                                    return (
                                      <label
                                        key={d.id}
                                        className="flex items-start justify-between gap-3 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 hover:bg-primary/10 cursor-pointer transition-colors"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-200 text-[11px] truncate">
                                            {med ? `${med.marca} (${med.droga})` : "Medicamento"}
                                          </p>
                                          <p className="text-[9px] text-zinc-400 font-bold uppercase">
                                            Registrado: {d.fechaRegistro} • Stock: {d.cantidadRegistrada}
                                          </p>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            if (isChecked) {
                                              setSelectedDisponibilidadMedicamentoIds((prev) =>
                                                prev.filter((id) => id !== d.id)
                                              );
                                            } else {
                                              setSelectedDisponibilidadMedicamentoIds((prev) => [...prev, d.id]);
                                            }
                                          }}
                                          className="accent-primary rounded-sm w-3.5 h-3.5 shrink-0 mt-0.5 cursor-pointer"
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {shareError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{shareError}</span>
                        </div>
                      )}

                      {shareSuccess && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{shareSuccess}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/10 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isSubmitting ? "Compartiendo..." : "Compartir Agenda"}</span>
                      </button>
                    </form>

                    {/* Listado de accesos compartidos otorgados */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Usuarios con Acceso a mi Agenda ({outgoingShares.length})
                      </h4>

                      {outgoingShares.length === 0 ? (
                        <div className="h-[280px] flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950/60 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center p-6">
                          <Users className="w-8 h-8 text-zinc-400 mb-2 opacity-50" />
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                            No estás compartiendo tu agenda actualmente.
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1 max-w-[240px]">
                            Agrega el correo electrónico de un familiar o colega para permitirle ver tu agenda.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                          {outgoingShares.map((share) => (
                            <div
                              key={share.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                                darkMode
                                  ? "bg-zinc-900/60 border-zinc-800/80"
                                  : "bg-slate-50/80 border-zinc-200/80"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                                    {share.toEmail}
                                  </p>
                                  <p className="text-[9px] text-zinc-400 font-semibold uppercase mt-0.5">
                                    Permisos activos (haz clic para alternar):
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnshare(share.id!)}
                                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors shrink-0 cursor-pointer"
                                  title="Dejar de compartir con este usuario"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateShareCategory(share, "turnos")}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                                    share.categories.turnos
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "bg-zinc-500/10 text-zinc-400 border border-transparent opacity-50"
                                  }`}
                                  title="Alternar permiso de Turnos / Citas"
                                >
                                  Turnos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateShareCategory(share, "finanzas")}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                                    share.categories.finanzas
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "bg-zinc-500/10 text-zinc-400 border border-transparent opacity-50"
                                  }`}
                                  title="Alternar permiso de Finanzas"
                                >
                                  Finanzas
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateShareCategory(share, "comidas")}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                                    share.categories.comidas
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "bg-zinc-500/10 text-zinc-400 border border-transparent opacity-50"
                                  }`}
                                  title="Alternar permiso de Comidas"
                                >
                                  Comidas
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateShareCategory(share, "salud")}
                                  className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer ${
                                    share.categories.salud
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "bg-zinc-500/10 text-zinc-400 border border-transparent opacity-50"
                                  }`}
                                  title="Alternar permiso de Salud"
                                >
                                  Salud
                                </button>
                              </div>

                              {/* Toggles específicos para esta conexión */}
                              <div className="space-y-2.5 mt-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                                {share.categories.turnos && (
                                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 space-y-1">
                                    <p className="text-[9px] uppercase font-bold text-primary">
                                      Turnos y Citas Compartidas (
                                      {(share.sharedTurnoCompromisoIds?.length || 0) +
                                        (share.sharedAppointmentIds?.length || 0)}
                                      ):
                                    </p>
                                    <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto pr-1">
                                      {turnosCompromisos.map((t) => {
                                        const isShared = share.sharedTurnoCompromisoIds?.includes(t.id);
                                        return (
                                          <button
                                            key={t.id}
                                            type="button"
                                            onClick={() =>
                                              handleToggleItemOnExistingShare(share, "turno", t.id)
                                            }
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer ${
                                              isShared
                                                ? "bg-primary/15 border-primary/30 text-primary font-bold"
                                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                                            }`}
                                          >
                                            {t.descripcion}
                                          </button>
                                        );
                                      })}
                                      {appointments.map((a) => {
                                        const isShared = share.sharedAppointmentIds?.includes(a.id);
                                        return (
                                          <button
                                            key={a.id}
                                            type="button"
                                            onClick={() =>
                                              handleToggleItemOnExistingShare(share, "appointment", a.id)
                                            }
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer ${
                                              isShared
                                                ? "bg-primary/15 border-primary/30 text-primary font-bold"
                                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                                            }`}
                                          >
                                            {a.title}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {share.categories.finanzas && (
                                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 space-y-1">
                                    <p className="text-[9px] uppercase font-bold text-primary">
                                      Finanzas Compartidas (
                                      {(share.sharedDetailedPaymentIds?.length || 0) +
                                        (share.sharedInvoiceIds?.length || 0)}
                                      ):
                                    </p>
                                    <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto pr-1">
                                      {detailedPayments.map((d) => {
                                        const isShared = share.sharedDetailedPaymentIds?.includes(d.id);
                                        return (
                                          <button
                                            key={d.id}
                                            type="button"
                                            onClick={() =>
                                              handleToggleItemOnExistingShare(share, "detailedPayment", d.id)
                                            }
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer ${
                                              isShared
                                                ? "bg-primary/15 border-primary/30 text-primary font-bold"
                                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                                            }`}
                                          >
                                            {d.descripcion}
                                          </button>
                                        );
                                      })}
                                      {invoices.map((i) => {
                                        const isShared = share.sharedInvoiceIds?.includes(i.id);
                                        return (
                                          <button
                                            key={i.id}
                                            type="button"
                                            onClick={() =>
                                              handleToggleItemOnExistingShare(share, "invoice", i.id)
                                            }
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all cursor-pointer ${
                                              isShared
                                                ? "bg-primary/15 border-primary/30 text-primary font-bold"
                                                : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400"
                                            }`}
                                          >
                                            {i.title}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. SECCIÓN: AGENDAS COMPARTIDAS CONMIGO */}
      <div className="space-y-3">
        <div
          onClick={() => setShowSharedWithMe(!showSharedWithMe)}
          className={`flex items-center justify-between p-4.5 border rounded-2xl cursor-pointer transition-all shadow-xs ${
            darkMode
              ? "bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800"
              : "bg-white hover:bg-slate-50/80 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                Agendas Compartidas Conmigo
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                Visualiza las actividades de las agendas que otros usuarios han compartido contigo.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-xl hover:bg-zinc-500/10 text-zinc-400 transition-colors cursor-pointer"
          >
            {showSharedWithMe ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showSharedWithMe && (
            <motion.div
              key="shared-with-me-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div
                className={`border rounded-2xl p-5 ${
                  darkMode
                    ? "bg-zinc-900/40 border-zinc-800/80 text-white"
                    : "bg-white border-slate-200 text-zinc-800 shadow-xs"
                }`}
              >
                {!user ? (
                  <div className="text-center py-6 text-xs text-zinc-400 font-medium">
                    Inicia sesión para ver las agendas compartidas contigo.
                  </div>
                ) : incomingShares.length === 0 ? (
                  <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center p-8 bg-slate-50 dark:bg-zinc-950/60 w-full">
                    <Users className="w-8 h-8 text-zinc-400 mb-2 opacity-50" />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                      No hay agendas compartidas contigo actualmente.
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-[280px]">
                      Pídele a otro usuario que agregue tu correo{" "}
                      <strong className="text-zinc-700 dark:text-zinc-200 font-bold">
                        {user.email}
                      </strong>{" "}
                      en su sección de compartido.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Selector de agendas compartidas */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                      <div className="flex flex-wrap gap-2">
                        {incomingShares.map((share) => {
                          const isActive =
                            share.id === selectedIncomingShareId ||
                            (!selectedIncomingShareId && share === incomingShares[0]);
                          return (
                            <button
                              key={share.id}
                              type="button"
                              onClick={() => setSelectedIncomingShareId(share.id || null)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                                isActive
                                  ? "bg-primary/10 border-primary text-primary shadow-xs"
                                  : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                              }`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>{share.fromEmail}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selector de fecha */}
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400">
                          Fecha:
                        </label>
                        <div className="w-36">
                          <SmartDateTimePicker
                            value={selectedViewDate}
                            onChange={(val) => setSelectedViewDate(val ? val.split("T")[0] : "")}
                            showTimeOption={false}
                            size="sm"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Contenido de la agenda seleccionada */}
                    {(() => {
                      const activeShare =
                        incomingShares.find((s) => s.id === selectedIncomingShareId) ||
                        incomingShares[0];
                      if (!activeShare) return null;

                      const sharedEvents = getSharedEventsForDate(selectedViewDate, activeShare);
                      if (!sharedEvents) return null;

                      const hasSharedEvents =
                        sharedEvents.turnos.length > 0 ||
                        sharedEvents.appointments.length > 0 ||
                        sharedEvents.invoices.length > 0 ||
                        sharedEvents.detailedPayments.length > 0 ||
                        sharedEvents.meals.length > 0 ||
                        sharedEvents.medications.length > 0;

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                              Agenda de{" "}
                              <span className="text-primary font-extrabold">
                                {activeShare.fromEmail}
                              </span>{" "}
                              para el {formatDateFriendly(selectedViewDate)}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-bold uppercase bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
                              Modo Lectura / Solo Consulta
                            </div>
                          </div>

                          {!hasSharedEvents ? (
                            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400 font-semibold">
                              No hay actividades compartidas para esta fecha en la agenda de{" "}
                              {activeShare.fromEmail}.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Turnos / Citas */}
                              {(sharedEvents.appointments.length > 0 || sharedEvents.turnos.length > 0) && (
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                                  <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider pb-2 border-b border-primary/10">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      Turnos y Citas ({sharedEvents.appointments.length + sharedEvents.turnos.length})
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {sharedEvents.appointments.map((app: any) => (
                                      <div
                                        key={app.id}
                                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-primary/10 text-xs shadow-xs"
                                      >
                                        <p className="font-extrabold text-zinc-900 dark:text-zinc-100">
                                          {app.title}
                                        </p>
                                        <p className="text-[10px] text-primary font-bold mt-1">
                                          {app.time || "Sin especificar"} hs
                                        </p>
                                        {app.location && (
                                          <p className="text-[9px] text-zinc-400 font-medium mt-0.5">
                                            📍 {app.location}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                    {sharedEvents.turnos.map((tc: any) => (
                                      <div
                                        key={tc.id}
                                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-primary/10 text-xs shadow-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-100">
                                            {tc.descripcion}
                                          </p>
                                          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase bg-primary/10 text-primary">
                                            {tc.categoria}
                                          </span>
                                        </div>
                                        {getHoraFromFecha(tc.fecha) && (
                                          <p className="text-[10px] text-primary font-bold mt-1">
                                            {getHoraFromFecha(tc.fecha)} hs
                                          </p>
                                        )}
                                        {tc.lugar && (
                                          <p className="text-[9px] text-zinc-400 font-medium mt-1">
                                            📍 {tc.lugar}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Finanzas */}
                              {(sharedEvents.invoices.length > 0 || sharedEvents.detailedPayments.length > 0) && (
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                                  <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider pb-2 border-b border-primary/10">
                                    <DollarSign className="w-4 h-4" />
                                    <span>
                                      Finanzas y Pagos ({sharedEvents.invoices.length + sharedEvents.detailedPayments.length})
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {sharedEvents.invoices.map((inv: any) => (
                                      <div
                                        key={inv.id}
                                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-primary/10 text-xs shadow-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-100">
                                            {inv.title}
                                          </p>
                                          <span
                                            className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase ${
                                              inv.paid
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                : "bg-red-500/10 text-red-500"
                                            }`}
                                          >
                                            {inv.paid ? "Pagado" : "Pendiente"}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-primary font-extrabold mt-1">
                                          ${inv.amount?.toLocaleString("es-AR")} ARS
                                        </p>
                                      </div>
                                    ))}
                                    {sharedEvents.detailedPayments.map((dp: any) => (
                                      <div
                                        key={dp.id}
                                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-primary/10 text-xs shadow-xs"
                                      >
                                        <div className="flex items-center justify-between">
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-100">
                                            {dp.descripcion}
                                          </p>
                                          <span
                                            className={`px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase ${
                                              dp.pago
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                : "bg-red-500/10 text-red-500"
                                            }`}
                                          >
                                            {dp.pago ? "Liquidado" : "Pendiente"}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-primary font-extrabold mt-1">
                                          ${dp.montoAPagar?.toLocaleString("es-AR")} ARS
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Comidas */}
                              {sharedEvents.meals.length > 0 && (
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                                  <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider pb-2 border-b border-primary/10">
                                    <UtensilsCrossed className="w-4 h-4" />
                                    <span>Menú Planificado ({sharedEvents.meals.length})</span>
                                  </div>
                                  <div className="space-y-2">
                                    {sharedEvents.meals.map((m: any) => {
                                      const matchedPlato = sharedEvents.platos.find((p) => p.id === m.platoId);
                                      return (
                                        <div
                                          key={m.id}
                                          className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-primary/10 text-xs shadow-xs"
                                        >
                                          <p className="font-extrabold text-zinc-900 dark:text-zinc-100">
                                            {matchedPlato ? matchedPlato.nombrePlato : "Plato planificado"}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Salud */}
                              {sharedEvents.medications.length > 0 && (
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                                  <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider pb-2 border-b border-primary/10">
                                    <Stethoscope className="w-4 h-4" />
                                    <span>Salud / Stock ({sharedEvents.medications.length})</span>
                                  </div>
                                  <div className="space-y-2">
                                    {sharedEvents.medications.map((m: any) => (
                                      <div
                                        key={m.disp.id}
                                        className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-primary/10 text-xs shadow-xs"
                                      >
                                        <p className="font-extrabold text-zinc-900 dark:text-zinc-100">
                                          {m.details.marca}
                                        </p>
                                        <p className="text-[10px] text-primary font-bold mt-0.5">
                                          Disp: {Math.round(m.details.cantidadDisponible)} unids
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmUnshareId}
        title="Revocar Acceso Compartido"
        message="¿Seguro que deseas revocar el acceso a este usuario y dejar de compartir tu agenda?"
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
