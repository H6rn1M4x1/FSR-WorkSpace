import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Reorder, useDragControls } from "motion/react";
import { X, Plus, Pencil, Star, Check, ChevronLeft, GripVertical, Trash2 } from "lucide-react";
import { TurnoCategoriaDef } from "../types";
import { generateUniqueId } from "../utils/id";
import { TURNO_CATEGORY_ICON_CHOICES, getTurnoCategoryIconComponent, sortTurnoCategorias } from "../lib/turnoCategories";
import { ConfirmationModal } from "./ConfirmationModal";

interface TurnoCategoryManagerModalProps {
  isOpen: boolean;
  darkMode: boolean;
  categorias: TurnoCategoriaDef[];
  onSaveCategoria: (categoria: TurnoCategoriaDef) => void;
  onSetDefault: (id: string) => void;
  onReorder: (categorias: TurnoCategoriaDef[]) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

// Fila arrastrable de una categoría — el drag se dispara solo desde el ícono de agarre (no
// desde toda la fila) para no interferir con los clicks en la estrella/lápiz.
function CategoryRow({
  cat,
  canDelete,
  onSetDefault,
  onEdit,
  onDelete,
  onDragEnd,
}: {
  cat: TurnoCategoriaDef;
  canDelete: boolean;
  onSetDefault: (id: string) => void;
  onEdit: (cat: TurnoCategoriaDef) => void;
  onDelete: (cat: TurnoCategoriaDef) => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();
  const Icon = getTurnoCategoryIconComponent(cat.icon);

  return (
    <Reorder.Item
      as="div"
      value={cat}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, height: 0, y: -12 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-800/50 select-none"
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        title="Arrastrar para reordenar"
        style={{ WebkitTouchCallout: "none" }}
        className="shrink-0 p-1.5 -ml-1.5 text-slate-300 dark:text-zinc-600 hover:text-slate-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <span className="flex-1 min-w-0 text-xs font-bold truncate">{cat.label}</span>
      <button
        type="button"
        onClick={() => onSetDefault(cat.id)}
        title={cat.isDefault ? "Categoría por defecto" : "Definir como por defecto"}
        className={`p-1.5 rounded-full transition-all cursor-pointer ${
          cat.isDefault
            ? "text-primary"
            : "text-slate-300 dark:text-zinc-700 hover:text-slate-400 dark:hover:text-zinc-500"
        }`}
      >
        <Star className={`w-4 h-4 ${cat.isDefault ? "fill-current" : ""}`} />
      </button>
      <button
        type="button"
        onClick={() => onEdit(cat)}
        title="Editar categoría"
        className="p-1.5 rounded-full text-slate-400 dark:text-zinc-500 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={() => onDelete(cat)}
          title="Eliminar categoría"
          className="p-1.5 rounded-full text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </Reorder.Item>
  );
}

// Modal para administrar las categorías de Turnos/Compromisos: editar las existentes
// (etiqueta + ícono), definir cuál es la de por defecto, y agregar categorías nuevas.
// El `id` de una categoría ya creada nunca cambia (es el valor guardado en los registros
// existentes) — editar solo actualiza `label`/`icon`, nunca reasigna el `id`.
export const TurnoCategoryManagerModal: React.FC<TurnoCategoryManagerModalProps> = ({
  isOpen,
  darkMode,
  categorias,
  onSaveCategoria,
  onSetDefault,
  onReorder,
  onDelete,
  onClose,
}) => {
  const [editing, setEditing] = useState<TurnoCategoriaDef | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [formIcon, setFormIcon] = useState("Tag");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<TurnoCategoriaDef | null>(null);
  // Copia local reordenable, sincronizada con `categorias` (nueva/editada categoría, o cambios
  // que lleguen de otro dispositivo) salvo mientras el usuario está arrastrando.
  const [orderedCategorias, setOrderedCategorias] = useState<TurnoCategoriaDef[]>(() => sortTurnoCategorias(categorias));

  useEffect(() => {
    setOrderedCategorias(sortTurnoCategorias(categorias));
  }, [categorias]);

  const handleDragEnd = () => {
    const reIndexed = orderedCategorias.map((c, i) => ({ ...c, order: i }));
    setOrderedCategorias(reIndexed);
    onReorder(reIndexed);
  };

  const startEdit = (cat: TurnoCategoriaDef) => {
    setEditing(cat);
    setFormLabel(cat.label);
    setFormIcon(cat.icon);
    setShowIconPicker(false);
  };

  const startNew = () => {
    setEditing({ id: "", label: "", icon: "Tag" });
    setFormLabel("");
    setFormIcon("Tag");
    setShowIconPicker(false);
  };

  const cancelForm = () => {
    setEditing(null);
    setShowIconPicker(false);
  };

  const handleSave = () => {
    const label = formLabel.trim();
    if (!label || !editing) return;
    const isNew = !editing.id;
    onSaveCategoria({
      id: isNew ? generateUniqueId("cat") : editing.id,
      label,
      icon: formIcon,
      isDefault: isNew ? categorias.length === 0 : editing.isDefault,
    });
    cancelForm();
  };

  const FormIconPreview = getTurnoCategoryIconComponent(formIcon);

  if (typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            key="cat-mgr-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          <motion.div
            key="cat-mgr-card"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl z-10 overflow-hidden ${
              darkMode
                ? "bg-zinc-950 border-zinc-800 text-white"
                : "bg-white border-zinc-200 text-zinc-800"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800/60 shrink-0">
              <h3 className="text-sm font-extrabold">
                {editing ? (editing.id ? "Editar Categoría" : "Nueva Categoría") : "Administrar Categorías"}
              </h3>
              <button
                type="button"
                onClick={editing ? cancelForm : onClose}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {editing ? <ChevronLeft className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </button>
            </div>

            {/* Body */}
            {/* layoutScroll: si la lista crece y este contenedor scrollea, Reorder.Group
                necesita que el ancestro con scroll lo declare para medir bien el arrastre. */}
            <motion.div layoutScroll className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
              {!editing ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium px-0.5 -mt-1 mb-1">
                    Arrastrá desde <GripVertical className="w-3 h-3 inline -mt-0.5" /> para cambiar el orden.
                  </p>
                  <Reorder.Group
                    as="div"
                    axis="y"
                    values={orderedCategorias}
                    onReorder={setOrderedCategorias}
                    className="space-y-2"
                  >
                    {orderedCategorias.map((cat) => (
                      <CategoryRow
                        key={cat.id}
                        cat={cat}
                        canDelete={orderedCategorias.length > 1}
                        onSetDefault={onSetDefault}
                        onEdit={startEdit}
                        onDelete={setConfirmDeleteCat}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </Reorder.Group>

                  <button
                    type="button"
                    onClick={startNew}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-primary hover:border-primary/50 transition-all cursor-pointer text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Categoría</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      placeholder="Ej: Turno - Pediatra"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Ícono
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowIconPicker((v) => !v)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 hover:border-primary/50 transition-all cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <FormIconPreview className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                        {showIconPicker ? "Elegí un ícono abajo" : "Cambiar ícono"}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showIconPicker && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 grid grid-cols-8 gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-zinc-800/50">
                            {TURNO_CATEGORY_ICON_CHOICES.map(({ name, icon: Icon }) => {
                              const selected = formIcon === name;
                              return (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => {
                                    setFormIcon(name);
                                    setShowIconPicker(false);
                                  }}
                                  title={name}
                                  className={`relative aspect-square rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                    selected
                                      ? "bg-primary text-white dark:text-zinc-950 shadow-md"
                                      : "bg-white dark:bg-zinc-900 text-primary border border-primary/20 hover:bg-primary/10"
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  {selected && (
                                    <Check className="w-2.5 h-2.5 absolute -top-1 -right-1 bg-primary text-white dark:text-zinc-950 rounded-full p-0.5" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={cancelForm}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!formLabel.trim()}
                      onClick={handleSave}
                      className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-extrabold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {editing.id ? "Guardar Cambios" : "Crear Categoría"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
        document.body
      )}

      <ConfirmationModal
        isOpen={!!confirmDeleteCat}
        darkMode={darkMode}
        title="Eliminar Categoría"
        message={
          confirmDeleteCat
            ? `¿Eliminar la categoría "${confirmDeleteCat.label}"? Los turnos ya guardados con esta categoría no se modifican.`
            : ""
        }
        confirmText="Eliminar"
        onConfirm={() => {
          if (confirmDeleteCat) onDelete(confirmDeleteCat.id);
        }}
        onClose={() => setConfirmDeleteCat(null)}
      />
    </>
  );
};

export default TurnoCategoryManagerModal;
