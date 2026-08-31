import React, { useState, useEffect } from "react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { generateUniqueId } from "../utils/id";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  BookMarked,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  ExternalLink,
  Star,
  Navigation,
  BookmarkPlus,
  Lightbulb,
  FileText,
  Loader2
} from "lucide-react";

export interface AddressEntry {
  id: string;
  name: string; // e.g., "Sanatorio Argentino" or "Consultorio Odontólogo"
  address: string; // e.g., "San Luis 432 Oeste, Capital, San Juan"
  lat?: number;
  lon?: number;
  notes?: string;
  isFavorite?: boolean;
}

export const DEFAULT_ADDRESSES: AddressEntry[] = [
  {
    id: "def-1",
    name: "Sanatorio Argentino",
    address: "San Luis 432 Oeste, Capital, San Juan, Argentina",
    lat: -31.5348,
    lon: -68.5284,
    notes: "Atención médica central y guardia",
    isFavorite: true,
  },
  {
    id: "def-2",
    name: "Hospital Dr. Guillermo Rawson",
    address: "Av. Rawson 490 Sur, Capital, San Juan, Argentina",
    lat: -31.5435,
    lon: -68.517,
    notes: "Hospital Central",
    isFavorite: true,
  },
  {
    id: "def-3",
    name: "Swiss Medical San Juan",
    address: "Av. Ignacio de la Roza 220 Oeste, Capital, San Juan, Argentina",
    lat: -31.536,
    lon: -68.527,
    notes: "Consultorios externos e imágenes",
    isFavorite: true,
  },
  {
    id: "def-4",
    name: "Clínica El Castaño",
    address: "Catamarca 370 Sur, Capital, San Juan, Argentina",
    lat: -31.541,
    lon: -68.525,
    notes: "Sanatorio e internación",
    isFavorite: false,
  },
  {
    id: "def-5",
    name: "CIMAC San Juan",
    address: "Rivadavia 580 Oeste, Capital, San Juan, Argentina",
    lat: -31.537,
    lon: -68.53,
    notes: "Centro de Investigaciones Médicas",
    isFavorite: false,
  },
  {
    id: "def-6",
    name: "Hospital Marcial Quiroga",
    address: "Av. Libertador 5400 Oeste, Rivadavia, San Juan, Argentina",
    lat: -31.531,
    lon: -68.59,
    notes: "Hospital Rivadavia",
    isFavorite: false,
  },
];

const STORAGE_KEY = "app_address_book_v1";

export function loadSavedAddressBook(): AddressEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ADDRESSES));
      return DEFAULT_ADDRESSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ADDRESSES;
  } catch (e) {
    console.warn("Error loading address book:", e);
    return DEFAULT_ADDRESSES;
  }
}

export function saveAddressBook(entries: AddressEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.warn("Error saving address book:", e);
  }
}

interface AddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (entry: AddressEntry) => void;
  currentSelected?: {
    name?: string;
    address?: string;
    lat?: number;
    lon?: number;
  };
}

