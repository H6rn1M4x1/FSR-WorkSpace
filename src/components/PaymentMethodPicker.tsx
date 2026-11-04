import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Landmark, Plus, X, Trash2, Check, Pencil } from "lucide-react";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { CARD_BRAND_META } from "../utils/cardBrand";
import { getBankBadge } from "../utils/bankBadge";
import { getBankIconUrl, BANCOS_CON_ICONO } from "../utils/bankIcons";
import type { CardBrand, PaymentMethodCard } from "../types";
import { uiSounds } from "../lib/sounds";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { CustomSelect } from "./CustomSelect";
import { ConfirmationModal } from "./ConfirmationModal";
import { useToast } from "../context/ToastContext";

// Bancos y billeteras virtuales de Argentina para sugerir mientras se tipea — el campo sigue
// siendo texto libre, así que cualquier otro nombre se puede escribir igual. La lista sale de
// BANCOS_CON_ICONO (los que tienen ícono real de icons.com.ar, ver bankIcons.ts) más un par que
// ese sitio no tiene (caen en la insignia de iniciales de BankBadge en vez de un ícono real).
// Orden alfabético (localeCompare "es" para que los acentos no desordenen, ej. "Ualá").
const BANCOS_COMUNES = [...BANCOS_CON_ICONO, "Rebanking", "Cocos Pay"].sort((a, b) =>
  a.localeCompare(b, "es"),
);

function BankBadge({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  if (!name.trim()) return null;
  const iconUrl = getBankIconUrl(name);
  const dim = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className={`inline-block shrink-0 rounded-full object-cover ${dim}`}
      />
    );
  }
  const { initials, color, textDark } = getBankBadge(name);
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-full font-black ${dim} ${
        size === "sm" ? "text-[7px]" : "text-[9px]"
      } ${textDark ? "text-black/80" : "text-white"}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}

export function describeCard(card: PaymentMethodCard): string {
  const marcaLabel = card.marca ? CARD_BRAND_META[card.marca].label : "";
  if (card.tipo === "transferencia") {
    return `Transferencia - ${card.banco}${card.alias ? ` (alias: ${card.alias})` : ""}`;
  }
  const tipoLabel = card.tipo === "credito" ? "Crédito" : "Débito";
  return `${marcaLabel} ${tipoLabel} •••• ${card.last4} - ${card.titular} (${card.banco})`;
}

function BrandBadge({ marca, tipo }: { marca?: CardBrand; tipo: PaymentMethodCard["tipo"] }) {
  if (tipo === "transferencia") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-white/90">
        <Landmark className="w-3 h-3" /> Transferencia
      </span>
    );
  }
  const tipoLabel = tipo === "credito" ? "Crédito" : "Débito";
  if (!marca) {
    return (
      <span className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-wide text-white/70 truncate">Tarjeta</span>
        <span className="text-[8px] font-light text-white/60 shrink-0">{tipoLabel}</span>
      </span>
    );
  }
  return (
    <span className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-[11px] font-black uppercase tracking-wide text-white/90 truncate">{CARD_BRAND_META[marca].label}</span>
      <span className="text-[8px] font-light text-white/60 shrink-0">{tipoLabel}</span>
    </span>
  );
}

