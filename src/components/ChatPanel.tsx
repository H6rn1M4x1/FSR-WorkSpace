import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle,
  Send,
  UserPlus,
  X,
  Check,
  Clock,
  Search,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { ChatContact, ChatMessage } from "../types";
import {
  subscribeToContacts,
  subscribeToUnreadMessages,
  subscribeToConversation,
  subscribeToUserProfileName,
  sendContactInvitation,
  acceptContactInvitation,
  rejectContactInvitation,
  removeContact,
  sendChatMessage,
  markConversationRead,
  getConversationId,
} from "../lib/chatService";

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
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const contactEmails = useMemo(
    () => active.map((c) => (c.fromEmail === normalizedUserEmail ? c.toEmail : c.fromEmail)),
    [active, normalizedUserEmail]
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
      const res = await sendContactInvitation(normalizedUserEmail, newContactEmail);
      setFeedback({ type: res.success ? "success" : "error", text: res.message });
      if (res.success) {
        setNewContactEmail("");
        setShowAddContact(false);
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail || !messageText.trim()) return;
    const text = messageText;
    setMessageText("");
    await sendChatMessage(normalizedUserEmail, selectedEmail, text);
  };

  const getDisplayName = (email: string) => profiles[email]?.displayName || email;
  const getInitial = (email: string) => (profiles[email]?.displayName || email).charAt(0).toUpperCase();

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
            <div className="w-full flex flex-col md:flex-row items-stretch gap-3 h-[420px] md:h-[440px]">
              {/* LEFT: Contacts */}
              <div className={`w-full md:w-72 shrink-0 flex flex-col min-h-0 ${showMobileConversation ? "hidden md:flex" : "flex"}`}>
                <div className="flex items-center justify-between px-1 pb-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-xs font-extrabold">Chat ({contactEmails.length})</h3>
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
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
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
                      <div className="flex items-center gap-1.5 pb-2">
                        <input
                          type="email"
                          required
                          autoFocus
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
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
                      className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-amber-900 dark:text-amber-200 truncate">
                          {getDisplayName(invite.fromEmail)}
                        </div>
                        <div className="text-[9.5px] text-amber-700/80 dark:text-amber-400/80">Quiere agregarte</div>
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
                      return (
                        <motion.div
                          key={email}
                          layout
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setSelectedEmail(email);
                            setShowMobileConversation(true);
                          }}
                          className={`group p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                            isSelected
                              ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                              : darkMode
                              ? "border-zinc-800 hover:border-zinc-700"
                              : "border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitial(email)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11.5px] font-bold text-black dark:text-white truncate block">
                              {getDisplayName(email)}
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">{email}</span>
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
                              if (contact?.id) removeContact(contact.id);
                              if (isSelected) setSelectedEmail(null);
                            }}
                            className="p-1 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
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
                      <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-[11px] flex items-center justify-center shrink-0">
                        {getInitial(selectedEmail)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11.5px] font-bold text-black dark:text-white truncate">{getDisplayName(selectedEmail)}</div>
                        <div className="text-[9.5px] text-zinc-500 truncate">{selectedEmail}</div>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-3 space-y-1.5">
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
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-[12px] font-medium leading-snug ${
                                  isOwn
                                    ? "bg-primary text-white dark:text-blue-950 rounded-br-md"
                                    : darkMode
                                    ? "bg-zinc-800 text-zinc-100 rounded-bl-md"
                                    : "bg-zinc-100 text-zinc-900 rounded-bl-md"
                                }`}
                              >
                                <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                                <div className={`text-[9px] mt-0.5 opacity-70 ${isOwn ? "text-right" : "text-left"}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-2.5 border-t border-zinc-200/60 dark:border-white/10 shrink-0">
                      <input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 px-3.5 py-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all"
                      />
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={!messageText.trim()}
                        className="p-2.5 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 cursor-pointer disabled:opacity-40 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </motion.button>
                    </form>
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
