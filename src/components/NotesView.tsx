import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  StickyNote as StickyNoteIcon,
  KeyRound,
  Pin,
  Trash2,
  Plus,
  X,
  Send,
  Share2,
  Check,
  Pencil,
  Folder,
  FolderPlus,
  ChevronDown,
  Layers,
  Loader2,
  Briefcase,
  Home,
  Heart,
  Star,
  BookOpen,
  ShoppingBag,
  Plane,
  GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNotes } from "../hooks/useNotes";
import { useNoteFolders } from "../hooks/useNoteFolders";
import { useToast } from "../context/ToastContext";
import { uiSounds } from "../lib/sounds";
import { ConfirmationModal } from "./ConfirmationModal";
import { RichTextEditor } from "./RichTextEditor";
import { SharedBadge } from "./SharedBadge";
import { SubNav } from "./SubNav";
import { PasswordVaultPanel } from "./PasswordVaultPanel";
import { auth } from "../lib/firebase";
import type { StickyNote, NoteFolder } from "../types";

interface NotesViewProps {
  userId: string;
  darkMode?: boolean;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  /** Cambia (a cualquier valor distinto del anterior) para abrir directo el formulario de
   *  "nueva nota" — usado por el botón "+" de la miniatura de Notas Rápidas de Inicio. */
  autoOpenCompose?: number;
}

const NOTE_COLORS: Record<string, { card: string; swatch: string; label: string }> = {
  default: {
    card: "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800",
    swatch: "bg-white dark:bg-zinc-900",
    label: "Sin color",
  },
  red: {
    card: "bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-900",
    swatch: "bg-red-300 dark:bg-red-700",
    label: "Rojo",
  },
  orange: {
    card: "bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-900",
    swatch: "bg-orange-300 dark:bg-orange-700",
    label: "Naranja",
  },
  yellow: {
    card: "bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
    swatch: "bg-amber-300 dark:bg-amber-700",
    label: "Amarillo",
  },
  green: {
    card: "bg-emerald-100 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900",
    swatch: "bg-emerald-300 dark:bg-emerald-700",
    label: "Verde",
  },
  sky: {
    card: "bg-sky-100 dark:bg-sky-950 border-sky-200 dark:border-sky-900",
    swatch: "bg-sky-300 dark:bg-sky-700",
    label: "Celeste",
  },
  blue: {
    card: "bg-blue-100 dark:bg-blue-950 border-blue-200 dark:border-blue-900",
    swatch: "bg-blue-300 dark:bg-blue-700",
    label: "Azul",
  },
  violet: {
    card: "bg-violet-100 dark:bg-violet-950 border-violet-200 dark:border-violet-900",
    swatch: "bg-violet-300 dark:bg-violet-700",
    label: "Violeta",
  },
  pink: {
    card: "bg-pink-100 dark:bg-pink-950 border-pink-200 dark:border-pink-900",
    swatch: "bg-pink-300 dark:bg-pink-700",
    label: "Rosa",
  },
};
const COLOR_KEYS = Object.keys(NOTE_COLORS);

// Formas disponibles para el ícono de cada carpeta — a diferencia de antes, el ícono de una
// carpeta SIEMPRE se pinta con el color de acento de la app (ver usos de "text-primary" más
// abajo); lo que distingue una carpeta de otra ahora es la forma del ícono, no un color propio.
const FOLDER_ICONS: Record<string, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  home: Home,
  heart: Heart,
  star: Star,
  book: BookOpen,
  shopping: ShoppingBag,
  plane: Plane,
  graduation: GraduationCap,
};
const FOLDER_ICON_KEYS = Object.keys(FOLDER_ICONS);

// The dark, semi-transparent "floating pill" look requested for every icon toolbar and
// popover in this view, so icons never sit directly on a note's color with nothing behind them.
const DARK_PANEL = "bg-black/55 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg";
// Variante sólida (sin transparencia) de DARK_PANEL para el desplegable de carpetas: al ser
// semitransparente, el texto/contenido de la nota de abajo se veía traslucir por encima.
const DARK_PANEL_SOLID = "bg-zinc-900 rounded-2xl border border-white/10 shadow-lg";

