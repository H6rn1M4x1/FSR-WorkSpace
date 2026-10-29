import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle,
  Send,
  UserPlus,
  X,
  Check,
  CheckCheck,
  Clock,
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Camera,
  CalendarPlus,
  Mic,
  Square,
  Pencil,
  Download,
  Video,
} from "lucide-react";
import { ChatContact, ChatMessage, ChatAttachmentType } from "../types";
import {
  subscribeToContacts,
  subscribeToUnreadMessages,
  subscribeToConversation,
  subscribeToLastMessage,
  subscribeToUserProfileName,
  sendContactInvitation,
  acceptContactInvitation,
  rejectContactInvitation,
  removeContact,
  renameContact,
  sendChatMessage,
  markConversationRead,
  getConversationId,
  uploadChatAttachment,
  compressImageFile,
  compressVideoFile,
} from "../lib/chatService";
import { VoiceMessageBubble } from "./VoiceMessageBubble";
import { useToast } from "../context/ToastContext";

interface ChatPanelProps {
  userEmail: string;
  darkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function ChatPanel({ userEmail, darkMode, isOpen, onClose, onUnreadCountChange }: ChatPanelProps) {
  const normalizedUserEmail = (userEmail || "").trim().toLowerCase();

  const [incoming, setIncoming] = useState<ChatContact[]>([]);
  const [outgoing, setOutgoing] = useState<ChatContact[]>([]);
  const [active, setActive] = useState<ChatContact[]>([]);
  const [unreadByContact, setUnreadByContact] = useState<Record<string, number>>({});
  const [profiles, setProfiles] = useState<Record<string, { displayName?: string; photoURL?: string }>>({});
  const [lastMessageByContact, setLastMessageByContact] = useState<Record<string, ChatMessage>>({});
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [renamingEmail, setRenamingEmail] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // En mobile, el lápiz/tacho de cada contacto solo se revelan (y se vuelven tocables) con un
  // mantener-presionado — antes quedaban "invisibles" (opacity-0 por :hover, que no existe en
  // touch) pero igual tocables, así que un tap para abrir el chat que caía sobre esa zona
  // terminaba entrando a edición en vez de abrir la conversación.
  const [longPressRevealedEmail, setLongPressRevealedEmail] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextRowClickRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // --- Adjuntos (imágenes/videos/documentos/cámara) ---
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl: string;
    type: ChatAttachmentType;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<number | null>(null);
  const [justSent, setJustSent] = useState(false);
  const imageVideoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // --- Grabación de notas de voz ---
  type RecordingState = "idle" | "recording" | "preview";
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const isTouchDevice = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)")?.matches;

  // These two subscriptions stay alive for as long as this component is mounted (i.e. for as
  // long as TopNavbar itself is mounted), regardless of `isOpen` — that's what lets the unread
  // badge on the chat bubble icon stay accurate even while the panel is collapsed.
  useEffect(() => {
    if (!normalizedUserEmail) return;
    const unsub = subscribeToContacts(normalizedUserEmail, (data) => {
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
      setActive(data.active);
    });
    return () => { try { unsub(); } catch (_) {} };
  }, [normalizedUserEmail]);

  useEffect(() => {
    if (!normalizedUserEmail) return;
    const unsub = subscribeToUnreadMessages(normalizedUserEmail, (counts) => {
      setUnreadByContact(counts);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      if (onUnreadCountChange) onUnreadCountChange(total);
    });
    return () => { try { unsub(); } catch (_) {} };
  }, [normalizedUserEmail, onUnreadCountChange]);