export const AddressBookModal: React.FC<AddressBookModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
  currentSelected,
}) => {
  useLockBodyScroll(isOpen);
  const [entries, setEntries] = useState<AddressEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLat, setNewLat] = useState<string>("");
  const [newLon, setNewLon] = useState<string>("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setEntries(loadSavedAddressBook());
      setSearchQuery("");
      setShowAddForm(false);
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = entries.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    setEntries(updated);
    saveAddressBook(updated);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleStartAddCurrent = () => {
    setNewName(currentSelected?.name || "");
    setNewAddress(currentSelected?.address || currentSelected?.name || "");
    setNewLat(currentSelected?.lat ? String(currentSelected.lat) : "");
    setNewLon(currentSelected?.lon ? String(currentSelected.lon) : "");
    setNewNotes("");
    setEditingId(null);
    setShowAddForm(true);
  };

  const handleStartEdit = (entry: AddressEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setNewName(entry.name);
    setNewAddress(entry.address);
    setNewLat(entry.lat ? String(entry.lat) : "");
    setNewLon(entry.lon ? String(entry.lon) : "");
    setNewNotes(entry.notes || "");
    setEditingId(entry.id);
    setShowAddForm(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;

    setIsSaving(true);
    try {
      let updated: AddressEntry[];

      if (editingId) {
        updated = entries.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: newName.trim(),
                address: newAddress.trim(),
                lat: newLat ? parseFloat(newLat) : undefined,
                lon: newLon ? parseFloat(newLon) : undefined,
                notes: newNotes.trim() || undefined,
              }
            : item
        );
      } else {
        const newEntry: AddressEntry = {
          id: generateUniqueId("addr"),
          name: newName.trim(),
          address: newAddress.trim(),
          lat: newLat ? parseFloat(newLat) : undefined,
          lon: newLon ? parseFloat(newLon) : undefined,
          notes: newNotes.trim() || undefined,
          isFavorite: true,
        };
        updated = [newEntry, ...entries];
      }

      setEntries(updated);
      saveAddressBook(updated);
      await new Promise((r) => setTimeout(r, 350));
      setShowAddForm(false);
      setEditingId(null);
      setNewName("");
      setNewAddress("");
      setNewLat("");
      setNewLon("");
      setNewNotes("");
    } catch (err) {
      console.error("Error saving address:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.name.toLowerCase().includes(q) ||
      e.address.toLowerCase().includes(q) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  });

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm cursor-pointer"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-primary/30 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default ring-1 ring-primary/20"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-primary/10 dark:bg-primary/15 border-b border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary text-white dark:text-slate-950 font-bold">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Libro de Direcciones
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    Guarda y reutiliza tus sanatorios, consultorios y ubicaciones
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

        {/* Action Bar */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o dirección..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 text-xs focus:border-primary outline-none"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setNewName("");
                setNewAddress("");
                setNewLat("");
                setNewLon("");
                setNewNotes("");
                setShowAddForm(!showAddForm);
              }}
              className="px-3 py-2 rounded-xl bg-primary text-white dark:text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-primary-hover shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva</span>
            </button>
          </div>

          {currentSelected?.address && !showAddForm && (
            <button
              type="button"
              onClick={handleStartAddCurrent}
              className="w-full px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Guardar ubicación seleccionada actual</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Add / Edit Form */}
          {showAddForm && (
            <form
              onSubmit={handleSaveEntry}
              className="p-4 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl border border-primary/30 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-zinc-100 border-b border-slate-200 dark:border-zinc-700/60 pb-2">
                <span>{editingId ? "Editar Ubicación" : "Agregar Nueva Ubicación"}</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre o Identificador *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Sanatorio Argentino / Consultorio Odontólogo"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Dirección Completa *
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Ej: San Luis 432 Oeste, Capital, San Juan"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Latitud (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    placeholder="-31.5348"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Longitud (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newLon}
                    onChange={(e) => setNewLon(e.target.value)}
                    placeholder="-68.5284"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Notas Adicionales
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ej: Piso 2, Guardia central, etc."
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    if (!isSaving) setShowAddForm(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl bg-primary text-white dark:text-slate-950 font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Location List */}
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-zinc-500 text-xs">
              No se encontraron direcciones guardadas.
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => {
                  onSelectAddress(entry);
                  onClose();
                }}
                className="p-3 bg-slate-50 dark:bg-zinc-950/50 hover:border-primary! dark:hover:border-primary! hover:ring-1 hover:ring-primary/40 border border-slate-200 dark:border-zinc-800/80 rounded-2xl transition-all duration-200 cursor-pointer flex items-start justify-between gap-3 group address-book-item"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 border border-primary/20">
                    <MapPin className="w-4 h-4 text-primary stroke-[1.75]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black dark:text-white text-xs truncate address-title">
                        {entry.name}
                      </span>
                      {entry.isFavorite && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0 stroke-[1.75]" />
                      <p className="text-[11px] text-black dark:text-zinc-400 font-normal truncate address-text">
                        {entry.address}
                      </p>
                    </div>
                    {entry.notes && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 stroke-[1.75]" />
                        <p className="text-[10px] text-primary font-medium italic truncate address-notes">
                          {entry.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(entry.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                    title="Favorito"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        entry.isFavorite ? "text-amber-500 fill-amber-500" : ""
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStartEdit(entry, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(entry.id, e)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-zinc-950/80 border-t border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between font-medium">
          <span>{entries.length} ubicaciones guardadas</span>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-primary text-white dark:text-slate-950 font-bold text-xs hover:bg-primary-hover shadow-xs cursor-pointer shrink-0"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmDeleteId}
        title="Eliminar Ubicación"
        message="¿Deseas eliminar esta ubicación de tu libro de direcciones?"
        onConfirm={async () => {
          if (confirmDeleteId) {
            const updated = entries.filter((item) => item.id !== confirmDeleteId);
            setEntries(updated);
            saveAddressBook(updated);
            setConfirmDeleteId(null);
          }
        }}
        onClose={() => setConfirmDeleteId(null)}
      />
    </AnimatePresence>,
    document.body
  );
};
