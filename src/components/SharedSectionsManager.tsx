import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  Users,
  Share2,
  UtensilsCrossed,
  Stethoscope,
  Send,
  Check,
  X,
  Link2,
  Unlink,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  ChevronRight
} from "lucide-react";
import {
  SectionLink,
  SharedSectionType,
  SECTION_NAMES,
  SECTION_DESCRIPTIONS,
  subscribeToSectionLinks,
  sendSectionInvitation,
  acceptSectionInvitation,
  rejectSectionInvitation,
  unlinkSection
} from "../lib/sectionSharingService";

interface SharedSectionsManagerProps {
  userEmail: string;
  darkMode?: boolean;
}

export function SharedSectionsManager({ userEmail, darkMode = false }: SharedSectionsManagerProps) {
  const [incomingLinks, setIncomingLinks] = useState<SectionLink[]>([]);
  const [outgoingLinks, setOutgoingLinks] = useState<SectionLink[]>([]);
  const [activeLinks, setActiveLinks] = useState<SectionLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [targetEmail, setTargetEmail] = useState("");
  const [selectedSections, setSelectedSections] = useState<SharedSectionType[]>(["comidas"]);
  const [isSending, setIsSending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmUnlinkTarget, setConfirmUnlinkTarget] = useState<SectionLink | null>(null);

  // Copy local data flag when accepting
  const [copyDataOnAccept, setCopyDataOnAccept] = useState(true);
  const [processingLinkId, setProcessingLinkId] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToSectionLinks(userEmail, (data) => {
      setIncomingLinks(data.incoming.filter((l) => l.status === "pending"));
      setOutgoingLinks(data.outgoing.filter((l) => l.status === "pending"));
      setActiveLinks(data.active);
      setLoading(false);
    });

    return () => {
      try { unsub(); } catch (_) {}
    };
  }, [userEmail]);

  const handleToggleSection = (sec: SharedSectionType) => {
    if (selectedSections.includes(sec)) {
      if (selectedSections.length > 1) {
        setSelectedSections(selectedSections.filter((s) => s !== sec));
      }
    } else {
      setSelectedSections([...selectedSections, sec]);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);

    const normTarget = targetEmail.trim().toLowerCase();
    if (!normTarget || !normTarget.includes("@")) {
      setActionFeedback({ type: "error", text: "Por favor ingresa un correo electrónico válido." });
      return;
    }

    if (normTarget === (userEmail || "").trim().toLowerCase()) {
      setActionFeedback({ type: "error", text: "No puedes vincular una sección con tu propia dirección de correo." });
      return;
    }

    setIsSending(true);
    try {
      const res = await sendSectionInvitation(userEmail, normTarget, selectedSections);
      if (res.success) {
        setActionFeedback({ type: "success", text: res.message });
        setTargetEmail("");
      } else {
        setActionFeedback({ type: "error", text: res.message });
      }
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err?.message || "Error al enviar la invitación." });
    } finally {
      setIsSending(false);
    }
  };

  const handleAccept = async (link: SectionLink) => {
    if (!link.id) return;
    setProcessingLinkId(link.id);
    setActionFeedback(null);
    try {
      const res = await acceptSectionInvitation(link, copyDataOnAccept);
      setActionFeedback({ type: res.success ? "success" : "error", text: res.message });
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err?.message || "Error al aceptar la invitación." });
    } finally {
      setProcessingLinkId(null);
    }
  };

  const handleReject = async (linkId: string) => {
    setProcessingLinkId(linkId);
    setActionFeedback(null);
    try {
      const res = await rejectSectionInvitation(linkId);
      setActionFeedback({ type: "success", text: res.message });
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err?.message || "Error al rechazar la invitación." });
    } finally {
      setProcessingLinkId(null);
    }
  };

  const handleUnlink = async (link: SectionLink) => {
    setConfirmUnlinkTarget(link);
  };

  const executeUnlink = async (link: SectionLink) => {
    if (!link.id) return;
    setProcessingLinkId(link.id);
    setActionFeedback(null);
    try {
      const res = await unlinkSection(link);
      setActionFeedback({ type: "success", text: res.message });
    } catch (err: any) {
      setActionFeedback({ type: "error", text: err?.message || "Error al desvincular la sección." });
    } finally {
      setProcessingLinkId(null);
      setConfirmUnlinkTarget(null);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-primary text-white dark:text-blue-950 shadow-md shrink-0 mt-0.5">
            <Share2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm md:text-base text-zinc-900 dark:text-zinc-100">
                Vincular Secciones & Base de Datos Compartida
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Sincronización en Tiempo Real
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Conecta tu cuenta con la de tu pareja, familiar o colega para que ambos visualicen, creen y editen exactamente los mismos registros sincronizados al instante.
            </p>
          </div>
        </div>
      </div>

      {/* Global Action Feedback Alert */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
              actionFeedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{actionFeedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. INVITACIONES RECIBIDAS (PENDIENTES DE ACEPTAR) */}
      {incomingLinks.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h4 className="font-extrabold text-xs md:text-sm text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              Invitaciones de Vinculación Recibidas ({incomingLinks.length})
            </h4>
          </div>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
            Otro usuario desea compartir su base de datos contigo. Al aceptar, ambos compartirán la misma información en tiempo real.
          </p>

          <div className="space-y-2.5 pt-1">
            {incomingLinks.map((link) => (
              <div
                key={link.id}
                className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-amber-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    {link.section === "comidas" ? (
                      <UtensilsCrossed className="w-4 h-4" />
                    ) : (
                      <Stethoscope className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span>{SECTION_NAMES[link.section]}</span>
                      <span className="text-[10px] font-normal text-zinc-500">
                        • De: <strong className="text-zinc-800 dark:text-zinc-200">{link.fromEmail}</strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {SECTION_DESCRIPTIONS[link.section]}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={processingLinkId === link.id}
                    onClick={() => handleReject(link.id!)}
                    className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Rechazar</span>
                  </button>
                  <button
                    type="button"
                    disabled={processingLinkId === link.id}
                    onClick={() => handleAccept(link)}
                    className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 font-bold text-xs cursor-pointer transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {processingLinkId === link.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Aceptar y Vincular</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1 flex items-center gap-2">
            <input
              type="checkbox"
              id="copyDataCheck"
              checked={copyDataOnAccept}
              onChange={(e) => setCopyDataOnAccept(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-primary focus:ring-primary cursor-pointer w-3.5 h-3.5"
            />
            <label htmlFor="copyDataCheck" className="text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
              Unificar mis recetas y registros actuales a la base de datos compartida al aceptar
            </label>
          </div>
        </div>
      )}

      {/* 2. VÍNCULOS ACTIVOS (BASES DE DATOS COMPARTIDAS) */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary shrink-0" />
            <h4 className="font-extrabold text-xs md:text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Vínculos Activos ({activeLinks.length})
            </h4>
          </div>
          {activeLinks.length > 0 && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sincronizado
            </span>
          )}
        </div>

        {activeLinks.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-dashed border-slate-200 dark:border-zinc-700/60 text-center">
            <Users className="w-6 h-6 mx-auto text-zinc-400 dark:text-zinc-500 mb-1.5 opacity-80" />
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              No tienes secciones vinculadas actualmente
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Envía una invitación a continuación para compartir la base de Comidas o Control Clínico.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeLinks.map((link) => {
              const partner =
                link.fromEmail.toLowerCase() === (userEmail || "").toLowerCase()
                  ? link.toEmail
                  : link.fromEmail;
              const isHost = link.sharedDbUserId.toLowerCase() === (userEmail || "").toLowerCase();

              return (
                <div
                  key={link.id}
                  className="p-4 rounded-xl border border-primary/20 bg-primary/5 dark:bg-zinc-800/60 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary text-white dark:text-blue-950 shrink-0">
                          {link.section === "comidas" ? (
                            <UtensilsCrossed className="w-4 h-4" />
                          ) : (
                            <Stethoscope className="w-4 h-4" />
                          )}
                        </div>
                        <span className="font-extrabold text-xs text-zinc-900 dark:text-white">
                          {SECTION_NAMES[link.section]}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Activo
                      </span>
                    </div>

                    <div className="text-xs text-zinc-600 dark:text-zinc-400 pl-1">
                      Compartiendo con: <strong className="text-zinc-900 dark:text-white">{partner}</strong>
                    </div>

                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{isHost ? "Base de datos alojada en tu cuenta" : `Conectado a la base de ${partner}`}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-zinc-700/60 flex justify-end">
                    <button
                      type="button"
                      disabled={processingLinkId === link.id}
                      onClick={() => handleUnlink(link)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Desvincular</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. INVITACIONES ENVIADAS (PENDIENTES DE RESPUESTA) */}
      {outgoingLinks.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 space-y-2">
          <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Invitaciones enviadas pendientes ({outgoingLinks.length})</span>
          </h4>
          <div className="space-y-2">
            {outgoingLinks.map((link) => (
              <div
                key={link.id}
                className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{SECTION_NAMES[link.section]}</span>
                  <span className="text-zinc-400">➔</span>
                  <span className="text-zinc-600 dark:text-zinc-300 font-medium">{link.toEmail}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    Pendiente
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleReject(link.id!)}
                  className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FORMULARIO PARA ENVIAR NUEVA INVITACIÓN */}
      <form
        onSubmit={handleSendInvite}
        className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-primary shrink-0" />
          <h4 className="font-extrabold text-xs md:text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
            Enviar Nueva Invitación de Vinculación
          </h4>
        </div>

        <div className="space-y-3">
          {/* Target Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Correo Electrónico del Usuario a Vincular
            </label>
            <input
              type="email"
              required
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              placeholder="ejemplo@gmail.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {/* Section Selection Cards */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Selecciona las Secciones a Vincular
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Comidas Card */}
              <div
                onClick={() => handleToggleSection("comidas")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedSections.includes("comidas")
                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 opacity-70"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedSections.includes("comidas")
                    ? "bg-primary text-white dark:text-blue-950"
                    : "bg-slate-100 dark:bg-zinc-800 text-zinc-500"
                }`}>
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-zinc-900 dark:text-white">
                      Toda la Sección de Comidas
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedSections.includes("comidas")}
                      onChange={() => {}}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-primary pointer-events-none w-3.5 h-3.5"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Alimentos, Platos, Recetas, Alacena, Mercadería, Lista de Compras y Organización Semanal.
                  </p>
                </div>
              </div>

              {/* Control Clínico Card */}
              <div
                onClick={() => handleToggleSection("control_clinico")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  selectedSections.includes("control_clinico")
                    ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 opacity-70"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  selectedSections.includes("control_clinico")
                    ? "bg-primary text-white dark:text-blue-950"
                    : "bg-slate-100 dark:bg-zinc-800 text-zinc-500"
                }`}>
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-zinc-900 dark:text-white">
                      Control Clínico
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedSections.includes("control_clinico")}
                      onChange={() => {}}
                      className="rounded border-zinc-300 dark:border-zinc-700 text-primary pointer-events-none w-3.5 h-3.5"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Doctores, Presión Arterial, Historial Clínico, Informes y Medicamentos con Stock.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSending || selectedSections.length === 0}
            className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isSending ? "Enviando Invitación..." : "Enviar Invitación de Vinculación"}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmUnlinkTarget}
        title="Desvincular Sección"
        message={
          confirmUnlinkTarget
            ? `¿Estás seguro de que deseas desvincular la sección "${SECTION_NAMES[confirmUnlinkTarget.section]}"? Cada usuario volverá a utilizar su base de datos local independiente.`
            : "¿Estás seguro de que deseas desvincular esta sección?"
        }
        onConfirm={async () => {
          if (confirmUnlinkTarget) {
            await executeUnlink(confirmUnlinkTarget);
          }
        }}
        onClose={() => setConfirmUnlinkTarget(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