type NoteMenu = "format" | "color" | "list" | "share" | "bgcolor" | "folder" | null;
export type Draft = { title: string; text: string };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Texto plano, recortado, para la vista previa de la lista compacta del medio.
function stripHtmlPreview(html: string): string {
  const text = (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
}

// "Hoy"/"Ayer" para fechas recientes, igual que el diseño de referencia — una fecha corta para
// cualquier otro día.
function formatNoteDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** Own notes sort by their manual drag order; shared-in ones (which have no order of their own) fall back to most-recently-updated. */
function compareNotes(a: StickyNote, b: StickyNote): number {
  const aOrder = a.__sharedByEmail ? null : a.order;
  const bOrder = b.__sharedByEmail ? null : b.order;
  if (aOrder != null && bOrder != null) return aOrder - bOrder;
  if (aOrder != null) return -1;
  if (bOrder != null) return 1;
  return b.updatedAt - a.updatedAt;
}

function ColorPicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-20 bottom-full right-0 mb-1.5 p-2 flex flex-wrap gap-1.5 w-36 ${DARK_PANEL}`}
    >
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          title={NOTE_COLORS[key].label}
          onClick={() => {
            onChange(key);
            onClose();
          }}
          className={`w-6 h-6 rounded-full border border-white/20 cursor-pointer ${NOTE_COLORS[key].swatch} ${
            value === key ? "ring-2 ring-primary ring-offset-1 ring-offset-black" : ""
          }`}
        />
      ))}
    </div>
  );
}

/** Lista desplegable para asignar la carpeta de una nota (botón al final de la barra de
 *  herramientas del editor) — misma mecánica que ColorPicker. */
function FolderPicker({
  folders,
  value,
  onChange,
  onClose,
  align = "left",
}: {
  folders: NoteFolder[];
  value: string | undefined;
  onChange: (folderId: string | undefined) => void;
  onClose: () => void;
  align?: "left" | "right";
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`absolute z-20 top-full ${align === "right" ? "right-0" : "left-0"} mt-1.5 p-1.5 w-48 max-h-60 overflow-y-auto space-y-0.5 ${DARK_PANEL_SOLID}`}
    >
      <button
        type="button"
        onClick={() => { onChange(undefined); onClose(); }}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-left cursor-pointer ${
          !value ? "bg-primary/25 text-white" : "text-zinc-200 hover:bg-white/10"
        }`}
      >
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Sin carpeta</span>
      </button>
      {folders.map((f) => {
        const FolderIcon = FOLDER_ICONS[f.icon] || Folder;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => { onChange(f.id); onClose(); }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-left cursor-pointer ${
              value === f.id ? "bg-primary/25 text-white" : "text-zinc-200 hover:bg-white/10"
            }`}
          >
            <FolderIcon className="w-3.5 h-3.5 shrink-0 text-primary" fill="currentColor" fillOpacity={0.2} />
            <span className="truncate">{f.name}</span>
          </button>
        );
      })}
      {folders.length === 0 && (
        <p className="px-2.5 py-1.5 text-[10px] text-zinc-400">Todavía no creaste ninguna carpeta.</p>
      )}
    </div>
  );
}

/** Rendered INSIDE the RichTextEditor's own toolbar (as its "share" row) — same place/style as format/color/list. */
function ShareRowContent({
  recipients,
  allKnownRecipients,
  onShare,
  onUnshare,
}: {
  recipients: string[];
  allKnownRecipients: string[];
  onShare: (email: string) => Promise<void>;
  onUnshare: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const handleShare = async (target?: string) => {
    const value = (target ?? email).trim();
    setError(null);
    setConfirmed(null);
    if (!isValidEmail(value)) {
      setError("Ingresá un email válido.");
      return;
    }
    setBusy(true);
    try {
      await onShare(value);
      if (!target) setEmail("");
      setConfirmed(value);
      setTimeout(() => setConfirmed((c) => (c === value ? null : c)), 3000);
    } catch (err: any) {
      setError(err?.message || "No se pudo compartir la nota.");
    } finally {
      setBusy(false);
    }
  };

  const quickPicks = allKnownRecipients.filter((e) => !recipients.includes(e));

  return (
    <div className="space-y-2 w-full max-w-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleShare()}
          placeholder="email@ejemplo.com"
          className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => handleShare()}
          disabled={busy}
          className="p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white disabled:opacity-50 shrink-0"
          title="Compartir"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[10px] font-bold text-red-400">{error}</p>}
      {confirmed && (
        <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
          <Check className="w-3 h-3" /> Compartida con {confirmed}.
        </p>
      )}

      {quickPicks.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
            Usuarios existentes (con los que ya compartiste)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPicks.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleShare(r)}
                className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold text-zinc-200 truncate max-w-[140px]"
                title={`Compartir con ${r}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {recipients.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-white/10">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Compartida con</p>
          {recipients.map((r) => (
            <div key={r} className="flex items-center justify-between gap-2 text-xs text-zinc-200">
              <span className="truncate">{r}</span>
              <button
                type="button"
                onClick={() => onUnshare(r)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-red-400 shrink-0"
                title="Dejar de compartir"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Panel grande de la derecha: la nota seleccionada, siempre editable ahí mismo (sin modal
 *  aparte). El botón de carpeta vive DENTRO de la barra de herramientas del editor, al final de
 *  todo (ver extraToolbarActions en RichTextEditor), con su propio cierre al hacer clic afuera. */
function NoteDetailPane({
  note,
  draft,
  folders,
  menu,
  onSetDraft,
  onSetMenu,
  onUpdateNote,
  onSaveDraft,
  onTogglePin,
  onDelete,
  recipients,
  allKnownRecipients,
  onShare,
  onUnshare,
}: {
  note: StickyNote;
  draft: Draft | undefined;
  folders: NoteFolder[];
  menu: NoteMenu;
  onSetDraft: (patch: Partial<Draft>) => void;
  onSetMenu: (menu: NoteMenu) => void;
  onUpdateNote: (
    id: string,
    patch: Partial<Pick<StickyNote, "title" | "text" | "color" | "pinned" | "attachments" | "order" | "folderId">>
  ) => Promise<void>;
  onSaveDraft: (patch: Draft) => void | Promise<void>;
  onTogglePin: () => void;
  onDelete: () => void;
  recipients: string[];
  allKnownRecipients: string[];
  onShare: (email: string) => Promise<void>;
  onUnshare: (email: string) => Promise<void>;
}) {
  const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
  const titleValue = draft?.title !== undefined ? draft.title : note.title || "";
  const textValue = draft?.text !== undefined ? draft.text : note.text;
  const isSharedIn = !!note.__sharedByEmail;

  // El selector de carpeta es un botón "extra" inyectado en la barra del editor (no es un menú
  // propio de RichTextEditor), así que necesita su propio cierre al hacer clic afuera.
  useEffect(() => {
    if (menu !== "folder") return;
    const close = () => onSetMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu, onSetMenu]);

  // Indicador de guardado (círculo girando → palomita) en la esquina superior derecha de la nota
  // abierta: envuelve onSaveDraft (disparado por SaveOnIdle más abajo) para reflejar en pantalla
  // cuándo el guardado automático está en curso y cuándo terminó.
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (savedResetRef.current) clearTimeout(savedResetRef.current); }, []);
  const handleSaveDraft = useCallback(
    (patch: Draft) => {
      setSaveStatus("saving");
      Promise.resolve(onSaveDraft(patch)).then(() => {
        setSaveStatus("saved");
        if (savedResetRef.current) clearTimeout(savedResetRef.current);
        savedResetRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
      });
    },
    [onSaveDraft]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={`relative rounded-2xl border p-4 shadow-sm ${palette.card}`}
    >
      <AnimatePresence>
        {saveStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full flex items-center justify-center"
            title={saveStatus === "saving" ? "Guardando..." : "Guardado"}
          >
            {saveStatus === "saving" ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {isSharedIn && (
        <div className="mb-2">
          <SharedBadge item={note} />
        </div>
      )}

      <input
        value={titleValue}
        onChange={(e) => onSetDraft({ title: e.target.value })}
        placeholder="Título"
        className="w-full bg-transparent text-base font-extrabold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400 placeholder:font-extrabold mb-2"
      />

      <RichTextEditor
        value={textValue}
        onChange={(html) => onSetDraft({ text: html })}
        placeholder="Escribí algo..."
        darkToolbar
        attachments={note.attachments || []}
        onAttachmentsChange={(atts) => onUpdateNote(note.id, { attachments: atts })}
        activeMenu={menu === "bgcolor" || menu === "folder" ? null : menu}
        onActiveMenuChange={onSetMenu}
        onShareClick={isSharedIn ? undefined : () => onSetMenu("share")}
        shareMenuContent={
          isSharedIn ? undefined : (
            <ShareRowContent
              recipients={recipients}
              allKnownRecipients={allKnownRecipients}
              onShare={onShare}
              onUnshare={onUnshare}
            />
          )
        }
        extraToolbarActions={
          isSharedIn ? undefined : (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetMenu(menu === "folder" ? null : "folder");
                }}
                className={`p-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  menu === "folder" ? "bg-primary/20 text-primary" : "text-slate-500 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
                title="Carpeta"
              >
                <Folder className="w-4 h-4" />
              </button>
              {menu === "folder" && (
                <FolderPicker
                  folders={folders}
                  value={note.folderId}
                  onChange={(folderId) => onUpdateNote(note.id, { folderId })}
                  onClose={() => onSetMenu(null)}
                  align="right"
                />
              )}
            </div>
          )
        }
      />

      {/* Commit the debounced draft to Firestore once the user stops typing — see SaveOnIdle. */}
      <SaveOnIdle
        draft={{ title: titleValue, text: textValue }}
        original={{ title: note.title || "", text: note.text }}
        onSave={handleSaveDraft}
      />

      <div className="flex items-center justify-between mt-3">
        <span className="flex items-center gap-1 text-[10.5px] text-zinc-400 font-bold truncate">
          <Folder className="w-3 h-3 shrink-0" />
          {folders.find((f) => f.id === note.folderId)?.name || "Sin carpeta"}
        </span>
        <div className={`relative flex items-center gap-1 p-1 ${DARK_PANEL}`}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSetMenu(menu === "bgcolor" ? null : "bgcolor"); }}
            className="w-6 h-6 rounded-full border border-white/20 cursor-pointer flex items-center justify-center"
            title="Color"
          >
            <span className={`w-4 h-4 rounded-full ${palette.swatch}`} />
          </button>
          {menu === "bgcolor" && (
            <ColorPicker
              value={note.color}
              onChange={(color) => onUpdateNote(note.id, { color })}
              onClose={() => onSetMenu(null)}
            />
          )}
          {!isSharedIn && (
            <button
              type="button"
              onClick={onTogglePin}
              className="p-1.5 rounded-lg hover:bg-white/15 text-zinc-200 cursor-pointer"
              title={note.pinned ? "Desfijar" : "Fijar"}
            >
              <Pin className={`w-4 h-4 ${note.pinned ? "fill-current text-primary" : ""}`} />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-200 hover:text-red-400 cursor-pointer"
            title={isSharedIn ? "Dejar de ver esta nota" : "Eliminar"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function NotesView({
  userId,
  darkMode = false,
  activeSubTab: propActiveSubTab,
  onSubTabChange,
  autoOpenCompose,
}: NotesViewProps) {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    shareNote,
    unshareNote,
    getRecipients,
    getAllRecipients,
    reorderNotes,
  } = useNotes(userId);
  const { folders, addFolder, renameFolder, setFolderIcon, deleteFolder } = useNoteFolders(userId);
  const { showToast } = useToast();

  // The submenu ("Notas Rápidas" / "Caja Fuerte") is normally driven by the main top navbar
  // (see SUBMENUS_BY_TAB in TopNavbar.tsx), same as Turnos/Salud/etc. Fall back to local state
  // only if this view is ever rendered without that wiring.
  const [localActiveSubTab, setLocalActiveTab] = useState<"quick" | "vault">("quick");
  const activeSubTab = (propActiveSubTab as "quick" | "vault") || localActiveSubTab;
  const setActiveSubTab = (tab: "quick" | "vault") => {
    if (onSubTabChange) onSubTabChange(tab);
    setLocalActiveTab(tab);
  };
  useEffect(() => {
    if (propActiveSubTab) {
      setLocalActiveTab(propActiveSubTab as "quick" | "vault");
    }
  }, [propActiveSubTab]);

  // The password vault's TOTP reveal-gate reuses the same Google Authenticator secret set
  // up under Ajustes > Seguridad — read straight from the locally-persisted profile.
  const [twoFactor, setTwoFactor] = useState<{ enabled: boolean; secret: string }>({
    enabled: false,
    secret: "",
  });
  useEffect(() => {
    const readProfile = () => {
      try {
        const saved = localStorage.getItem("liquid_user_profile");
        const parsed = saved ? JSON.parse(saved) : {};
        setTwoFactor({
          enabled: !!parsed.twoFactorEnabled,
          secret: parsed.twoFactorSecret || "",
        });
      } catch (_) {
        // ignore malformed/missing profile
      }
    };
    readProfile();
    window.addEventListener("storage", readProfile);
    return () => window.removeEventListener("storage", readProfile);
  }, []);

  // Nota mostrada/editada en el panel grande de la derecha (columna de detalle) — null cuando
  // la carpeta actual no tiene notas. "+ Nueva nota" crea una nota vacía y la selecciona acá
  // mismo en vez de abrir un formulario aparte: el panel de la derecha ES el editor, tanto para
  // una nota nueva como para una existente.
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  useEffect(() => {
    if (autoOpenCompose) handleCreateNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenCompose]);

  // Carpeta seleccionada en la barra lateral (null = "Todas las notas"); una nota nueva se crea
  // directo en la carpeta que se esté mirando, igual que en el diseño de referencia.
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState(FOLDER_ICON_KEYS[0]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [deleteFolderConfirmId, setDeleteFolderConfirmId] = useState<string | null>(null);
  // Carpeta de la barra lateral sobre la que se está arrastrando una nota ahora mismo, para
  // resaltarla como destino — se limpia también en el dragEnd de la nota (ver más abajo).
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Exactly one popover open across the whole board at a time: format/color/list/share
  // (rendered inside RichTextEditor) and this note's own background-color swatch.
  const [openMenu, setOpenMenu] = useState<{ id: string; menu: NoteMenu } | null>(null);
  const [rightClickMenu, setRightClickMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  // Drag-and-drop reordering (press and hold, then drag).
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // Posición (DOMRect) de cada nota del grupo, congelada en el instante en que arranca el
  // arrastre — la clave de esto es NO recalcularla mientras se arrastra. Si en cambio se usara
  // qué elemento está físicamente bajo el cursor en cada instante (dragover nativo), la propia
  // animación que corre a las notas para hacerles lugar termina moviendo OTRA nota justo debajo
  // del cursor a mitad de camino, lo que dispara otro reordenamiento y así en bucle infinito ("se
  // bugea... cambia constantemente"). Comparando en cambio la posición del CURSOR contra estas
  // posiciones congeladas, el objetivo del arrastre solo cambia cuando el usuario realmente mueve
  // el mouse a otra nota, nunca como efecto secundario de la propia animación.
  const dragSnapshotRef = useRef<Map<string, DOMRect>>(new Map());
  // Elemento DOM de cada nota (de cualquier grupo) — se usa para tomar la foto de arriba.
  const noteElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  // Clon 100% sólido (sin la transparencia que el navegador le pone por defecto a la imagen de
  // arrastre nativa) que sigue al cursor mientras se arrastra una nota — ver dataTransfer.
  // setDragImage con un canvas en blanco en renderNoteListItem.
  const [dragGhost, setDragGhost] = useState<{ note: StickyNote; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!rightClickMenu) return;
    const close = () => setRightClickMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [rightClickMenu]);

  useEffect(() => {
    if (!folderMenuId) return;
    const close = () => setFolderMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [folderMenuId]);

  const menuFor = (id: string): NoteMenu => (openMenu?.id === id ? openMenu.menu : null);
  const setMenuFor = (id: string, menu: NoteMenu) => setOpenMenu(menu ? { id, menu } : null);

  // Crea una nota vacía directo en la carpeta que se esté mirando y la deja seleccionada en el
  // panel de la derecha, lista para escribir — el panel de detalle ES el editor, no hay un
  // formulario de "nueva nota" aparte.
  const handleCreateNote = async () => {
    uiSounds.save();
    const created = await addNote("", "", "default", [], selectedFolderId || undefined, true);
    if (created) setSelectedNoteId(created.id);
  };

  const handleCreateFolder = async () => {
    const created = await addFolder(newFolderName, newFolderIcon);
    uiSounds.success();
    setNewFolderName("");
    setNewFolderIcon(FOLDER_ICON_KEYS[0]);
    setNewFolderOpen(false);
    if (created) setSelectedFolderId(created.id);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!deleteFolderConfirmId) return;
    const id = deleteFolderConfirmId;
    setDeleteFolderConfirmId(null);
    // Las notas de la carpeta no se borran — vuelven a "Todas las notas".
    await Promise.all(
      notes.filter((n) => n.folderId === id && !n.__sharedByEmail).map((n) => updateNote(n.id, { folderId: undefined }))
    );
    await deleteFolder(id);
    uiSounds.delete();
    if (selectedFolderId === id) setSelectedFolderId(null);
    showToast("Carpeta eliminada. Sus notas pasaron a “Todas las notas”.", "success");
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    const isSharedIn = notes.find((n) => n.id === id)?.__sharedByEmail;
    await deleteNote(id);
    uiSounds.delete();
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedNoteId((prev) => (prev === id ? null : prev));
    showToast(isSharedIn ? "Dejaste de ver esta nota compartida." : "Nota eliminada.", "success");
  };

  // Cantidad de notas por carpeta, SIEMPRE sobre el total (no sobre lo filtrado) — así los
  // contadores de la barra lateral no cambian según qué carpeta se esté mirando.
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach((n) => {
      if (n.folderId) counts[n.folderId] = (counts[n.folderId] || 0) + 1;
    });
    return counts;
  }, [notes]);

  const visibleNotes = selectedFolderId ? notes.filter((n) => n.folderId === selectedFolderId) : notes;
  const pinned = visibleNotes.filter((n) => n.pinned).sort(compareNotes);
  const others = visibleNotes.filter((n) => !n.pinned).sort(compareNotes);
  const orderedVisible = [...pinned, ...others];
  const selectedNote = orderedVisible.find((n) => n.id === selectedNoteId) || null;

  // Si no hay nada seleccionado (primera carga, se cambió de carpeta, o se borró la nota que
  // estaba abierta) pero la lista actual tiene notas, se selecciona la primera — el panel de
  // detalle de la derecha nunca queda vacío mientras haya algo para mostrar.
  useEffect(() => {
    if (!selectedNote && orderedVisible.length > 0) setSelectedNoteId(orderedVisible[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote, orderedVisible.map((n) => n.id).join(",")]);

  const handleDrop = async (group: StickyNote[], targetId: string) => {
    const dragId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!dragId || dragId === targetId) return;
    const ids = group.map((n) => n.id);
    const fromIndex = ids.indexOf(dragId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return; // dropped onto a different group — ignore
    const reordered = [...ids];
    reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, dragId);
    await reorderNotes(reordered);
  };

  // Mientras se arrastra una nota sobre otra del mismo grupo, se recalcula acá (solo para el
  // render) dónde quedaría si se soltara ahora — así, junto con el "layout" de motion.div en cada
  // tarjeta, el resto de las notas se corren de lugar con animación EN VIVO mientras se sostiene
  // el arrastre, en vez de recién moverse de golpe al soltar. El orden real que se persiste sigue
  // calculándose en handleDrop, sobre el orden estable (sin esta vista previa).
  const getGroupRenderOrder = (group: StickyNote[]): StickyNote[] => {
    if (!draggingId || !dragOverId || draggingId === dragOverId) return group;
    const ids = group.map((n) => n.id);
    const fromIndex = ids.indexOf(draggingId);
    const toIndex = ids.indexOf(dragOverId);
    if (fromIndex === -1 || toIndex === -1) return group; // se está arrastrando sobre otro grupo
    const reorderedIds = [...ids];
    reorderedIds.splice(fromIndex, 1);
    reorderedIds.splice(toIndex, 0, draggingId);
    const byId = new Map(group.map((n) => [n.id, n]));
    return reorderedIds.map((id) => byId.get(id)!);
  };

  // Fila compacta de la columna del medio — clic para abrirla en el panel grande de la derecha.
  // El drag-and-drop (reordenar dentro del grupo, o soltar sobre una carpeta de la izquierda)
  // sigue viviendo acá, sin cambios en la mecánica: solo cambió cómo se ve la tarjeta.
  const renderNoteListItem = (note: StickyNote, group: StickyNote[]) => {
    const palette = NOTE_COLORS[note.color] || NOTE_COLORS.default;
    const draft = drafts[note.id];
    const titleValue = draft?.title !== undefined ? draft.title : note.title || "";
    const textValue = draft?.text !== undefined ? draft.text : note.text;
    const isSharedIn = !!note.__sharedByEmail;
    const isSelected = selectedNoteId === note.id;
    const folderName = folders.find((f) => f.id === note.folderId)?.name;

    return (
      // Envoltorio de plain <div> (no motion) SOLO para el drag nativo: motion.div reinterpreta
      // "onDragStart"/"onDragEnd" como sus propios gestos de arrastre (firma distinta, sin
      // dataTransfer) en vez de los eventos nativos de HTML5 drag-and-drop que necesitamos acá —
      // de ahí que la animación de layout viva en el motion.div de adentro, no en este.
      <div
        key={note.id}
        ref={(el) => {
          if (el) noteElsRef.current.set(note.id, el);
          else noteElsRef.current.delete(note.id);
        }}
        draggable={!isSharedIn}
        onDragStart={(e) => {
          setDraggingId(note.id);
          // Foto de la posición de cada nota del grupo, tomada ahora (antes de que nada se
          // empiece a mover) — el resto del arrastre compara el cursor contra ESTA foto, nunca
          // contra las posiciones en vivo (ver el comentario junto a dragSnapshotRef).
          const snapshot = new Map<string, DOMRect>();
          group.forEach((n) => {
            const el = noteElsRef.current.get(n.id);
            if (el) snapshot.set(n.id, el.getBoundingClientRect());
          });
          dragSnapshotRef.current = snapshot;
          // La imagen de arrastre nativa del navegador siempre sale semitransparente, sin
          // forma de evitarlo — en vez de pelear contra eso, se la reemplaza por un canvas en
          // blanco de 1x1 (invisible) y se dibuja un clon propio, 100% sólido, seguido al
          // cursor a mano (ver dragGhost / el onDrag de acá abajo y su render al final del
          // componente). Así la nota arrastrada se ve en sólido, como pide el diseño.
          try {
            const blank = document.createElement("canvas");
            blank.width = 1;
            blank.height = 1;
            e.dataTransfer.setDragImage(blank, 0, 0);
          } catch {}
          setDragGhost({ note, x: e.clientX, y: e.clientY });
          uiSounds.click();
        }}
        onDrag={(e) => {
          // El último evento "drag" antes de soltar suele llegar con clientX/clientY en 0 en
          // varios navegadores — ignorarlo evita que el clon salte al origen de la pantalla
          // justo antes de desaparecer.
          if (e.clientX === 0 && e.clientY === 0) return;
          setDragGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g));
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setDragOverId(null);
          setDragOverFolderId(null);
          setDragGhost(null);
          dragSnapshotRef.current = new Map();
        }}
        onDragOver={(e) => {
          if (!draggingId) return;
          e.preventDefault();
          const snapshot = dragSnapshotRef.current;
          if (snapshot.size === 0) return;
          // Nota más cercana al cursor según la foto congelada — no según qué elemento quedó
          // físicamente debajo del cursor ahora mismo, que va cambiando por la propia animación.
          let closestId: string | null = null;
          let closestDist = Infinity;
          snapshot.forEach((r, id) => {
            if (id === draggingId) return;
            const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
            if (dist < closestDist) {
              closestDist = dist;
              closestId = id;
            }
          });
          if (closestId && closestId !== dragOverId) setDragOverId(closestId);
        }}
        onDrop={(e) => {
          e.preventDefault();
          // Usa dragOverId (calculado contra la foto congelada), NUNCA note.id de este
          // elemento puntual — el evento nativo "drop" dispara sobre lo que esté físicamente
          // bajo el cursor en ese instante, que puede no coincidir con el destino ya mostrado
          // en la vista previa (sobre todo con una nota grande, cuya propia animación puede
          // dejar al cursor momentáneamente sobre la nota arrastrada u otra distinta). Sin
          // esto, a veces el "drop" terminaba cayendo sobre la misma nota arrastrada y
          // handleDrop no hacía nada, volviendo todo a como estaba.
          if (dragOverId) handleDrop(group, dragOverId);
        }}
        onContextMenu={(e) => {
          if (isSharedIn) return; // can't re-share something shared to me
          e.preventDefault();
          setRightClickMenu({ id: note.id, x: e.clientX, y: e.clientY });
        }}
      >
        <motion.button
          type="button"
          layout
          transition={{ layout: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (selectedNoteId !== note.id) uiSounds.expand();
            setSelectedNoteId(note.id);
          }}
          className={`w-full text-left rounded-2xl border p-3 shadow-sm transition-all cursor-pointer ${palette.card} ${
            isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
          } ${draggingId === note.id ? "opacity-30" : ""} ${dragOverId === note.id ? "ring-2 ring-primary" : ""} ${
            !isSharedIn ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          {isSharedIn && (
            <div className="mb-1">
              <SharedBadge item={note} />
            </div>
          )}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">{titleValue || "Sin título"}</span>
            {note.pinned && <Pin className="w-3 h-3 fill-current text-primary shrink-0" />}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 min-h-[2.2em]">
            {stripHtmlPreview(textValue) || "Nota vacía"}
          </p>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <span className="flex items-center gap-1 text-[9.5px] font-bold text-zinc-400 truncate">
              <Folder className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{folderName || "Sin carpeta"}</span>
            </span>
            <span className="text-[9.5px] text-zinc-400 shrink-0">{formatNoteDate(note.updatedAt)}</span>
          </div>
        </motion.button>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6">
      {!propActiveSubTab && (
        <SubNav
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as "quick" | "vault")}
          className="mb-6"
          tabs={[
            { id: "quick", label: "Notas Rápidas", icon: StickyNoteIcon },
            { id: "vault", label: "Caja Fuerte", icon: KeyRound },
          ]}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {activeSubTab === "vault" ? (
            <PasswordVaultPanel
              userId={userId || auth.currentUser?.email || ""}
              darkMode={darkMode}
              twoFactorEnabled={twoFactor.enabled}
              twoFactorSecret={twoFactor.secret}
            />
          ) : (
      <div
        className={`rounded-3xl border p-4 sm:p-6 space-y-6 scroll-reveal ${
          darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white/80 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <StickyNoteIcon className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">Notas</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Recordatorios e información que querés tener siempre a la vista. Arrastrá una nota
              para reordenarla o soltala sobre una carpeta para moverla.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_300px_1fr] gap-5 items-start">
          {/* Columna 1: barra lateral de carpetas — "Todas las notas" + cada carpeta propia.
              Cada fila de carpeta es también blanco de drop: soltar ahí una nota que se esté
              arrastrando (draggingId, ver el drag-and-drop de cada tarjeta) le asigna esa
              carpeta. */}
          <div className="lg:sticky lg:top-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">Carpetas</p>
              <button
                type="button"
                onClick={() => { setNewFolderOpen((v) => !v); uiSounds.click(); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-primary cursor-pointer"
                title="Nueva carpeta"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <AnimatePresence>
              {newFolderOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`p-2.5 rounded-xl border space-y-2 overflow-hidden ${darkMode ? "bg-zinc-950/60 border-zinc-800" : "bg-slate-50 border-slate-200"}`}
                >
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                    placeholder="Nombre de la carpeta"
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {FOLDER_ICON_KEYS.map((key) => {
                      const Icon = FOLDER_ICONS[key];
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { setNewFolderIcon(key); uiSounds.click(); }}
                          title="Ícono de la carpeta"
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-primary cursor-pointer transition-transform ${
                            newFolderIcon === key
                              ? "bg-primary/20 ring-2 ring-primary scale-110"
                              : "hover:bg-primary/10 hover:scale-110"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setNewFolderOpen(false); setNewFolderName(""); }}
                      className="px-2.5 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim()}
                      className="px-3 py-1 rounded-full bg-primary hover:bg-primary/90 text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      Crear
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => { setSelectedFolderId(null); uiSounds.navigate(); }}
                className={`shrink-0 flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedFolderId === null
                    ? "bg-primary text-white dark:text-zinc-950 shadow-md"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left truncate">Todas las notas</span>
                <span className={`text-[10px] font-semibold ${selectedFolderId === null ? "text-white/80 dark:text-zinc-950/70" : "text-zinc-400"}`}>
                  {notes.length}
                </span>
              </motion.button>

              {folders.map((f) => {
                const FolderIcon = FOLDER_ICONS[f.icon] || Folder;
                const isEditing = editingFolderId === f.id;
                const isActive = selectedFolderId === f.id;
                return (
                  <motion.div
                    key={f.id}
                    layout
                    onDragOver={(e) => {
                      if (!draggingId) return;
                      e.preventDefault();
                      if (dragOverFolderId !== f.id) setDragOverFolderId(f.id);
                    }}
                    onDragLeave={() => setDragOverFolderId((id) => (id === f.id ? null : id))}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingId) {
                        updateNote(draggingId, { folderId: f.id });
                        uiSounds.toggle();
                      }
                      setDraggingId(null);
                      setDragOverId(null);
                      setDragOverFolderId(null);
                    }}
                    className={`group relative shrink-0 flex items-center gap-1 rounded-xl transition-colors ${
                      dragOverFolderId === f.id ? "ring-2 ring-primary bg-primary/10" : ""
                    } ${isActive && dragOverFolderId !== f.id ? "bg-primary text-white dark:text-zinc-950 shadow-md" : ""}`}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { renameFolder(f.id, editingFolderName); setEditingFolderId(null); }
                          if (e.key === "Escape") setEditingFolderId(null);
                        }}
                        onBlur={() => { if (editingFolderName.trim()) renameFolder(f.id, editingFolderName); setEditingFolderId(null); }}
                        className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-primary text-xs font-bold text-zinc-900 dark:text-white focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setSelectedFolderId(f.id); uiSounds.navigate(); }}
                        className={`flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                          isActive ? "" : "text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <FolderIcon
                          className={`w-3.5 h-3.5 shrink-0 ${isActive ? "" : "text-primary"}`}
                          fill="currentColor"
                          fillOpacity={isActive ? 0.35 : 0.2}
                        />
                        <span className="flex-1 text-left truncate">{f.name}</span>
                        <span className={`text-[10px] font-semibold ${isActive ? "text-white/80 dark:text-zinc-950/70" : "text-zinc-400"}`}>
                          {folderCounts[f.id] || 0}
                        </span>
                      </button>
                    )}
                    {!isEditing && (
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setFolderMenuId(folderMenuId === f.id ? null : f.id); }}
                          className={`opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 mr-1 rounded-lg cursor-pointer ${
                            isActive ? "hover:bg-black/15 text-white/80 dark:text-zinc-950/70" : "hover:bg-black/10 dark:hover:bg-white/10 text-zinc-400"
                          }`}
                          title="Opciones de la carpeta"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {folderMenuId === f.id && (
                          <div onClick={(e) => e.stopPropagation()} className={`absolute z-20 top-full right-0 mt-1 p-1 w-36 ${DARK_PANEL}`}>
                            <button
                              type="button"
                              onClick={() => { setEditingFolderId(f.id); setEditingFolderName(f.name); setFolderMenuId(null); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-left text-zinc-200 hover:bg-white/10 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Renombrar
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDeleteFolderConfirmId(f.id); setFolderMenuId(null); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-left text-red-400 hover:bg-red-500/15 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Columna 2: lista compacta de notas de la carpeta actual — clic en una la abre en el
              panel grande de la derecha. Ancho fijo (300px) para que entren cómodas al menos 2
              tarjetas apiladas sin que la columna se achique. */}
          <div className="space-y-4 min-w-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateNote}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white dark:text-zinc-950 text-xs font-bold hover:bg-primary/90 cursor-pointer transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nueva nota
            </motion.button>

            {visibleNotes.length === 0 && (
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 py-10 px-2">
                {notes.length === 0
                  ? "Todavía no tenés notas. Creá la primera de arriba — quedan guardadas de forma permanente hasta que las borres."
                  : "Esta carpeta todavía no tiene notas."}
              </p>
            )}

            {pinned.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 px-1">
                  <Pin className="w-3 h-3" /> Fijadas
                </p>
                <div className="space-y-2.5">{getGroupRenderOrder(pinned).map((n) => renderNoteListItem(n, pinned))}</div>
              </div>
            )}

            {others.length > 0 && (
              <div className="space-y-2">
                {pinned.length > 0 && (
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 px-1">Otras</p>
                )}
                <div className="space-y-2.5">{getGroupRenderOrder(others).map((n) => renderNoteListItem(n, others))}</div>
              </div>
            )}
          </div>

          {/* Columna 3: panel de detalle — la nota seleccionada, siempre editable ahí mismo
              (nada de modal aparte). */}
          <div className="lg:sticky lg:top-4 min-w-0">
            {selectedNote ? (
              <NoteDetailPane
                key={selectedNote.id}
                note={selectedNote}
                draft={drafts[selectedNote.id]}
                folders={folders}
                menu={menuFor(selectedNote.id)}
                onSetDraft={(patch) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [selectedNote.id]: {
                      title: prev[selectedNote.id]?.title !== undefined ? prev[selectedNote.id].title : selectedNote.title || "",
                      text: prev[selectedNote.id]?.text !== undefined ? prev[selectedNote.id].text : selectedNote.text,
                      ...patch,
                    },
                  }))
                }
                onSetMenu={(m) => setMenuFor(selectedNote.id, m)}
                onUpdateNote={updateNote}
                onSaveDraft={async (patch) => {
                  await updateNote(selectedNote.id, patch);
                  setDrafts((prev) => {
                    const next = { ...prev };
                    delete next[selectedNote.id];
                    return next;
                  });
                }}
                onTogglePin={() => { togglePin(selectedNote.id); uiSounds.toggle(); }}
                onDelete={() => setDeleteConfirmId(selectedNote.id)}
                recipients={getRecipients(selectedNote.id)}
                allKnownRecipients={getAllRecipients()}
                onShare={async (email) => {
                  await shareNote(selectedNote.id, email);
                  showToast(`Nota compartida con ${email}.`, "success");
                }}
                onUnshare={async (email) => {
                  try {
                    await unshareNote(selectedNote.id, email);
                    showToast(`Se dejó de compartir con ${email}.`, "success");
                  } catch (err: any) {
                    showToast("Error al dejar de compartir: " + (err?.message || String(err)), "error");
                  }
                }}
              />
            ) : (
              <div className={`rounded-2xl border p-8 text-center ${darkMode ? "bg-zinc-950/40 border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
                <StickyNoteIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-medium">Elegí una nota de la lista, o creá una nueva.</p>
              </div>
            )}
          </div>
        </div>
      </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Right-click context menu: just "Compartir con..." for now */}
      {rightClickMenu && (
        <div
          className={`fixed z-50 p-1 ${DARK_PANEL}`}
          style={{ top: rightClickMenu.y, left: rightClickMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedNoteId(rightClickMenu.id);
              setMenuFor(rightClickMenu.id, "share");
              setRightClickMenu(null);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 text-xs font-bold text-zinc-100 cursor-pointer whitespace-nowrap"
          >
            <Share2 className="w-3.5 h-3.5" /> Compartir con...
          </button>
        </div>
      )}

      {/* Clon 100% sólido de la nota que se está arrastrando, siguiendo al cursor — reemplaza la
          imagen de arrastre nativa del navegador (que siempre sale semitransparente). */}
      {dragGhost && (
        <div
          className="fixed z-[1000] pointer-events-none w-[260px]"
          style={{ left: dragGhost.x, top: dragGhost.y, transform: "translate(-24px, -16px) rotate(-5deg)" }}
        >
          <div className={`rounded-2xl border p-3 shadow-2xl ${NOTE_COLORS[dragGhost.note.color]?.card || NOTE_COLORS.default.card}`}>
            <span className="text-xs font-extrabold text-zinc-900 dark:text-white truncate block">
              {dragGhost.note.title || "Sin título"}
            </span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
              {stripHtmlPreview(dragGhost.note.text) || "Nota vacía"}
            </p>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteConfirmId}
        title={notes.find((n) => n.id === deleteConfirmId)?.__sharedByEmail ? "Dejar de ver esta nota" : "Eliminar nota"}
        message={
          notes.find((n) => n.id === deleteConfirmId)?.__sharedByEmail
            ? "Vas a dejar de ver esta nota compartida. La persona que la compartió con vos conserva su copia."
            : "¿Seguro que querés eliminar esta nota? Esta acción no se puede deshacer."
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        darkMode={darkMode}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmationModal
        isOpen={!!deleteFolderConfirmId}
        title="Eliminar carpeta"
        message="¿Seguro que querés eliminar esta carpeta? Sus notas no se borran, vuelven a “Todas las notas”."
        confirmText="Eliminar"
        cancelText="Cancelar"
        darkMode={darkMode}
        onClose={() => setDeleteFolderConfirmId(null)}
        onConfirm={handleConfirmDeleteFolder}
      />
    </div>
  );
}

/**
 * Debounces saving a note's title/rich-text content: commits via onSave 900ms after
 * the user stops typing, instead of on every keystroke or relying on blur (which the
 * editor's own toolbar clicks would trigger prematurely).
 */
export function SaveOnIdle({
  draft,
  original,
  onSave,
}: {
  draft: Draft;
  original: Draft;
  onSave: (patch: Draft) => void;
}) {
  useEffect(() => {
    if (draft.title === original.title && draft.text === original.text) return;
    const timer = setTimeout(() => onSave(draft), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title, draft.text]);
  return null;
}