// Contenido visual puro de una tarjeta de la billetera — sin el wrapper interactivo (botón para
// la fila simple, motion.div con drag para el carrusel apilado), así los dos lo reusan sin
// duplicar el diseño. Editar/Eliminar quedan siempre visibles (no solo al hacer hover, que en
// pantallas táctiles nunca se llega a disparar) junto a la palomita de selección.
export function WalletCardFace({
  card,
  selected,
  onEdit,
  onDelete,
}: {
  card: PaymentMethodCard;
  selected: boolean;
  // Sin onEdit/onDelete queda en modo solo-lectura (sin el lápiz/tacho) — para mostrarla como
  // preview en otros lados de la app (detalle de un pago, widgets de Facturas/Historial) sin
  // ofrecer acciones que no aplican ahí.
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const gradient = card.tipo === "transferencia" ? "from-emerald-700 to-emerald-900" : card.marca ? CARD_BRAND_META[card.marca].gradient : CARD_BRAND_META.otra.gradient;
  return (
    <div
      className={`relative w-48 h-28 rounded-2xl p-3.5 flex flex-col justify-between text-left bg-gradient-to-br ${gradient} shadow-md select-none ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-zinc-950" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <BrandBadge marca={card.marca} tipo={card.tipo} />
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Editar"
              className="p-1 rounded-full hover:bg-black/20 cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-white/80" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Eliminar"
              className="p-1 rounded-full hover:bg-black/20 cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-white/80" />
            </button>
          )}
          {selected && (
            <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={4} />
            </span>
          )}
        </div>
      </div>
      <div>
        <p className="text-white text-[11px] font-bold tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
          {card.tipo === "transferencia" ? card.alias || "Sin alias" : `•••• •••• •••• ${card.last4 || "----"}`}
        </p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-white/80 text-[10px] font-semibold truncate">{card.titular}</span>
          {card.vencimiento && <span className="text-white/70 text-[9px] font-bold shrink-0">{card.vencimiento}</span>}
        </div>
        <p className="text-white/60 text-[9px] font-bold truncate mt-0.5 flex items-center justify-start gap-1">
          <span className="truncate">{card.banco}</span>
          <BankBadge name={card.banco} />
        </p>
      </div>
    </div>
  );
}

// Contenido de la franja con la identidad visual de la tarjeta (degradé de marca, banco/alias,
// últimos 4 dígitos, logo de marca) — lo comparten la franja flotante (con su propio contorno) y
// la que asoma pegada al fondo de una nota (sin contorno propio, para que se vea continuada).
function PaymentMethodCardStripContent({ card }: { card: PaymentMethodCard }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <BankBadge name={card.banco} size="sm" />
        </span>
        <div className="min-w-0">
          <p className="text-white text-[11px] font-bold truncate leading-tight">
            {card.tipo === "transferencia" ? card.alias || card.banco : card.banco}
          </p>
          <p className="text-white/70 text-[9px] font-semibold truncate leading-tight">
            {card.tipo === "transferencia" ? "Transferencia" : `•• ${card.last4 || "----"}`}
          </p>
        </div>
      </div>
      {card.marca && card.tipo !== "transferencia" && (
        <span className="text-white text-xs font-black italic tracking-tight shrink-0">
          {CARD_BRAND_META[card.marca].label}
        </span>
      )}
    </div>
  );
}

// Franja alargada "flotante", con su propio contorno redondeado (todas las esquinas, como la
// caja de arriba) y una animación chica al pasar el mouse por encima — para mostrar "con qué se
// paga" como su propia tarjetita separada, no pegada al borde de la nota de arriba.
export function PaymentMethodCardStrip({ card }: { card: PaymentMethodCard }) {
  const gradient = card.tipo === "transferencia" ? "from-emerald-700 to-emerald-900" : card.marca ? CARD_BRAND_META[card.marca].gradient : CARD_BRAND_META.otra.gradient;
  return (
    <motion.div
      whileHover={{ scale: 1.015, filter: "brightness(1.12)" }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`w-full rounded-xl bg-gradient-to-br ${gradient} shadow-sm select-none`}
    >
      <PaymentMethodCardStripContent card={card} />
    </motion.div>
  );
}

// Resuelve el método de pago elegido en un pago (el texto guardado en `conQuePagar`, igual al que
// arma describeCard) contra la billetera actual del usuario y lo muestra con su identidad visual
// real — "compact" para el detalle de un pago (la tarjeta tal cual se ve al crearla) y "strip"
// para la franja horizontal propia. Si no hay ninguna tarjeta que coincida (método viejo tipeado
// a mano, o la tarjeta ya se borró), cae a mostrar el texto plano.
export function PaymentMethodCardResolved({
  userId,
  describedCard,
  variant = "compact",
  fallbackText,
}: {
  userId: string;
  describedCard: string;
  variant?: "compact" | "strip";
  fallbackText?: string;
}) {
  const { cards } = usePaymentMethods(userId);
  const card = describedCard ? cards.find((c) => describeCard(c) === describedCard) : undefined;
  if (!card) {
    return (
      <span className="text-[10px] text-zinc-800 dark:text-zinc-200 break-words block">
        {fallbackText ?? describedCard ?? "—"}
      </span>
    );
  }
  return variant === "strip" ? <PaymentMethodCardStrip card={card} /> : <WalletCardFace card={card} selected={false} />;
}

// Carrusel centrado estilo Mercado Pago (ver referencia en video): la tarjeta elegida queda
// nítida y centrada; el vecino inmediato de cada lado asoma por el borde del contenedor,
// difuminado (blur) y un poco más chico/transparente — eso es lo que avisa que hay más para
// recorrer, no una pila detrás. Deslizar (mantener presionado y arrastrar la tarjeta activa) pasa
// a la siguiente/anterior, con sonido y vibración al asentarse; tocar el pedacito visible de un
// vecino también la trae al frente. Al final del todo, como una tarjeta más del carrusel, el "+"
// para agregar una nueva (tocarlo la abre). Los bordes del contenedor no cortan en seco: una
// máscara los difumina a transparente. Abajo, puntitos de paginación — el de la tarjeta activa es
// una píldora, los demás son círculos que se achican cuanto más lejos están.
const CARD_WIDTH = 192; // w-48
function WalletCardStack({
  cards,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAddNew,
}: {
  cards: PaymentMethodCard[];
  selectedId: string | null;
  onSelect: (card: PaymentMethodCard) => void;
  onEdit: (card: PaymentMethodCard) => void;
  onDelete: (card: PaymentMethodCard) => void;
  onAddNew: () => void;
}) {
  const selectedIndex = selectedId ? cards.findIndex((c) => c.id === selectedId) : -1;
  const [frontIndex, setFrontIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(CARD_WIDTH + 64);

  // Último "slot" del carrusel: no es una tarjeta, es el tile de "agregar nueva".
  const addSlot = cards.length;
  const totalSlots = cards.length + 1;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Si la tarjeta elegida cambia desde afuera (ej. se crea una nueva y queda seleccionada), el
  // carrusel la sigue.
  useEffect(() => {
    if (selectedIndex >= 0) setFrontIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (frontIndex > addSlot) setFrontIndex(0);
  }, [addSlot, frontIndex]);

  const bringToFront = (i: number) => {
    setFrontIndex(i);
    uiSounds.toggle();
    if (navigator.vibrate) navigator.vibrate(8);
    if (i < cards.length) onSelect(cards[i]);
  };

  const cycle = (dir: 1 | -1) => {
    if (totalSlots <= 1) return;
    bringToFront((frontIndex + dir + totalSlots) % totalSlots);
  };

  // Cuánto asoma cada vecino por el borde del contenedor — con un piso y un techo. El contenedor
  // usa todo el ancho disponible de su fila (ya no hay un botón "+" aparte compitiendo por lugar),
  // y el asomo crece con ese ancho para aprovecharlo (en vez de quedar un hueco muerto sin usar a
  // los costados). Cuando no hay vecina de un lado (primera tarjeta, o el tile de "agregar" al
  // llegar al final) se corre todo el contenido hacia el otro lado para no dejar ese espacio vacío.
  const peek = Math.min(110, Math.max(20, (containerWidth - CARD_WIDTH) / 2));
  const hasPrev = frontIndex > 0;
  const hasNext = frontIndex < addSlot;
  const edgePad = 12;
  let centerShift = 0;
  if (!hasPrev && hasNext) centerShift = -(containerWidth / 2 - CARD_WIDTH / 2 - edgePad);
  else if (hasPrev && !hasNext) centerShift = containerWidth / 2 - CARD_WIDTH / 2 - edgePad;

  return (
    <div className="flex-1 min-w-0">
      <div
        ref={containerRef}
        className="relative w-full h-32 overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
        }}
      >
        {Array.from({ length: totalSlots }, (_, i) => i).map((i) => {
          const offset = i - frontIndex;
          if (Math.abs(offset) > 1) return null; // solo el vecino inmediato de cada lado, como en la referencia
          const isActive = offset === 0;
          const isAddSlot = i === addSlot;
          const canDrag = isActive && totalSlots > 1;
          return (
            <motion.div
              key={isAddSlot ? "add-slot" : cards[i].id}
              drag={canDrag ? "x" : false}
              dragElastic={0.5}
              dragConstraints={{ left: 0, right: 0 }}
              dragSnapToOrigin
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) cycle(1);
                else if (info.offset.x > 60) cycle(-1);
              }}
              onTap={() => {
                if (isAddSlot && isActive) onAddNew();
                else if (!isActive) bringToFront(i);
              }}
              animate={{
                x: offset * (CARD_WIDTH / 2 + peek) + centerShift,
                scale: isActive ? 1 : 0.92,
                opacity: isActive ? 1 : 0.55,
                filter: isActive ? "blur(0px)" : "blur(3px)",
              }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className={`absolute top-2 left-1/2 -ml-24 w-48 ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
              style={{ zIndex: isActive ? 10 : 5, touchAction: "pan-y" }}
            >
              {isAddSlot ? (
                <div className="w-48 h-28 rounded-2xl border-2 border-dashed border-primary/50 text-primary flex flex-col items-center justify-center gap-1 transition-all hover:border-primary hover:bg-primary/10">
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Nueva tarjeta</span>
                </div>
              ) : (
                <WalletCardFace
                  card={cards[i]}
                  selected={isActive}
                  onEdit={() => onEdit(cards[i])}
                  onDelete={() => onDelete(cards[i])}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {totalSlots > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {Array.from({ length: totalSlots }, (_, i) => i).map((i) => {
            const dist = Math.abs(i - frontIndex);
            const isActive = i === frontIndex;
            return (
              <button
                key={i === addSlot ? "add-slot" : cards[i].id}
                type="button"
                onClick={() => bringToFront(i)}
                title={i === addSlot ? "Nueva tarjeta" : cards[i].banco}
                className={`rounded-full shrink-0 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "w-5 h-1.5 bg-primary"
                    : dist === 1
                      ? "w-1.5 h-1.5 bg-slate-300 dark:bg-zinc-600"
                      : "w-1 h-1 bg-slate-300 dark:bg-zinc-700"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function BankNameInput({ value, onChange, darkMode }: { value: string; onChange: (v: string) => void; darkMode: boolean }) {
  const [focused, setFocused] = useState(false);
  // Sin tope: antes se cortaba en 6 sugerencias y no había forma de ver el resto de la lista. Ya
  // están en orden alfabético (BANCOS_COMUNES) y el contenedor de abajo scrollea (con scroll
  // invisible) para mostrarlas todas — "primeras 3 visibles, el resto scrolleando".
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return BANCOS_COMUNES;
    return BANCOS_COMUNES.filter((b) => b.toLowerCase().includes(q));
  }, [value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder="Ej: Banco Galicia"
        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-primary"
      />
      <AnimatePresence>
        {focused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`force-solid-bg absolute z-20 top-full left-0 right-0 mt-1 p-1 rounded-xl border shadow-lg max-h-40 overflow-y-auto scrollbar-thin ${
              darkMode ? "border-zinc-800" : "border-slate-200"
            }`}
          >
            {suggestions.map((b, i) => (
              <motion.button
                key={b}
                type="button"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: Math.min(i, 8) * 0.02 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(b);
                  setFocused(false);
                }}
                className="w-full flex items-center gap-1.5 text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-primary/10 hover:text-primary cursor-pointer"
              >
                <BankBadge name={b} />
                {b}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateCardModal({
  darkMode,
  editingCard,
  onClose,
  onSubmit,
}: {
  darkMode: boolean;
  editingCard?: PaymentMethodCard | null;
  onClose: () => void;
  onSubmit: (card: Omit<PaymentMethodCard, "id" | "order" | "createdAt" | "updatedAt">) => void;
}) {
  useLockBodyScroll(true);
  const isEditing = !!editingCard;
  const [tipo, setTipo] = useState<PaymentMethodCard["tipo"]>(editingCard?.tipo || "credito");
  const [titular, setTitular] = useState(editingCard?.titular || "");
  const [banco, setBanco] = useState(editingCard?.banco || "");
  const [last4Input, setLast4Input] = useState(editingCard?.last4 || "");
  const [vencimiento, setVencimiento] = useState(editingCard?.vencimiento || "");
  const [alias, setAlias] = useState(editingCard?.alias || "");
  const [marca, setMarca] = useState<CardBrand | null>(editingCard?.marca || null);

  const last4 = last4Input.replace(/\D/g, "").slice(0, 4);

  const isValid =
    titular.trim().length > 0 &&
    banco.trim().length > 0 &&
    (tipo === "transferencia" ? alias.trim().length > 0 : last4.length === 4 && !!marca);

  const handleSubmit = () => {
    if (!isValid) return;
    uiSounds.save();
    if (navigator.vibrate) navigator.vibrate(12);
    onSubmit({
      tipo,
      titular: titular.trim(),
      banco: banco.trim(),
      ...(tipo === "transferencia"
        ? { alias: alias.trim() }
        : { last4, vencimiento: vencimiento.trim() || undefined, marca: marca as CardBrand }),
    });
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border p-5 shadow-2xl space-y-4 ${
            darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> {isEditing ? "Editar tarjeta / cuenta" : "Nueva tarjeta / cuenta"}
            </h3>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Vista previa en vivo */}
          <div
            className={`rounded-2xl p-4 bg-gradient-to-br ${
              tipo === "transferencia" ? "from-emerald-700 to-emerald-900" : marca ? CARD_BRAND_META[marca].gradient : "from-zinc-600 to-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <BrandBadge marca={marca || undefined} tipo={tipo} />
            </div>
            <p className="text-white text-sm font-bold tracking-wider">
              {tipo === "transferencia" ? alias || "alias.de.ejemplo" : `•••• •••• •••• ${last4 || "----"}`}
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-white/80 text-[11px] font-semibold truncate">{titular || "Nombre del titular"}</span>
              {vencimiento && tipo !== "transferencia" && <span className="text-white/70 text-[10px] font-bold shrink-0">{vencimiento}</span>}
            </div>
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800">
            {(["credito", "debito", "transferencia"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTipo(t);
                  uiSounds.toggle();
                }}
                className={`flex-1 px-2 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                  tipo === t ? "bg-primary text-white shadow-xs" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t === "credito" ? "Crédito" : t === "debito" ? "Débito" : "Transferencia"}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Titular
            </label>
            <input
              type="text"
              value={titular}
              onChange={(e) => setTitular(e.target.value)}
              placeholder="Nombre y apellido"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
              Banco / Entidad
            </label>
            <BankNameInput value={banco} onChange={setBanco} darkMode={darkMode} />
          </div>

          {tipo === "transferencia" ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                Alias
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej: juan.perez.mp"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-primary"
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Últimos 4 dígitos
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={last4Input}
                    onChange={(e) => setLast4Input(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="1234"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-primary tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Vencimiento
                  </label>
                  <input
                    type="text"
                    value={vencimiento}
                    onChange={(e) => setVencimiento(e.target.value.slice(0, 5))}
                    placeholder="MM/AA"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                  Marca
                </label>
                <CustomSelect
                  value={marca || ""}
                  onChange={(v) => setMarca((v || null) as CardBrand | null)}
                  options={Object.entries(CARD_BRAND_META).map(([key, meta]) => ({ value: key, label: meta.label }))}
                  placeholder="Elegí la marca..."
                  size="sm"
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-extrabold hover:bg-primary/90 cursor-pointer transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> {isEditing ? "Guardar cambios" : "Guardar tarjeta"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export function PaymentMethodPicker({
  userId,
  darkMode,
  value,
  onChange,
  onCardChange,
}: {
  userId: string;
  darkMode: boolean;
  value: string;
  onChange: (description: string) => void;
  /** Se dispara con la tarjeta completa cada vez que se elige o se crea/edita una — para que
   * quien use el picker (ej. "Método de Pago" en Agregar Pago) pueda reaccionar a datos que el
   * string de `value` no trae, como el tipo de tarjeta. */
  onCardChange?: (card: PaymentMethodCard) => void;
}) {
  const { cards, addCard, updateCard, deleteCard } = usePaymentMethods(userId);
  const { showToast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCard, setEditingCard] = useState<PaymentMethodCard | null>(null);
  const [deletingCard, setDeletingCard] = useState<PaymentMethodCard | null>(null);

  const selectedCard = cards.find((c) => describeCard(c) === value) || null;

  const selectCard = (card: PaymentMethodCard) => {
    onChange(describeCard(card));
    onCardChange?.(card);
  };

  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
        ¿Con qué pagar?
      </label>
      <div className="p-1.5 -m-1.5">
        <WalletCardStack
          cards={cards}
          selectedId={selectedCard?.id || null}
          onSelect={selectCard}
          onEdit={setEditingCard}
          onDelete={setDeletingCard}
          onAddNew={() => setShowCreate(true)}
        />
      </div>

      {showCreate && (
        <CreateCardModal
          darkMode={darkMode}
          onClose={() => setShowCreate(false)}
          onSubmit={async (card) => {
            const created = await addCard(card);
            setShowCreate(false);
            if (created) selectCard(created);
          }}
        />
      )}

      {editingCard && (
        <CreateCardModal
          darkMode={darkMode}
          editingCard={editingCard}
          onClose={() => setEditingCard(null)}
          onSubmit={async (card) => {
            const updated = await updateCard(editingCard.id, card);
            setEditingCard(null);
            // Si la tarjeta editada era la elegida, el string de describeCard() puede haber
            // cambiado (ej. cambió el banco) — hay que refrescar `value` para que siga apuntando
            // a la misma tarjeta en vez de quedar con una descripción vieja que ya no matchea.
            if (updated && value === describeCard(editingCard)) selectCard(updated);
            if (updated) showToast("Tarjeta actualizada con éxito.", "success");
          }}
        />
      )}

      <ConfirmationModal
        isOpen={!!deletingCard}
        title="Eliminar tarjeta"
        message={
          deletingCard
            ? `¿Eliminar ${deletingCard.tipo === "transferencia" ? `la cuenta de ${deletingCard.banco}` : `la tarjeta terminada en ${deletingCard.last4}`}? Esta acción no se puede deshacer.`
            : ""
        }
        onConfirm={async () => {
          if (!deletingCard) return;
          await deleteCard(deletingCard.id);
          showToast("Tarjeta eliminada con éxito.", "success");
        }}
        onClose={() => setDeletingCard(null)}
        darkMode={darkMode}
      />
    </div>
  );
}

export default PaymentMethodPicker;