  useEffect(() => {
    const emails = new Set<string>();
    active.forEach((c) => emails.add(c.fromEmail === normalizedUserEmail ? c.toEmail : c.fromEmail));
    incoming.forEach((c) => emails.add(c.fromEmail));
    outgoing.forEach((c) => emails.add(c.toEmail));
    const unsubs: Array<() => void> = [];
    emails.forEach((email) => {
      const unsub = subscribeToUserProfileName(email, (info) => {
        setProfiles((prev) => ({ ...prev, [email]: info }));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => { try { u(); } catch (_) {} });
  }, [active, incoming, outgoing, normalizedUserEmail]);

  useEffect(() => {
    if (!selectedEmail || !normalizedUserEmail) {
      setMessages([]);
      return;
    }
    const conversationId = getConversationId(normalizedUserEmail, selectedEmail);
    const unsub = subscribeToConversation(conversationId, setMessages);
    markConversationRead(conversationId, normalizedUserEmail);
    return () => { try { unsub(); } catch (_) {} };
  }, [selectedEmail, normalizedUserEmail]);

  // Re-mark as read whenever a new incoming message arrives while its conversation is open.
  useEffect(() => {
    if (!selectedEmail || !normalizedUserEmail) return;
    if ((unreadByContact[selectedEmail] || 0) > 0) {
      markConversationRead(getConversationId(normalizedUserEmail, selectedEmail), normalizedUserEmail);
    }
  }, [unreadByContact, selectedEmail, normalizedUserEmail]);

  // Scrollea solo el contenedor interno de mensajes (nunca la página entera): scrollIntoView en
  // el div ancla arrastraba todo el layout hacia abajo al abrir el chat o al enviar un mensaje.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Cada vez que se abre el panel arranca en la lista de contactos — no se queda "pegado" en la
  // última conversación que tenías abierta la vez anterior.
  useEffect(() => {
    if (isOpen) {
      setSelectedEmail(null);
      setShowMobileConversation(false);
    }
  }, [isOpen]);

  const contactEmails = useMemo(
    () => active.map((c) => (c.fromEmail === normalizedUserEmail ? c.toEmail : c.fromEmail)),
    [active, normalizedUserEmail]
  );

  // Vista previa del último mensaje de cada contacto (debajo del nombre, en la lista).
  useEffect(() => {
    if (!normalizedUserEmail) return;
    const unsubs = contactEmails.map((email) => {
      const conversationId = getConversationId(normalizedUserEmail, email);
      return subscribeToLastMessage(conversationId, (msg) => {
        setLastMessageByContact((prev) => {
          if (!msg) {
            if (!(email in prev)) return prev;
            const next = { ...prev };
            delete next[email];
            return next;
          }
          return { ...prev, [email]: msg };
        });
      });
    });
    return () => unsubs.forEach((u) => { try { u(); } catch (_) {} });
  }, [contactEmails, normalizedUserEmail]);

  const unreadContactsCount = useMemo(
    () => Object.values(unreadByContact).filter((n) => n > 0).length,
    [unreadByContact]
  );

  const filteredContactEmails = useMemo(() => {
    if (!search.trim()) return contactEmails;
    const term = search.trim().toLowerCase();
    return contactEmails.filter((email) => {
      const name = (profiles[email]?.displayName || "").toLowerCase();
      return email.toLowerCase().includes(term) || name.includes(term);
    });
  }, [contactEmails, search, profiles]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSendingInvite(true);
    try {
      const res = await sendContactInvitation(normalizedUserEmail, newContactEmail, newContactName);
      setFeedback({ type: res.success ? "success" : "error", text: res.message });
      setTimeout(() => setFeedback(null), 6000);
      if (res.success) {
        setNewContactEmail("");
        setNewContactName("");
        setShowAddContact(false);
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleStartRename = (email: string) => {
    setRenamingEmail(email);
    setRenameValue(customNameFor(email) === email ? "" : customNameFor(email));
    setLongPressRevealedEmail(null);
  };

  const handleConfirmRename = async (email: string) => {
    const contact = active.find((c) => c.fromEmail === email || c.toEmail === email);
    if (!contact) return;
    await renameContact(contact, normalizedUserEmail, renameValue);
    setRenamingEmail(null);
  };

  const handleRowPointerDown = (email: string) => {
    if (!isTouchDevice) return;
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      suppressNextRowClickRef.current = true;
      setLongPressRevealedEmail(email);
      try { navigator.vibrate?.(15); } catch (_) {}
    }, 550);
  };

  const cancelRowLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRowClick = (email: string) => {
    if (!isTouchDevice) {
      setSelectedEmail(email);
      setShowMobileConversation(true);
      return;
    }
    if (suppressNextRowClickRef.current) {
      suppressNextRowClickRef.current = false;
      return;
    }
    if (longPressRevealedEmail === email) {
      setLongPressRevealedEmail(null);
      return;
    }
    setSelectedEmail(email);
    setShowMobileConversation(true);
  };

  const vibrateOnSend = () => {
    try { navigator.vibrate?.(12); } catch (_) {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) return;
    if (pendingAttachment) {
      await handleSendAttachment(messageText);
      return;
    }
    if (!messageText.trim()) return;
    const text = messageText;
    setMessageText("");
    setJustSent(true);
    setTimeout(() => setJustSent(false), 400);
    vibrateOnSend();
    await sendChatMessage(normalizedUserEmail, selectedEmail, text);
  };

  const handleSendAttachment = async (caption: string) => {
    if (!selectedEmail || !pendingAttachment) return;
    const { file, type, previewUrl } = pendingAttachment;
    setIsUploadingAttachment(true);
    try {
      let fileToUpload = file;
      if (type === "image") {
        fileToUpload = await compressImageFile(file);
      } else if (type === "video") {
        setCompressionProgress(0);
        fileToUpload = await compressVideoFile(file, setCompressionProgress);
        setCompressionProgress(null);
      }
      const conversationId = getConversationId(normalizedUserEmail, selectedEmail);
      const url = await uploadChatAttachment(conversationId, fileToUpload, file.name);
      await sendChatMessage(normalizedUserEmail, selectedEmail, caption, {
        url,
        type,
        name: file.name,
      });
      setMessageText("");
      setPendingAttachment(null);
      URL.revokeObjectURL(previewUrl);
      setJustSent(true);
      setTimeout(() => setJustSent(false), 400);
      vibrateOnSend();
    } catch (err: any) {
      showToast(err?.message || "No se pudo subir el adjunto. Probá de nuevo.", "error");
    } finally {
      setIsUploadingAttachment(false);
      setCompressionProgress(null);
    }
  };

  // Tocar el documento solo lo ABRE en una pestaña nueva (el navegador decide si lo muestra
  // inline, como un PDF, o lo descarga él solo si no sabe renderizarlo) — nunca fuerza la
  // descarga. Esa acción queda reservada al ícono de descarga, en handleDownloadDocument.
  const handleViewDocument = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadDocument = async (e: React.MouseEvent, url: string, name?: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name || "documento";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (_) {
      window.open(url, "_blank");
    }
  };

  const pickAttachment = (file: File | undefined, type: ChatAttachmentType) => {
    if (!file) return;
    if (pendingAttachment) URL.revokeObjectURL(pendingAttachment.previewUrl);
    setPendingAttachment({ file, previewUrl: URL.createObjectURL(file), type });
    setShowAttachMenu(false);
  };

  const customNameFor = (email: string): string => {
    const contact = active.find((c) => c.fromEmail === email || c.toEmail === email);
    if (!contact) return email;
    const mine = contact.fromEmail === normalizedUserEmail ? contact.fromCustomName : contact.toCustomName;
    return mine || profiles[email]?.displayName || email;
  };

  const getDisplayName = (email: string) => customNameFor(email);
  const getInitial = (email: string) => customNameFor(email).charAt(0).toUpperCase();

  const ATTACHMENT_PREVIEW_ICON: Record<ChatAttachmentType, React.ComponentType<{ className?: string }>> = {
    image: ImageIcon,
    video: Video,
    document: FileText,
    audio: Mic,
  };

  const renderLastMessagePreview = (email: string) => {
    const msg = lastMessageByContact[email];
    if (!msg) return email;
    const prefix = msg.fromEmail === normalizedUserEmail ? "Vos: " : "";
    if (msg.text) return `${prefix}${msg.text}`;
    if (!msg.attachmentType) return prefix || "";
    const Icon = ATTACHMENT_PREVIEW_ICON[msg.attachmentType];
    const label =
      msg.attachmentType === "image"
        ? "Foto"
        : msg.attachmentType === "video"
        ? "Video"
        : msg.attachmentType === "audio"
        ? "Audio"
        : msg.attachmentName || "Documento";
    return (
      <span className="flex items-center gap-1">
        {prefix && <span className="shrink-0">{prefix}</span>}
        <Icon className="w-3 h-3 text-primary shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  };

  useEffect(() => {
    const handleClickOutsideMenu = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) document.addEventListener("mousedown", handleClickOutsideMenu);
    return () => document.removeEventListener("mousedown", handleClickOutsideMenu);
  }, [showAttachMenu]);

  // Limpieza de recursos de audio/stream si el panel se desmonta a mitad de una grabación.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      try { audioCtxRef.current?.close(); } catch (_) {}
    };
  }, []);

  const recordingSecondsRef = useRef(0);
  const pendingStopActionRef = useRef<"send" | "preview" | "cancel">("preview");

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const cleanupRecordingResources = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    try { audioCtxRef.current?.close(); } catch (_) {}
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const animateBars = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const bars = barRefs.current;
    const step = Math.max(1, Math.floor(data.length / Math.max(bars.length, 1)));
    bars.forEach((bar, i) => {
      if (!bar) return;
      const value = data[i * step] || 0;
      const pct = Math.max(12, Math.min(100, (value / 255) * 100));
      bar.style.height = `${pct}%`;
    });
    rafRef.current = requestAnimationFrame(animateBars);
  };

  const sendRecordedAudio = async (blob: Blob, seconds: number) => {
    if (!selectedEmail) return;
    setIsUploadingAttachment(true);
    try {
      const conversationId = getConversationId(normalizedUserEmail, selectedEmail);
      const url = await uploadChatAttachment(conversationId, blob, `audio_${Date.now()}.webm`);
      await sendChatMessage(normalizedUserEmail, selectedEmail, "", { url, type: "audio", durationSec: seconds });
      setJustSent(true);
      setTimeout(() => setJustSent(false), 400);
      vibrateOnSend();
    } catch (err: any) {
      showToast(err?.message || "No se pudo enviar el audio.", "error");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtor();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const preferredMime = "audio/webm;codecs=opus";
      const mimeType = MediaRecorder.isTypeSupported(preferredMime)
        ? preferredMime
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        // Nunca dejar este handler sin un catch: es un callback de evento del MediaRecorder, no
        // algo que nadie "await"-ea — cualquier excepción acá antes se perdía como una promesa
        // rechazada sin manejar, y el audio quedaba "grabado" sin enviarse ni avisar por qué.
        try {
          const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          recordedBlobRef.current = blob;
          const seconds = recordingSecondsRef.current;
          cleanupRecordingResources();
          const action = pendingStopActionRef.current;
          if (action === "cancel") {
            setRecordingState("idle");
            setRecordingSeconds(0);
            return;
          }
          if (action === "send") {
            setRecordingState("idle");
            setRecordingSeconds(0);
            await sendRecordedAudio(blob, seconds);
            return;
          }
          setPreviewAudioUrl(URL.createObjectURL(blob));
          setRecordingState("preview");
        } catch (err: any) {
          cleanupRecordingResources();
          setRecordingState("idle");
          setRecordingSeconds(0);
          showToast(err?.message || "No se pudo procesar la nota de voz grabada.", "error");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setRecordingState("recording");
      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
      rafRef.current = requestAnimationFrame(animateBars);
    } catch (_) {
      showToast("No se pudo acceder al micrófono. Revisá los permisos del navegador.", "error");
    }
  };

  const stopRecording = (action: "send" | "preview" | "cancel") => {
    pendingStopActionRef.current = action;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const discardPreviewAudio = () => {
    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    setPreviewAudioUrl(null);
    recordedBlobRef.current = null;
    setRecordingState("idle");
    setRecordingSeconds(0);
  };

  const sendPreviewAudio = async () => {
    if (!recordedBlobRef.current) return;
    const blob = recordedBlobRef.current;
    const seconds = recordingSecondsRef.current;
    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    setPreviewAudioUrl(null);
    setRecordingState("idle");
    setRecordingSeconds(0);
    await sendRecordedAudio(blob, seconds);
  };

  // Un solo tap para empezar a grabar y otro para terminar (con vista previa antes de confirmar
  // el envío) — igual en mobile que en PC. Antes mobile tenía su propio gesto de mantener
  // presionado + deslizar para bloquear, pero se sacó a pedido explícito del usuario en favor de
  // este comportamiento único y más simple.
  const handleMicClick = () => {
    if (recordingState === "idle") startRecording();
    else if (recordingState === "recording") stopRecording("preview");
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="w-full overflow-hidden"
        >
          <div className="w-full border-t border-zinc-200/60 dark:border-white/10 pt-3 mt-2">
            {/* En mobile ocupa casi toda la altura disponible debajo del navbar (en vez de una
                cajita chica) — 130px cubre la fila de navegación + los paddings del capsule de
                arriba. En desktop vuelve al alto fijo de siempre. */}
            <div className="w-full flex flex-col md:flex-row items-stretch gap-3 h-[calc(100dvh-130px)] max-h-[720px] md:h-[440px] md:max-h-none">
              {/* LEFT: Contacts */}
              <div className={`w-full md:w-72 shrink-0 flex flex-col min-h-0 ${showMobileConversation ? "hidden md:flex" : "flex"}`}>
                <div className="flex items-center justify-between px-1 pb-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-xs font-extrabold">Chat{unreadContactsCount > 0 ? ` (${unreadContactsCount})` : ""}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowAddContact((v) => !v)}
                      className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
                      title="Agregar contacto"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </motion.button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1 rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                      title="Cerrar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden px-1 shrink-0"
                    >
                      <div
                        className={`mb-2 p-2 rounded-lg text-[10.5px] font-bold flex items-center justify-between gap-2 ${
                          feedback.type === "success"
                            ? "bg-primary/10 text-primary"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {feedback.type === "success" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {feedback.text}
                        </span>
                        <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showAddContact && (
                    <motion.form
                      onSubmit={handleSendInvite}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden px-1 shrink-0"
                    >
                      <div className="space-y-1.5 pb-2">
                        <input
                          type="email"
                          required
                          autoFocus
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                          className="w-full px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            placeholder="Nombre para este contacto (opcional)"
                            className="flex-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          />
                          <motion.button
                            type="submit"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.92 }}
                            disabled={isSendingInvite}
                            className="p-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            {isSendingInvite ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {contactEmails.length > 0 && (
                  <div className="relative px-1 pb-2 shrink-0">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar contacto..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                    />
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none space-y-1.5 px-1">
                  {incoming.map((invite) => (
                    <div
                      key={invite.id}
                      className="p-2.5 rounded-xl border border-primary/30 bg-primary/10 dark:bg-primary/15 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-primary truncate">
                          {getDisplayName(invite.fromEmail)}
                        </div>
                        <div className="text-[9.5px] text-primary/80">Quiere agregarte</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => rejectContactInvitation(invite.id!)}
                          className="p-1.5 rounded-full hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                          title="Rechazar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => acceptContactInvitation(invite)}
                          className="p-1.5 rounded-full bg-primary text-white dark:text-blue-950 cursor-pointer"
                          title="Aceptar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  ))}

                  {outgoing.map((invite) => (
                    <div
                      key={invite.id}
                      className="p-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-between gap-2 opacity-80"
                    >
                      <div className="min-w-0 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate">{invite.toEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => rejectContactInvitation(invite.id!)}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer shrink-0"
                      >
                        Cancelar
                      </button>
                    </div>
                  ))}

                  {filteredContactEmails.length === 0 && incoming.length === 0 && outgoing.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 font-medium bg-zinc-500/5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800">
                      <Users className="w-5 h-5 mx-auto mb-1.5 opacity-60" />
                      Agrega un contacto para empezar a chatear.
                    </div>
                  ) : (
                    filteredContactEmails.map((email) => {
                      const unread = unreadByContact[email] || 0;
                      const isSelected = selectedEmail === email;
                      const contact = active.find((c) => c.fromEmail === email || c.toEmail === email);
                      const revealed = longPressRevealedEmail === email;
                      const photoURL = profiles[email]?.photoURL;
                      return (
                        <motion.div
                          key={email}
                          layout
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRowClick(email)}
                          onPointerDown={() => handleRowPointerDown(email)}
                          onPointerUp={cancelRowLongPress}
                          onPointerLeave={cancelRowLongPress}
                          onPointerCancel={cancelRowLongPress}
                          className={`group p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                            isSelected
                              ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                              : darkMode
                              ? "border-zinc-800 hover:border-zinc-700"
                              : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          {photoURL ? (
                            <img
                              src={photoURL}
                              alt={getDisplayName(email)}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitial(email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {renamingEmail === email ? (
                              <form
                                onClick={(e) => e.stopPropagation()}
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleConfirmRename(email);
                                }}
                                className="flex items-center gap-1"
                              >
                                <input
                                  autoFocus
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  placeholder={email}
                                  className="w-full px-2 py-1 rounded-full border border-primary/40 bg-white dark:bg-zinc-900 text-[11px] font-bold focus:outline-none"
                                />
                                <button type="submit" className="p-1 rounded-full bg-primary text-white dark:text-blue-950 shrink-0 cursor-pointer">
                                  <Check className="w-3 h-3" />
                                </button>
                              </form>
                            ) : (
                              <span className="text-[11.5px] font-bold text-black dark:text-white truncate block">
                                {getDisplayName(email)}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
                              {renderLastMessagePreview(email)}
                            </span>
                          </div>
                          {unread > 0 && (
                            <span className="w-5 h-5 rounded-full bg-primary text-white dark:text-blue-950 text-[10px] font-black flex items-center justify-center shrink-0">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(email);
                            }}
                            className={`p-1 rounded-full text-zinc-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer shrink-0 ${
                              isTouchDevice
                                ? revealed
                                  ? "opacity-100"
                                  : "opacity-0 pointer-events-none"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                            title="Renombrar contacto"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (contact?.id) removeContact(contact.id);
                              if (isSelected) setSelectedEmail(null);
                              setLongPressRevealedEmail(null);
                            }}
                            className={`p-1 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer shrink-0 ${
                              isTouchDevice
                                ? revealed
                                  ? "opacity-100"
                                  : "opacity-0 pointer-events-none"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                            title="Eliminar contacto"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT: Conversation */}
              <div
                className={`flex-1 min-w-0 min-h-0 flex-col rounded-xl border border-zinc-200/60 dark:border-white/10 overflow-hidden ${
                  showMobileConversation ? "flex" : "hidden md:flex"
                }`}
              >
                {selectedEmail ? (
                  <>
                    <div className="flex items-center gap-2 p-2.5 border-b border-zinc-200/60 dark:border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowMobileConversation(false)}
                        className="md:hidden p-1 rounded-full hover:bg-zinc-200/60 dark:hover:bg-zinc-800 cursor-pointer text-zinc-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {profiles[selectedEmail]?.photoURL ? (
                        <img
                          src={profiles[selectedEmail].photoURL}
                          alt={getDisplayName(selectedEmail)}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                          {getInitial(selectedEmail)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-bold text-black dark:text-white truncate">{getDisplayName(selectedEmail)}</div>
                        <div className="text-[9.5px] text-zinc-500 truncate">{selectedEmail}</div>
                      </div>
                    </div>

                    <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-3 space-y-1.5">
                      {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-zinc-400 font-medium text-center px-6">
                          Todavía no hay mensajes. ¡Escribe el primero!
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isOwn = msg.fromEmail === normalizedUserEmail;
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 14, scale: 0.96 }}
                              whileInView={{ opacity: 1, y: 0, scale: 1 }}
                              viewport={{ root: messagesContainerRef, once: true, margin: "0px 0px -40px 0px" }}
                              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-[12px] font-medium leading-snug ${
                                  isOwn
                                    ? "bg-primary text-black dark:text-white rounded-br-md"
                                    : darkMode
                                    ? "bg-zinc-800 text-zinc-100 rounded-bl-md"
                                    : "bg-zinc-100 text-zinc-900 rounded-bl-md"
                                }`}
                              >
                                {msg.attachmentType === "image" && msg.attachmentUrl && (
                                  <img
                                    src={msg.attachmentUrl}
                                    alt={msg.attachmentName || "Imagen"}
                                    className="rounded-xl max-w-full max-h-56 object-cover mb-1 cursor-pointer"
                                    onClick={() => window.open(msg.attachmentUrl, "_blank")}
                                  />
                                )}
                                {msg.attachmentType === "video" && msg.attachmentUrl && (
                                  <video src={msg.attachmentUrl} controls className="rounded-xl max-w-full max-h-56 mb-1" />
                                )}
                                {msg.attachmentType === "document" && msg.attachmentUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewDocument(msg.attachmentUrl!)}
                                    title="Ver documento"
                                    className={`w-full flex items-center gap-2 p-2 rounded-xl mb-1 cursor-pointer ${
                                      isOwn ? "bg-black/10 dark:bg-white/15" : darkMode ? "bg-black/20" : "bg-white"
                                    }`}
                                  >
                                    <FileText className="w-5 h-5 shrink-0" />
                                    <span className="text-[11px] font-semibold truncate">{msg.attachmentName || "Documento"}</span>
                                    <span
                                      role="button"
                                      onClick={(e) => handleDownloadDocument(e, msg.attachmentUrl!, msg.attachmentName)}
                                      title="Descargar"
                                      className="p-1 -m-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5 opacity-70" />
                                    </span>
                                  </button>
                                )}
                                {msg.attachmentType === "audio" && msg.attachmentUrl && (
                                  <VoiceMessageBubble
                                    url={msg.attachmentUrl}
                                    isOwn={isOwn}
                                    darkMode={darkMode}
                                    durationSec={msg.audioDurationSec}
                                  />
                                )}
                                {msg.text && <span className="whitespace-pre-wrap break-words">{msg.text}</span>}
                                <div className={`flex items-center gap-1 mt-0.5 opacity-80 ${isOwn ? "justify-end" : "justify-start"}`}>
                                  <span className="text-[9px]">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                                  </span>
                                  {isOwn &&
                                    (msg.read ? (
                                      // El mensaje propio va sobre un fondo bg-primary — el acento
                                      // tal cual quedaba invisible encima de sí mismo. Una versión
                                      // bien oscurecida del mismo acento sí contrasta en cualquier
                                      // tono, sin salirse de "seguir el color de acento".
                                      <CheckCheck
                                        className="w-3.5 h-3.5"
                                        style={{ color: "color-mix(in srgb, var(--color-primary) 45%, black)" }}
                                      />
                                    ) : msg.delivered ? (
                                      <CheckCheck className="w-3.5 h-3.5 opacity-70" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 opacity-70" />
                                    ))}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-zinc-200/60 dark:border-white/10 shrink-0">
                      <AnimatePresence>
                        {pendingAttachment && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden px-2.5 pt-2"
                          >
                            <div className="relative inline-block">
                              {pendingAttachment.type === "image" && (
                                <img
                                  src={pendingAttachment.previewUrl}
                                  alt="Vista previa"
                                  className="h-16 w-16 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                                />
                              )}
                              {pendingAttachment.type === "video" && (
                                <div className="relative h-16 w-16">
                                  <video src={pendingAttachment.previewUrl} className="h-16 w-16 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" />
                                  {compressionProgress !== null && (
                                    <div className="absolute inset-0 rounded-lg bg-black/60 flex flex-col items-center justify-center gap-0.5">
                                      <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                                      <span className="text-[8.5px] font-bold text-white">{Math.round(compressionProgress * 100)}%</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {pendingAttachment.type === "document" && (
                                <div className="h-16 w-28 flex flex-col items-center justify-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-1.5">
                                  <FileText className="w-5 h-5 text-primary" />
                                  <span className="text-[9px] font-medium truncate w-full text-center">{pendingAttachment.file.name}</span>
                                </div>
                              )}
                              {!isUploadingAttachment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    URL.revokeObjectURL(pendingAttachment.previewUrl);
                                    setPendingAttachment(null);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-zinc-900 text-white shadow cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {recordingState === "recording" ? (
                        <div className="flex items-center gap-2 p-2.5">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => stopRecording("cancel")}
                            className="p-2 rounded-full text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                            title="Cancelar grabación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                          <span className="text-[11px] font-bold text-rose-500 tabular-nums shrink-0 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {formatRecTime(recordingSeconds)}
                          </span>
                          <div className="flex-1 flex items-end gap-[2px] h-7 overflow-hidden">
                            {Array.from({ length: 24 }).map((_, i) => (
                              <div
                                key={i}
                                ref={(el) => { barRefs.current[i] = el; }}
                                className="w-[2.5px] rounded-full bg-primary"
                                style={{ height: "15%" }}
                              />
                            ))}
                          </div>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => stopRecording("preview")}
                            className="p-2.5 rounded-full bg-primary text-white dark:text-blue-950 cursor-pointer shrink-0"
                            title="Detener grabación"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      ) : recordingState === "preview" && previewAudioUrl ? (
                        <div className="flex items-center gap-2 p-2.5">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={discardPreviewAudio}
                            className="p-2 rounded-full text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                            title="Descartar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                          <div className="flex-1">
                            <VoiceMessageBubble url={previewAudioUrl} isOwn={false} darkMode={darkMode} durationSec={recordingSeconds} />
                          </div>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={sendPreviewAudio}
                            disabled={isUploadingAttachment}
                            className="p-2.5 rounded-full bg-primary text-white dark:text-blue-950 cursor-pointer shrink-0 disabled:opacity-50"
                            title="Enviar audio"
                          >
                            {isUploadingAttachment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </motion.button>
                        </div>
                      ) : (
                        <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 p-2.5">
                          <div className="relative" ref={attachMenuRef}>
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.92 }}
                              onClick={() => setShowAttachMenu((v) => !v)}
                              className="p-2 rounded-full text-zinc-500 hover:text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                              title="Adjuntar"
                            >
                              <Paperclip className="w-4 h-4" />
                            </motion.button>
                            <AnimatePresence>
                              {showAttachMenu && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: 8 }}
                                  className={`absolute bottom-full left-0 mb-2 w-48 rounded-2xl border shadow-xl p-1.5 z-20 ${
                                    darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => imageVideoInputRef.current?.click()}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-primary/10 text-left text-xs font-semibold cursor-pointer"
                                  >
                                    <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 shrink-0">
                                      <ImageIcon className="w-3.5 h-3.5" />
                                    </span>
                                    Imágenes y Videos
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => documentInputRef.current?.click()}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-primary/10 text-left text-xs font-semibold cursor-pointer"
                                  >
                                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
                                      <FileText className="w-3.5 h-3.5" />
                                    </span>
                                    Documentos
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cameraInputRef.current?.click()}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-primary/10 text-left text-xs font-semibold cursor-pointer"
                                  >
                                    <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
                                      <Camera className="w-3.5 h-3.5" />
                                    </span>
                                    Abrir Cámara
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowAttachMenu(false);
                                      showToast("Muy pronto vas a poder compartir eventos acá.", "info");
                                    }}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-primary/10 text-left text-xs font-semibold cursor-pointer"
                                  >
                                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                                      <CalendarPlus className="w-3.5 h-3.5" />
                                    </span>
                                    Evento
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <input
                              ref={imageVideoInputRef}
                              type="file"
                              accept="image/*,video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                pickAttachment(file, file?.type.startsWith("video") ? "video" : "image");
                                e.target.value = "";
                              }}
                            />
                            <input
                              ref={documentInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                pickAttachment(file, "document");
                                e.target.value = "";
                              }}
                            />
                            <input
                              ref={cameraInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                pickAttachment(file, "image");
                                e.target.value = "";
                              }}
                            />
                          </div>

                          <input
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder={pendingAttachment ? "Agregar un comentario..." : "Escribe un mensaje..."}
                            className="flex-1 px-3.5 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                          />

                          {messageText.trim() || pendingAttachment ? (
                            <motion.button
                              type="submit"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.9 }}
                              animate={justSent ? { scale: [1, 1.25, 1], rotate: [0, -18, 0] } : { scale: 1, rotate: 0 }}
                              transition={{ duration: 0.35, ease: "easeOut" }}
                              disabled={isUploadingAttachment}
                              className="p-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              {isUploadingAttachment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </motion.button>
                          ) : (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={handleMicClick}
                              className="p-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 cursor-pointer shrink-0"
                              title="Grabar audio"
                            >
                              <Mic className="w-4 h-4" />
                            </motion.button>
                          )}
                        </form>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 font-medium p-6 text-center">
                    <div>
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Selecciona un contacto para empezar a chatear.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
