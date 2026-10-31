import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Landmark, Plus, X, Trash2, Check } from "lucide-react";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { detectCardBrand, CARD_BRAND_META } from "../utils/cardBrand";
import type { CardBrand, PaymentMethodCard } from "../types";
import { uiSounds } from "../lib/sounds";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";

// Bancos y entidades comunes de Argentina, solo para sugerir mientras se tipea — el campo sigue
// siendo texto libre, así que cualquier otro nombre se puede escribir igual.
const BANCOS_COMUNES = [
  "Banco Nación",
  "Banco Provincia",
  "Banco Galicia",
  "Banco Santander",
  "BBVA",
  "Banco Macro",
  "Banco Supervielle",
  "Banco Credicoop",
  "Banco Ciudad",
  "Banco Patagonia",
  "Banco Comafi",
  "Banco Hipotecario",
  "Banco San Juan",
  "ICBC",
  "HSBC",
  "Banco Columbia",
  "Brubank",
  "Mercado Pago",
  "Ualá",
  "Naranja X",
  "Banco del Sol",
];

function describeCard(card: PaymentMethodCard): string {
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
  if (!marca) {
    return <span className="text-[10px] font-black uppercase tracking-wide text-white/70">Tarjeta</span>;
  }
  return <span className="text-[11px] font-black uppercase tracking-wide text-white/90">{CARD_BRAND_META[marca].label}</span>;
}

function WalletCard({
  card,
  selected,
  onClick,
  onDelete,
}: {
  card: PaymentMethodCard;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const gradient = card.tipo === "transferencia" ? "from-emerald-700 to-emerald-900" : card.marca ? CARD_BRAND_META[card.marca].gradient : CARD_BRAND_META.otra.gradient;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`group relative shrink-0 w-48 h-28 rounded-2xl p-3.5 flex flex-col justify-between text-left bg-gradient-to-br ${gradient} shadow-md cursor-pointer transition-all ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-zinc-950" : "hover:scale-[1.02]"
      }`}
    >
      <div className="flex items-start justify-between">
        <BrandBadge marca={card.marca} tipo={card.tipo} />
        {selected ? (
          <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={4} />
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Eliminar"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-black/20 cursor-pointer"
          >
            <Trash2 className="w-3 h-3 text-white/80" />
          </button>
        )}
      </div>
      <div>
        <p className="text-white text-xs font-bold tracking-wider">
          {card.tipo === "transferencia" ? card.alias || "Sin alias" : `•••• ${card.last4 || "----"}`}
        </p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-white/80 text-[10px] font-semibold truncate">{card.titular}</span>
          {card.vencimiento && <span className="text-white/70 text-[9px] font-bold shrink-0">{card.vencimiento}</span>}
        </div>
        <p className="text-white/60 text-[9px] font-bold truncate mt-0.5">{card.banco}</p>
      </div>
    </motion.button>
  );
}

function BankNameInput({ value, onChange, darkMode }: { value: string; onChange: (v: string) => void; darkMode: boolean }) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return BANCOS_COMUNES.slice(0, 6);
    return BANCOS_COMUNES.filter((b) => b.toLowerCase().includes(q)).slice(0, 6);
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
      {focused && suggestions.length > 0 && (
        <div
          className={`absolute z-20 top-full left-0 right-0 mt-1 p-1 rounded-xl border shadow-lg max-h-40 overflow-y-auto ${
            darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          {suggestions.map((b) => (
            <button
              key={b}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(b);
                setFocused(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-primary/10 hover:text-primary cursor-pointer"
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateCardModal({ darkMode, onClose, onCreate }: { darkMode: boolean; onClose: () => void; onCreate: (card: Omit<PaymentMethodCard, "id" | "order" | "createdAt" | "updatedAt">) => void }) {
  useLockBodyScroll(true);
  const [tipo, setTipo] = useState<PaymentMethodCard["tipo"]>("credito");
  const [titular, setTitular] = useState("");
  const [banco, setBanco] = useState("");
  const [numero, setNumero] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [alias, setAlias] = useState("");
  const [marcaOverride, setMarcaOverride] = useState<CardBrand | null>(null);

  const detected = useMemo(() => detectCardBrand(numero), [numero]);
  const marca = marcaOverride || detected;
  const last4 = numero.replace(/\D/g, "").slice(-4);

  const isValid =
    titular.trim().length > 0 &&
    banco.trim().length > 0 &&
    (tipo === "transferencia" ? alias.trim().length > 0 : last4.length === 4);

  const handleSubmit = () => {
    if (!isValid) return;
    uiSounds.save();
    if (navigator.vibrate) navigator.vibrate(12);
    onCreate({
      tipo,
      titular: titular.trim(),
      banco: banco.trim(),
      ...(tipo === "transferencia"
        ? { alias: alias.trim() }
        : { last4, vencimiento: vencimiento.trim() || undefined, marca: marca || "otra" }),
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
              <CreditCard className="w-4 h-4 text-primary" /> Nueva tarjeta / cuenta
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
              {tipo === "transferencia" ? alias || "alias.de.ejemplo" : `•••• ${last4 || "----"}`}
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
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                  Número de tarjeta
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value.replace(/[^\d\s]/g, "").slice(0, 23))}
                  placeholder="•••• •••• •••• ••••"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-primary"
                />
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                  Solo se guardan los últimos 4 dígitos — el número completo es nada más para detectar la marca.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Marca
                  </label>
                  <select
                    value={marca || ""}
                    onChange={(e) => setMarcaOverride((e.target.value || null) as CardBrand | null)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-primary"
                  >
                    <option value="">Detectar sola...</option>
                    {Object.entries(CARD_BRAND_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-extrabold hover:bg-primary/90 cursor-pointer transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Guardar tarjeta
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
}: {
  userId: string;
  darkMode: boolean;
  value: string;
  onChange: (description: string) => void;
}) {
  const { cards, addCard, deleteCard } = usePaymentMethods(userId);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
        ¿Con qué pagar?
      </label>
      <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5">
        {cards.map((card) => (
          <WalletCard
            key={card.id}
            card={card}
            selected={value === describeCard(card)}
            onClick={() => {
              uiSounds.toggle();
              if (navigator.vibrate) navigator.vibrate(8);
              onChange(describeCard(card));
            }}
            onDelete={() => deleteCard(card.id)}
          />
        ))}
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={`shrink-0 w-28 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
            darkMode ? "border-zinc-700 text-zinc-400 hover:border-primary hover:text-primary" : "border-slate-300 text-slate-400 hover:border-primary hover:text-primary"
          }`}
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-bold">Nueva</span>
        </button>
      </div>

      {/* El valor sigue siendo texto editable a mano, por si se quiere aclarar algo puntual sin
          crear una tarjeta nueva en la billetera. */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="O escribí acá directamente..."
        className="w-full mt-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm focus:border-primary"
      />

      {showCreate && (
        <CreateCardModal
          darkMode={darkMode}
          onClose={() => setShowCreate(false)}
          onCreate={async (card) => {
            const created = await addCard(card);
            setShowCreate(false);
            if (created) onChange(describeCard(created));
          }}
        />
      )}
    </div>
  );
}

export default PaymentMethodPicker;
