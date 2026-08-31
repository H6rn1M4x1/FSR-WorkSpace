import { SubNav } from "./SubNav";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { generateUniqueId } from "../utils/id";
import React, { useState, useEffect } from "react";
import { subscribeToCategory, saveItemToFirestore, deleteItemFromFirestore } from "../lib/firestoreSyncService";
import { PillFilterBar } from "./PillFilterBar";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { useToast } from "../context/ToastContext";
import {
  Library,
  Calendar,
  Clock,
  BookOpen,
  Plus,
  CheckCircle,
  FileText,
  TrendingUp,
  BrainCircuit,
  CloudUpload,
  Sparkles,
  Trash2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Search,
  Edit2,
  Filter,
  Check,
  ChevronDown,
  FolderOpen,
  StickyNote,
  Edit3,
  Settings,
  Loader2,
} from "lucide-react";
import AnimatedList from "./AnimatedList";
import { ConfirmationModal } from "./ConfirmationModal";
import {
  AcademicSubject,
  AcademicTask,
  AcademicNote,
  MateriaInfo,
  HorarioItem,
  ExamenItem,
} from "../types";
import { SmartDateTimePicker } from "./SmartDateTimePicker";
import DriveFolderVisualizer from "./DriveFolderVisualizer";

interface SelectPopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  searchable?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Seleccionar --",
  disabled = false,
  className = "",
  size = "md",
  icon,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedOption = options.find((opt) => opt.value === value);

  const computePopoverPosition = (fixedPlacement?: "top" | "bottom"): SelectPopoverPosition | null => {
    if (!dropdownRef.current) return null;
    const rect = dropdownRef.current.getBoundingClientRect();
    const popoverWidth = rect.width;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placement =
      fixedPlacement ||
      (spaceBelow < 180 && spaceAbove > spaceBelow ? "top" : "bottom");

    if (placement === "top") {
      return {
        bottom: window.innerHeight - rect.top + 4,
        left,
        width: popoverWidth,
        placement: "top",
      };
    } else {
      return {
        top: rect.bottom + 4,
        left,
        width: popoverWidth,
        placement: "bottom",
      };
    }
  };

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
      setIsOpen(true);
      setSearchTerm("");
    } else {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      setPopoverPosition((currentPos) => {
        if (!currentPos) return computePopoverPosition();
        return computePopoverPosition(currentPos.placement);
      });
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, filteredOptions.length]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`relative w-full text-left ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className={`w-full flex items-center justify-between font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          size === "sm"
            ? "px-3 py-2.5 h-[42px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs md:text-sm font-semibold"
            : "px-3.5 py-2.5 h-[42px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-black dark:text-white text-xs md:text-sm focus:border-primary"
        }`}
      >
        <span className="flex items-center gap-2 truncate min-w-0 flex-1">
          {icon && (
            <span className="shrink-0 text-slate-400 dark:text-zinc-500">
              {icon}
            </span>
          )}
          <span
            data-custom-select-selected={!!selectedOption}
            className={`truncate ${selectedOption ? "font-bold text-black dark:text-white" : "text-slate-400 dark:text-zinc-500 font-normal"}`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`shrink-0 text-slate-400 dark:text-zinc-500 transition-transform duration-200 ${size === "sm" ? "w-3.5 h-3.5 ml-1.5" : "w-4 h-4 ml-2"}`}
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && popoverPosition && (
              <motion.div
                ref={popoverRef}
                initial={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  ...(popoverPosition.top !== undefined
                    ? { top: `${popoverPosition.top}px` }
                    : {}),
                  ...(popoverPosition.bottom !== undefined
                    ? { bottom: `${popoverPosition.bottom}px` }
                    : {}),
                  left: `${popoverPosition.left}px`,
                  width: `${popoverPosition.width}px`,
                  zIndex: 99999,
                }}
                className="bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
              >
                {searchable && (
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none mb-1"
                  />
                )}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center">
                    No hay opciones
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white dark:text-blue-950 font-bold"
                            : "text-black dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                        }`}
                      >
                        <span className="truncate pr-2">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

interface TimeInput24hProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

const TimeInput24h: React.FC<TimeInput24hProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "14:00",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const computePopoverPosition = (): SelectPopoverPosition | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = Math.max(rect.width, 260);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    const popoverHeight = popoverRef.current?.offsetHeight || 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUpwards = spaceBelow < popoverHeight + 10 && spaceAbove > spaceBelow;

    if (shouldOpenUpwards) {
      return {
        bottom: window.innerHeight - rect.top + 4,
        left,
        width: popoverWidth,
        placement: "top",
      };
    } else {
      return {
        top: rect.bottom + 4,
        left,
        width: popoverWidth,
        placement: "bottom",
      };
    }
  };

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  let hours = 0;
  let minutes = 0;
  if (value && value.includes(":")) {
    const parts = value.split(":");
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    if (isNaN(hours)) hours = 0;
    if (isNaN(minutes)) minutes = 0;
  }

  const handleSelectHour = (h: number) => {
    const hStr = String(h).padStart(2, "0");
    const mStr = String(minutes).padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
  };

  const handleSelectMinute = (m: number) => {
    const hStr = String(hours).padStart(2, "0");
    const mStr = String(m).padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center w-full">
        <Clock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 pointer-events-none z-10" />
        <input
          type="text"
          disabled={disabled}
          required={required}
          value={value}
          onClick={handleToggleOpen}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-12 py-2.5 h-[42px] rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none transition-all text-sm font-mono focus:border-primary cursor-pointer disabled:opacity-50"
        />
        <span className="absolute right-3 text-[10px] font-extrabold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-md pointer-events-none uppercase">
          24h
        </span>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && popoverPosition && (
              <motion.div
                ref={popoverRef}
                initial={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  ...(popoverPosition.top !== undefined
                    ? { top: `${popoverPosition.top}px` }
                    : {}),
                  ...(popoverPosition.bottom !== undefined
                    ? { bottom: `${popoverPosition.bottom}px` }
                    : {}),
                  left: `${popoverPosition.left}px`,
                  width: `${popoverPosition.width}px`,
                  zIndex: 99999,
                }}
                className="p-3 bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Hora (00 - 23 hs)
                    </span>
                    <span className="text-[11px] font-mono font-extrabold text-primary">
                      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")} hs
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => {
                      const isSelected = hours === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleSelectHour(h)}
                          className={`py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-white dark:text-blue-950 shadow-xs"
                              : "bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {String(h).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-800 pt-2">
                  <span className="block text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    Minutos
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 15, 30, 45].map((m) => {
                      const isSelected = minutes === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleSelectMinute(m)}
                          className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-white dark:text-blue-950 shadow-xs"
                              : "bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          :{String(m).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

interface MultiSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "-- Seleccionar --",
  disabled = false,
  className = "",
  searchable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<SelectPopoverPosition | null>(null);

  const selectedValues = value
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    : [];

  const handleToggleOption = (optValue: string) => {
    let nextValues: string[] = [];

    if (optValue === "Sin correlativas") {
      nextValues = ["Sin correlativas"];
    } else {
      const withoutSin = selectedValues.filter(
        (v) => v !== "Sin correlativas" && v !== "",
      );
      if (withoutSin.includes(optValue)) {
        nextValues = withoutSin.filter((v) => v !== optValue);
      } else {
        nextValues = [...withoutSin, optValue];
      }
      if (nextValues.length === 0) {
        nextValues = ["Sin correlativas"];
      }
    }

    onChange(nextValues.join(", "));
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const computePopoverPosition = (): SelectPopoverPosition | null => {
    if (!dropdownRef.current) return null;
    const rect = dropdownRef.current.getBoundingClientRect();
    const popoverWidth = Math.max(rect.width, 180);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    const estimatedHeight = Math.min(
      (filteredOptions.length || 1) * 36 + (searchable ? 45 : 0) + 16,
      240
    );
    const popoverHeight = popoverRef.current?.offsetHeight || estimatedHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenUpwards =
      spaceBelow < popoverHeight + 10 && spaceAbove > spaceBelow;

    if (shouldOpenUpwards) {
      return {
        bottom: window.innerHeight - rect.top + 4,
        left,
        width: popoverWidth,
        placement: "top",
      };
    } else {
      return {
        top: rect.bottom + 4,
        left,
        width: popoverWidth,
        placement: "bottom",
      };
    }
  };

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
      setIsOpen(true);
      setSearchTerm("");
    } else {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const pos = computePopoverPosition();
      if (pos) setPopoverPosition(pos);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, filteredOptions.length]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left w-full ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggleOpen}
        className="w-full flex items-center justify-between font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2.5 rounded-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white text-xs md:text-sm focus:border-primary"
      >
        <span className="flex-1 text-left truncate">
          {selectedValues.length > 0 ? (
            <span className="font-bold text-slate-900 dark:text-white">
              {selectedValues.join(", ")}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-zinc-500 font-normal">
              {placeholder}
            </span>
          )}
        </span>
        <ChevronDown
          className="shrink-0 w-3.5 h-3.5 ml-2 text-slate-400 dark:text-zinc-500 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && popoverPosition && (
              <motion.div
                ref={popoverRef}
                initial={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.97,
                  y: popoverPosition.placement === "top" ? 4 : -4,
                }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  ...(popoverPosition.top !== undefined
                    ? { top: `${popoverPosition.top}px` }
                    : {}),
                  ...(popoverPosition.bottom !== undefined
                    ? { bottom: `${popoverPosition.bottom}px` }
                    : {}),
                  left: `${popoverPosition.left}px`,
                  width: `${popoverPosition.width}px`,
                  zIndex: 99999,
                }}
                className="bg-white dark:bg-black/85 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
              >
                {searchable && (
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none mb-1"
                  />
                )}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400 dark:text-zinc-500 text-center">
                    No hay opciones
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = selectedValues.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleToggleOption(opt.value)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-full text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 text-primary dark:text-primary"
                            : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-950/50"
                        }`}
                      >
                        <span className="truncate pr-2">{opt.label}</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                            isSelected
                              ? "border-primary bg-primary text-white dark:text-blue-950"
                              : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-black/85 backdrop-blur-md/50"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};

interface AcademicViewProps {
  darkMode: boolean;
  userEmail?: string;
  subjects: AcademicSubject[];
  setSubjects: React.Dispatch<React.SetStateAction<AcademicSubject[]>>;
  tasks: AcademicTask[];
  setTasks: React.Dispatch<React.SetStateAction<AcademicTask[]>>;
  notes: AcademicNote[];
  setNotes: React.Dispatch<React.SetStateAction<AcademicNote[]>>;
  onSyncNotes: (title: string, content: string) => void;
  syncingNotes: boolean;
  materiasInfo: MateriaInfo[];
  setMateriasInfo: React.Dispatch<React.SetStateAction<MateriaInfo[]>>;
  horarios: HorarioItem[];
  setHorarios: React.Dispatch<React.SetStateAction<HorarioItem[]>>;
  examenes: ExamenItem[];
  setExamenes: React.Dispatch<React.SetStateAction<ExamenItem[]>>;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}

export default function AcademicView({
  darkMode,
  userEmail,
  subjects,
  setSubjects,
  tasks,
  setTasks,
  notes,
  setNotes,
  onSyncNotes,
  syncingNotes,
  materiasInfo,
  setMateriasInfo,
  horarios,
  setHorarios,
  examenes,
  setExamenes,
  activeSubTab: propActiveSubTab,
  onSubTabChange,
}: AcademicViewProps) {
  const { showToast } = useToast();

  const activeUserId = (userEmail || "hernanmaximiliano10@gmail.com").toLowerCase().trim();

  // Real-time local subscription for AcademicView categories with strict unmount cleanup
  useEffect(() => {
    const unsubs = [
      subscribeToCategory(activeUserId, "subjects", (items) => setSubjects?.(items)),
      subscribeToCategory(activeUserId, "tasks", (items) => setTasks?.(items)),
      subscribeToCategory(activeUserId, "notes", (items) => setNotes?.(items)),
      subscribeToCategory(activeUserId, "materias_info", (items) => setMateriasInfo?.(items)),
      subscribeToCategory(activeUserId, "horarios", (items) => setHorarios?.(items)),
      subscribeToCategory(activeUserId, "examenes", (items) => setExamenes?.(items)),
    ];

    return () => {
      unsubs.forEach((unsub) => {
        try { unsub(); } catch (_) {}
      });
    };
  }, [activeUserId]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Subject Form
  const [localActiveSubTab, setLocalActiveSubTab] = useState<
    | "resumen"
    | "informacion_materias"
    | "plan_estudio"
    | "horario"
    | "examenes"
    | "facultad"
  >("resumen");
  const activeSubTab = (propActiveSubTab as any) || localActiveSubTab;
  const setActiveSubTab = (tab: any) => {
    if (onSubTabChange) onSubTabChange(tab);
    setLocalActiveSubTab(tab);
  };

  React.useEffect(() => {
    if (propActiveSubTab) {
      setLocalActiveSubTab(propActiveSubTab as any);
    }
  }, [propActiveSubTab]);

  // Sub-tabs internal states
  const [planEstudioSubTab, setPlanEstudioSubTab] = useState<"plan_estudio" | "historia_academica">("plan_estudio");
  const [horarioSubTab, setHorarioSubTab] = useState<"horario" | "examenes">("horario");

  const planEstudioScrollRef = React.useRef<HTMLDivElement>(null);
  const horarioScrollRef = React.useRef<HTMLDivElement>(null);

  const scrollPlanEstudioTabsLeft = () => {
    const tabs = ["plan_estudio","historia_academica"];
    const currentIndex = tabs.indexOf(planEstudioSubTab);
    if (currentIndex > 0) {
      setPlanEstudioSubTab(tabs[currentIndex - 1] as any);
      if (planEstudioScrollRef.current) {
        const buttons = planEstudioScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };
  const scrollPlanEstudioTabsRight = () => {
    const tabs = ["plan_estudio","historia_academica"];
    const currentIndex = tabs.indexOf(planEstudioSubTab);
    if (currentIndex < tabs.length - 1) {
      setPlanEstudioSubTab(tabs[currentIndex + 1] as any);
      if (planEstudioScrollRef.current) {
        const buttons = planEstudioScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const scrollHorarioTabsLeft = () => {
    const tabs = ["horario","examenes"];
    const currentIndex = tabs.indexOf(horarioSubTab);
    if (currentIndex > 0) {
      setHorarioSubTab(tabs[currentIndex - 1] as any);
      if (horarioScrollRef.current) {
        const buttons = horarioScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex - 1]) buttons[currentIndex - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };
  const scrollHorarioTabsRight = () => {
    const tabs = ["horario","examenes"];
    const currentIndex = tabs.indexOf(horarioSubTab);
    if (currentIndex < tabs.length - 1) {
      setHorarioSubTab(tabs[currentIndex + 1] as any);
      if (horarioScrollRef.current) {
        const buttons = horarioScrollRef.current.querySelectorAll('button');
        if (buttons[currentIndex + 1]) buttons[currentIndex + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  // Normalized active parent tab: mapping "plan_estudio" to "informacion_materias" and "examenes" to "horario"
  let normalizedParentTab = activeSubTab;
  if (activeSubTab === "plan_estudio") {
    normalizedParentTab = "informacion_materias";
  } else if (activeSubTab === "examenes") {
    normalizedParentTab = "horario";
  }

  // Synchronize internal subtab state when activeSubTab changes from parent
  React.useEffect(() => {
    if (activeSubTab === "plan_estudio") {
      setPlanEstudioSubTab("historia_academica");
    } else if (activeSubTab === "informacion_materias") {
      setPlanEstudioSubTab("plan_estudio");
    } else if (activeSubTab === "examenes") {
      setHorarioSubTab("examenes");
    } else if (activeSubTab === "horario") {
      setHorarioSubTab("horario");
    }
  }, [activeSubTab]);
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubProf, setNewSubProf] = useState("");
  const [newSubClass, setNewSubClass] = useState("");
  const [newSubSchedule, setNewSubSchedule] = useState("");
  const [newSubColor, setNewSubColor] = useState("#3B82F6");

  // Informacion de Materias States
  const [mSearchQuery, setMSearchQuery] = useState("");
  const [mSelectedYear, setMSelectedYear] = useState("Todos");
  const [mSelectedEstado, setMSelectedEstado] = useState("Todos");

  // Plan de Estudio States
  const [peSearchQuery, setPeSearchQuery] = useState("");
  const [peSelectedMateria, setPeSelectedMateria] = useState("Todos");
  const [peSelectedYear, setPeSelectedYear] = useState("Todos");
  const [peSelectedCuatrimestre, setPeSelectedCuatrimestre] = useState("Todos");
  const [peSelectedCursarRendir, setPeSelectedCursarRendir] = useState("Todos");

  // Horario States
  const [hSearchQuery, setHSearchQuery] = useState("");
  const [hSelectedDia, setHSelectedDia] = useState("Todos");
  const [hSelectedMateria, setHSelectedMateria] = useState("Todos");
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [editingHorarioId, setEditingHorarioId] = useState<string | null>(null);
  const [hDia, setHDia] = useState<HorarioItem["dia"]>("Lunes");
  const [hHoraInicio, setHHoraInicio] = useState("");
  const [hHoraFin, setHHoraFin] = useState("");
  const [hMateria, setHMateria] = useState("");
  const [hAulas, setHAulas] = useState("");
  const [hProfesores, setHProfesores] = useState("");

  // Examenes States
  const [exSearchQuery, setExSearchQuery] = useState("");
  const [exSelectedMateria, setExSelectedMateria] = useState("Todos");
  const [exSelectedEstado, setExSelectedEstado] = useState("Todos");
  const [showExamenModal, setShowExamenModal] = useState(false);
  const [editingExamenId, setEditingExamenId] = useState<string | null>(null);
  const [exMateria, setExMateria] = useState("");
  const [exFecha, setExFecha] = useState("");
  const [exEstado, setExEstado] = useState("Parcial");
  const [exInstancia, setExInstancia] = useState("Primero");
  const [exAula, setExAula] = useState("");
  const [tiFilter, setTiFilter] = useState("Todos");

  // Resumen Agenda & Calendar states
  const [resumenCalendarDate, setResumenCalendarDate] = useState<Date>(new Date());
  const [resumenSelectedDateStr, setResumenSelectedDateStr] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [resumenAgendaFilter, setResumenAgendaFilter] = useState<"todos" | "clases" | "examenes" | "trabajos">("todos");
  const [expandedAgendaItemId, setExpandedAgendaItemId] = useState<string | null>(null);

  const MONTH_NAMES_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const WEEK_DAYS_ES = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

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

  const formatDateFriendlyEs = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = getDayNameFromDateStr(dateStr);
    const monthName = MONTH_NAMES_ES[dateObj.getMonth()];
    return `${dayName}, ${d} de ${monthName} de ${y}`;
  };

  const getDaysInMonth = (dateObj: Date) => {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getAcademicEventsForDate = (dateStr: string) => {
    const dName = getDayNameFromDateStr(dateStr);
    const dayHorarios = (horarios || []).filter((h) => h.dia === dName);
    const dayExamenes = (examenes || []).filter((e) => e.fecha && e.fecha.startsWith(dateStr));
    const dayTasks = (tasks || []).filter((t) => t.dueDate && t.dueDate.startsWith(dateStr));

    return {
      hasClases: dayHorarios.length > 0,
      hasExams: dayExamenes.length > 0,
      hasTrabs: dayTasks.length > 0,
      total: dayHorarios.length + dayExamenes.length + dayTasks.length,
      dayHorarios,
      dayExamenes,
      dayTasks,
    };
  };

  const getSubjectName = (subjectId?: string) => {
    if (!subjectId) return "";
    const sub = (subjects || []).find((s) => s.id === subjectId);
    if (sub) return sub.name;
    const mat = (materiasInfo || []).find((m) => m.id === subjectId);
    if (mat) return mat.materia;
    return "";
  };

  // Modal State
  const [showMateriaModal, setShowMateriaModal] = useState(false);
  const [editingMateriaId, setEditingMateriaId] = useState<string | null>(null);

  // Form fields
  const [mEstado, setMEstado] = useState<
    "Aprobado" | "Regularizado" | "Sin empezar"
  >("Sin empezar");
  const [mMateria, setMMateria] = useState("");
  const [mAnoCursado, setMAnoCursado] = useState("Primer Año");
  const [mCuatrimestre, setMCuatrimestre] = useState("Primer Cuatrimestrre");
  const [mCursadoDebil, setMCursadoDebil] = useState("Sin correlativas");
  const [mCursadoFuerte, setMCursadoFuerte] = useState("Sin correlativas");
  const [mRendirFuerte, setMRendirFuerte] = useState("Sin correlativas");
  const [mFechaRegularidad, setMFechaRegularidad] = useState("");
  const [mFechaVencimiento, setMFechaVencimiento] = useState("");
  const [mFechaAprobado, setMFechaAprobado] = useState("");

  const availableMateriaOptions = [
    { value: "Sin correlativas", label: "Sin correlativas" },
    ...Array.from(new Set(materiasInfo.map((m) => m.materia)))
      .filter((mName) => mName !== mMateria)
      .map((mName) => ({ value: mName, label: mName })),
  ];

  const getAcademicStatus = (item: MateriaInfo) => {
    if (item.estado === "Aprobado") {
      return {
        type: "aprobado",
        text: "Aprobado",
        color: "bg-primary/10 text-primary border-primary/20",
      };
    }
    if (item.estado === "Regularizado") {
      const requiredApprove = item.rendirFuerte
        ? item.rendirFuerte
            .split(",")
            .map((x) => x.trim())
            .filter((x) => x && x !== "Sin correlativas")
        : [];
      const missingApprove = requiredApprove.filter((mName) => {
        const matched = materiasInfo.find(
          (m) => m.materia.toLowerCase() === mName.toLowerCase(),
        );
        return !matched || matched.estado !== "Aprobado";
      });

      if (missingApprove.length > 0) {
        return {
          type: "necesito_aprobar",
          text: `Necesito Aprobar: ${missingApprove
            .map((mName) => {
              const matched = materiasInfo.find(
                (m) => m.materia.toLowerCase() === mName.toLowerCase(),
              );
              return `${mName} (${matched ? matched.estado : "Sin empezar"})`;
            })
            .join(", ")}`,
          color: "bg-primary/10 text-primary border-primary/20",
        };
      }
      return {
        type: "puede_rendir",
        text: "Se puede rendir",
        color: "bg-sky-500/10 text-sky-500 border-sky-500/20",
      };
    }

    const requiredWeak = item.cursadoDebil
      ? item.cursadoDebil
          .split(",")
          .map((x) => x.trim())
          .filter((x) => x && x !== "Sin correlativas")
      : [];
    const requiredStrong = item.cursadoFuerte
      ? item.cursadoFuerte
          .split(",")
          .map((x) => x.trim())
          .filter((x) => x && x !== "Sin correlativas")
      : [];

    const missingWeak = requiredWeak.filter((mName) => {
      const matched = materiasInfo.find(
        (m) => m.materia.toLowerCase() === mName.toLowerCase(),
      );
      return (
        !matched ||
        (matched.estado !== "Regularizado" && matched.estado !== "Aprobado")
      );
    });

    const missingStrong = requiredStrong.filter((mName) => {
      const matched = materiasInfo.find(
        (m) => m.materia.toLowerCase() === mName.toLowerCase(),
      );
      return !matched || matched.estado !== "Aprobado";
    });

    if (missingWeak.length > 0 || missingStrong.length > 0) {
      let msgParts: string[] = [];
      if (missingWeak.length > 0) {
        msgParts.push(
          `Necesito Regularizar: ${missingWeak
            .map((mName) => {
              const matched = materiasInfo.find(
                (m) => m.materia.toLowerCase() === mName.toLowerCase(),
              );
              return `${mName} (${matched ? matched.estado : "Sin empezar"})`;
            })
            .join(", ")}`,
        );
      }
      if (missingStrong.length > 0) {
        msgParts.push(
          `Necesito Aprobar: ${missingStrong
            .map((mName) => {
              const matched = materiasInfo.find(
                (m) => m.materia.toLowerCase() === mName.toLowerCase(),
              );
              return `${mName} (${matched ? matched.estado : "Sin empezar"})`;
            })
            .join(", ")}`,
        );
      }
      return {
        type: "necesito_regularizar",
        text: msgParts.join(" | "),
        color: "bg-primary/10 text-primary border-primary/20",
      };
    }

    return {
      type: "puede_cursar",
      text: "Se puede cursar",
      color: "bg-primary/10 text-primary border-primary/30",
    };
  };

  const calculateVencimiento = (
    fechaRegStr?: string,
    fechaVencStr?: string,
  ) => {
    if (!fechaRegStr) return "---";
    let vencDateStr = "";
    if (fechaVencStr) {
      vencDateStr = fechaVencStr;
    } else {
      const parts = fechaRegStr.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        vencDateStr = `${year + 3}-03-31`;
      }
    }
    if (!vencDateStr) return "---";

    const parts = vencDateStr.split("-");
    const formattedVenc = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const vencDate = new Date(vencDateStr + "T12:00:00");
    const currentDate = new Date();

    const diffTime = vencDate.getTime() - currentDate.getTime();
    if (diffTime < 0) {
      return `Vencido (${formattedVenc})`;
    }

    const diffYears = vencDate.getFullYear() - currentDate.getFullYear();
    const diffMonths = vencDate.getMonth() - currentDate.getMonth();
    let totalMonths = diffYears * 12 + diffMonths;

    if (vencDate.getDate() < currentDate.getDate()) {
      totalMonths--;
    }

    if (totalMonths <= 0) {
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} días (${formattedVenc})`;
    }

    return `${totalMonths} meses (${formattedVenc})`;
  };

  // Add Task Form
  const [showAddTask, setShowAddTask] = useState(false);

  useLockBodyScroll(
    Boolean(
      showAddSubject ||
        showHorarioModal ||
        showExamenModal ||
        showMateriaModal ||
        showAddTask
    )
  );
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSubId, setNewTaskSubId] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskType, setNewTaskType] = useState<
    "Examen" | "Trabajo" | "Tarea" | "Otro"
  >("Tarea");

  // Notes state
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    notes[0]?.id || null,
  );
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const askConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmModal({ title, message, onConfirm });
  };

  // Study Timer (Pomodoro)
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 min
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerIntervalId, setTimerIntervalId] = useState<any>(null);

  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    const id = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setTimerRunning(false);
          alert("¡Tiempo de estudio terminado! Toma un descanso.");
          return 1500;
        }
        return prev - 1;
      });
    }, 1000);
    setTimerIntervalId(id);
  };

  const pauseTimer = () => {
    if (!timerRunning) return;
    clearInterval(timerIntervalId);
    setTimerRunning(false);
  };

  const resetTimer = () => {
    clearInterval(timerIntervalId);
    setTimerRunning(false);
    setTimerSeconds(1500);
  };

  const formatTimer = () => {
    const minutes = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const activeNote = notes.find((n) => n.id === activeNoteId);

  // Handlers
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) {
      console.warn("[AcademicView] Validation failed: newSubName is empty");
      return;
    }

    setIsSaving(true);
    console.log("[AcademicView] Saving subject:", newSubName);

    try {
      const nSub: AcademicSubject = {
        id: generateUniqueId("sub"),
        name: newSubName.trim(),
        professor: newSubProf,
        classroom: newSubClass,
        schedule: newSubSchedule,
        color: newSubColor,
      };

      console.log("[AcademicView] Subject item constructed:", nSub);

      await saveItemToFirestore(activeUserId, "subjects", nSub);
      setSubjects((prev) => [nSub, ...prev]);
      console.log("[AcademicView] Subject saved successfully to Firestore.");
      showToast("Materia agregada con éxito", "success");

      setNewSubName("");
      setNewSubProf("");
      setNewSubClass("");
      setNewSubSchedule("");
      setShowAddSubject(false);
    } catch (error) {
      console.error("[AcademicView] Error saving subject:", error);
      showToast("Error al guardar la materia", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskSubId) return;
    setIsSaving(true);
    try {
      const nTask: AcademicTask = {
        id: generateUniqueId("task"),
        subjectId: newTaskSubId,
        title: newTaskTitle,
        dueDate: newTaskDueDate || new Date().toISOString().split("T")[0],
        type: newTaskType,
        completed: false,
      };
      await saveItemToFirestore(activeUserId, "tasks", nTask);
      setTasks((prev) => [nTask, ...prev]);
      showToast("Tarea guardada con éxito", "success");
      setNewTaskTitle("");
      setNewTaskSubId("");
      setNewTaskDueDate("");
      setNewTaskType("Tarea");
      setShowAddTask(false);
    } catch (error) {
      console.error("[AcademicView] Error saving task:", error);
      showToast("Error al guardar la tarea", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNote = () => {
    const titleToUse = newNoteTitle.trim() || `Nota ${notes.length + 1}`;
    const nNote: AcademicNote = {
      id: generateUniqueId("note"),
      title: titleToUse,
      content: newNoteContent || "Escribe tus apuntes aquí...",
      updatedAt: new Date().toISOString(),
    };
    saveItemToFirestore(activeUserId, "notes", nNote);
    setNotes((prev) => [nNote, ...prev]);
    setActiveNoteId(nNote.id);
    setNewNoteTitle("");
    setNewNoteContent("");
  };

  const handleUpdateNoteContent = (content: string) => {
    if (!activeNoteId) return;
    const targetNote = notes.find((n) => n.id === activeNoteId);
    if (targetNote) {
      const updated = { ...targetNote, content, updatedAt: new Date().toISOString() };
      saveItemToFirestore(activeUserId, "notes", updated);
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, content, updatedAt: new Date().toISOString() }
          : n,
      ),
    );
  };

  const handleUpdateNoteTitle = (title: string) => {
    if (!activeNoteId) return;
    const targetNote = notes.find((n) => n.id === activeNoteId);
    if (targetNote) {
      const updated = { ...targetNote, title, updatedAt: new Date().toISOString() };
      saveItemToFirestore(activeUserId, "notes", updated);
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, title, updatedAt: new Date().toISOString() }
          : n,
      ),
    );
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    askConfirmation(
      "Eliminar Nota",
      "¿Estás seguro de que deseas eliminar esta nota?",
      () => {
        deleteItemFromFirestore(activeUserId, "notes", id);
        setNotes((prev) => {
          const remaining = prev.filter((n) => n.id !== id);
          if (activeNoteId === id) {
            setActiveNoteId(remaining[0]?.id || null);
          }
          return remaining;
        });
      },
    );
  };

  const handleDeleteSubject = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que quieres eliminar esta materia? Se eliminarán también todas sus tareas asociadas. Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[AcademicView] Deleting subject:", id);
        try {
          await deleteItemFromFirestore(activeUserId, "subjects", id);
          setSubjects((prev) => prev.filter((s) => s.id !== id));
          console.log("[AcademicView] Subject deleted successfully.");
          showToast("Materia eliminada con éxito", "success");
        } catch (error) {
          console.error("[AcademicView] Error deleting subject:", error);
          showToast("Error al eliminar la materia", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, completed: !t.completed };
          saveItemToFirestore(activeUserId, "tasks", updated);
          return updated;
        }
        return t;
      }),
    );
  };

  const deleteTask = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta tarea académica? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteItemFromFirestore(activeUserId, "tasks", id);
          setTasks((prev) => prev.filter((t) => t.id !== id));
          showToast("Tarea eliminada con éxito", "success");
        } catch (error) {
          console.error("Error deleting task:", error);
          showToast("Error al eliminar la tarea", "error");
        }
      },
    );
  };

  // Materias Info Handlers
  const handleEditMateriaClick = (item: MateriaInfo) => {
    setEditingMateriaId(item.id);
    setMEstado(item.estado);
    setMMateria(item.materia);
    setMAnoCursado(item.anoCursado);
    setMCuatrimestre(item.cuatrimestre);
    setMCursadoDebil(item.cursadoDebil || "Sin correlativas");
    setMCursadoFuerte(item.cursadoFuerte || "Sin correlativas");
    setMRendirFuerte(item.rendirFuerte || "Sin correlativas");
    setMFechaRegularidad(item.fechaRegularidad || "");
    setMFechaVencimiento(item.fechaVencimiento || "");
    setMFechaAprobado(item.fechaAprobado || "");
    setShowMateriaModal(true);
  };

  const handleDeleteMateria = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar la información de esta materia? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[AcademicView] Deleting materia info:", id);
        try {
          await deleteItemFromFirestore(activeUserId, "materias_info", id);
          setMateriasInfo((prev) => prev.filter((m) => m.id !== id));
          console.log("[AcademicView] Materia info deleted successfully.");
          showToast("Materia eliminada con éxito", "success");
        } catch (error) {
          console.error("[AcademicView] Error deleting materia info:", error);
          showToast("Error al eliminar la materia", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleAddOrEditMateria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mMateria.trim()) {
      console.warn("[AcademicView] Validation failed: mMateria is empty");
      return;
    }

    setIsSaving(true);
    console.log("[AcademicView] Saving materia info. Editing ID:", editingMateriaId);

    try {
      const newM: MateriaInfo = {
        id: editingMateriaId || generateUniqueId("mat"),
        estado: mEstado,
        materia: mMateria.trim(),
        anoCursado: mAnoCursado,
        cuatrimestre: mCuatrimestre,
        cursadoDebil: mCursadoDebil,
        cursadoFuerte: mCursadoFuerte,
        rendirFuerte: mRendirFuerte,
        fechaRegularidad: mFechaRegularidad || undefined,
        fechaVencimiento: mFechaVencimiento || undefined,
        fechaAprobado: mFechaAprobado || undefined,
      };

      console.log("[AcademicView] Materia info item constructed:", newM);

      await saveItemToFirestore(activeUserId, "materias_info", newM);
      setMateriasInfo((prev) => {
        const exists = prev.some((m) => m.id === newM.id);
        if (exists) return prev.map((m) => (m.id === newM.id ? newM : m));
        return [newM, ...prev];
      });
      console.log("[AcademicView] Materia info saved successfully to Firestore.");
      showToast(editingMateriaId ? "Información de materia actualizada" : "Información de materia guardada", "success");

      // Reset Form
      setEditingMateriaId(null);
      setMMateria("");
      setMEstado("Sin empezar");
      setMAnoCursado("Primer Año");
      setMCuatrimestre("Primer Cuatrimestrre");
      setMCursadoDebil("Sin correlativas");
      setMCursadoFuerte("Sin correlativas");
      setMRendirFuerte("Sin correlativas");
      setMFechaRegularidad("");
      setMFechaVencimiento("");
      setMFechaAprobado("");
      setShowMateriaModal(false);
    } catch (error) {
      console.error("[AcademicView] Error saving Materia Info:", error);
      showToast("Error al guardar la información de la materia", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOrEditHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hMateria || !hHoraInicio || !hHoraFin) {
      console.warn("[AcademicView] Validation failed: hMateria, hHoraInicio, or hHoraFin is empty");
      return;
    }

    setIsSaving(true);
    console.log("[AcademicView] Saving horario. Editing ID:", editingHorarioId);

    try {
      const newItem: HorarioItem = {
        id: editingHorarioId || generateUniqueId("hor"),
        dia: hDia,
        horaInicio: hHoraInicio,
        horaFin: hHoraFin,
        materia: hMateria,
        aulas: hAulas,
        profesores: hProfesores,
      };

      console.log("[AcademicView] Horario item constructed:", newItem);

      await saveItemToFirestore(activeUserId, "horarios", newItem);
      setHorarios((prev) => {
        const exists = prev.some((h) => h.id === newItem.id);
        if (exists) return prev.map((h) => (h.id === newItem.id ? newItem : h));
        return [newItem, ...prev];
      });
      console.log("[AcademicView] Horario saved successfully to Firestore.");
      showToast(editingHorarioId ? "Horario actualizado con éxito" : "Horario guardado con éxito", "success");

      setEditingHorarioId(null);
      setHDia("Lunes");
      setHHoraInicio("");
      setHHoraFin("");
      setHMateria("");
      setHAulas("");
      setHProfesores("");
      setShowHorarioModal(false);
    } catch (error) {
      console.error("[AcademicView] Error saving Horario:", error);
      showToast("Error al guardar el horario", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHorario = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este horario? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[AcademicView] Deleting horario:", id);
        try {
          await deleteItemFromFirestore(activeUserId, "horarios", id);
          setHorarios((prev) => prev.filter((h) => h.id !== id));
          console.log("[AcademicView] Horario deleted successfully.");
          showToast("Horario eliminado con éxito", "success");
        } catch (error) {
          console.error("[AcademicView] Error deleting Horario:", error);
          showToast("Error al eliminar el horario", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  const handleAddOrEditExamen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exMateria || !exFecha || !exEstado) {
      console.warn("[AcademicView] Validation failed: exMateria, exFecha, or exEstado is empty");
      return;
    }

    setIsSaving(true);
    console.log("[AcademicView] Saving examen. Editing ID:", editingExamenId);

    try {
      const newItem: ExamenItem = {
        id: editingExamenId || generateUniqueId("ex"),
        materia: exMateria,
        fecha: exFecha,
        estado: exEstado,
        instancia: exEstado !== "Examen Final" ? exInstancia : undefined,
        aula: exAula,
      };

      console.log("[AcademicView] Examen item constructed:", newItem);

      await saveItemToFirestore(activeUserId, "examenes", newItem);
      setExamenes((prev) => {
        const exists = prev.some((ex) => ex.id === newItem.id);
        if (exists) return prev.map((ex) => (ex.id === newItem.id ? newItem : ex));
        return [newItem, ...prev];
      });
      console.log("[AcademicView] Examen saved successfully to Firestore.");
      showToast(editingExamenId ? "Examen actualizado con éxito" : "Examen registrado con éxito", "success");

      setEditingExamenId(null);
      setExMateria("");
      setExFecha("");
      setExEstado("Parcial");
      setExInstancia("Primero");
      setExAula("");
      setShowExamenModal(false);
    } catch (error) {
      console.error("[AcademicView] Error saving Examen:", error);
      showToast("Error al guardar el examen", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExamen = (id: string) => {
    askConfirmation(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        setIsDeleting(true);
        console.log("[AcademicView] Deleting examen:", id);
        try {
          await deleteItemFromFirestore(activeUserId, "examenes", id);
          setExamenes((prev) => prev.filter((ex) => ex.id !== id));
          console.log("[AcademicView] Examen deleted successfully.");
          showToast("Examen eliminado con éxito", "success");
        } catch (error) {
          console.error("[AcademicView] Error deleting Examen:", error);
          showToast("Error al eliminar el examen", "error");
        } finally {
          setIsDeleting(false);
        }
      },
    );
  };

  return (
    <div className="space-y-6 animate-fade-in px-3 sm:px-6 pt-1 sm:pt-1.5 pb-6">
      {/* Submenu Tabs Selector with Navigation Arrows */}
      {!propActiveSubTab && (
        <SubNav
          activeTab={normalizedParentTab}
          onTabChange={(id) => {
            // Reset subtab when switching parent tabs
            if (id === "informacion_materias") {
              setPlanEstudioSubTab("plan_estudio");
            } else if (id === "horario") {
              setHorarioSubTab("horario");
            }
            setActiveSubTab(id as any);
          }}
          className="mb-6"
          tabs={[
            { id: "resumen", label: "Mis Estudios", icon: TrendingUp },
            { id: "facultad", label: "Facultad", icon: FolderOpen },
            {
              id: "informacion_materias",
              label: "Plan de Estudio",
              icon: GraduationCap,
            },
            { id: "horario", label: "Calendario Académico", icon: Calendar },
          ]}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={normalizedParentTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          {normalizedParentTab === "informacion_materias" && (
            <div className="flex items-center justify-center mb-8 w-full max-w-sm sm:max-w-md mx-auto">
              <div className="w-full">
                <div
                  ref={planEstudioScrollRef}
                  className="flex items-center justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-full w-full shadow-md whitespace-nowrap"
                >
                  <button
                    onClick={() => setPlanEstudioSubTab("plan_estudio")}
                    className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                      planEstudioSubTab === "plan_estudio"
                        ? "text-white font-black"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap font-bold">Plan de Estudio</span>
                    {planEstudioSubTab === "plan_estudio" && (
                      <motion.div
                        layoutId="activePlanEstudioTabIndicator"
                        className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setPlanEstudioSubTab("historia_academica")}
                    className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                      planEstudioSubTab === "historia_academica"
                        ? "text-white font-black"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                    }`}
                  >
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap font-bold">Historia Académica</span>
                    {planEstudioSubTab === "historia_academica" && (
                      <motion.div
                        layoutId="activePlanEstudioTabIndicator"
                        className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {normalizedParentTab === "horario" && (
            <div className="flex items-center justify-center mb-8 w-full max-w-sm sm:max-w-md mx-auto">
              <div className="w-full">
                <div
                  ref={horarioScrollRef}
                  className="flex items-center justify-center gap-1.5 p-1.5 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-slate-200 dark:border-zinc-800 rounded-full w-full shadow-md whitespace-nowrap"
                >
                  <button
                    onClick={() => setHorarioSubTab("horario")}
                    className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                      horarioSubTab === "horario"
                        ? "text-white font-black"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                    }`}
                  >
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap font-bold">Horario</span>
                    {horarioSubTab === "horario" && (
                      <motion.div
                        layoutId="activeHorarioTabIndicator"
                        className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setHorarioSubTab("examenes")}
                    className={`relative flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm transition-colors rounded-full flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer z-10 whitespace-nowrap ${
                      horarioSubTab === "examenes"
                        ? "text-white font-black"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50 font-medium"
                    }`}
                  >
                    <BookOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap font-bold">Exámenes y Trabajos</span>
                    {horarioSubTab === "examenes" && (
                      <motion.div
                        layoutId="activeHorarioTabIndicator"
                        className="absolute inset-0 rounded-full bg-primary shadow-md shadow-primary/25 -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "resumen" && (() => {
            const selectedEvents = getAcademicEventsForDate(resumenSelectedDateStr);
            type UnifiedAcademicAgendaItem = {
              id: string;
              type: "clase" | "examen" | "trabajo";
              title: string;
              subjectName?: string;
              badge: string;
              timeInfo: string;
              detailsInfo?: string;
              completed?: boolean;
              aulas?: string;
              profesores?: string;
              dia?: string;
              horaInicio?: string;
              horaFin?: string;
              estado?: string;
              instancia?: string;
              aula?: string;
              fecha?: string;
              rawHorario?: HorarioItem;
              rawExamen?: ExamenItem;
              rawTask?: AcademicTask;
            };

            let agendaItemsList: UnifiedAcademicAgendaItem[] = [];

            if (resumenAgendaFilter === "todos" || resumenAgendaFilter === "clases") {
              selectedEvents.dayHorarios.forEach((h) => {
                agendaItemsList.push({
                  id: `h-${h.id}`,
                  type: "clase",
                  title: h.materia,
                  badge: "Clase",
                  timeInfo: `${h.horaInicio || "--:--"} - ${h.horaFin || "--:--"} hs`,
                  detailsInfo: [h.aulas && `Aula: ${h.aulas}`, h.profesores && `Prof: ${h.profesores}`].filter(Boolean).join(" • "),
                  aulas: h.aulas,
                  profesores: h.profesores,
                  dia: h.dia,
                  horaInicio: h.horaInicio,
                  horaFin: h.horaFin,
                  rawHorario: h,
                });
              });
            }

            if (resumenAgendaFilter === "todos" || resumenAgendaFilter === "examenes") {
              selectedEvents.dayExamenes.forEach((e) => {
                agendaItemsList.push({
                  id: `e-${e.id}`,
                  type: "examen",
                  title: e.materia,
                  badge: e.estado || "Examen",
                  timeInfo: e.instancia ? `Instancia: ${e.instancia}` : "Fecha de Examen",
                  detailsInfo: e.aula ? `Aula: ${e.aula}` : undefined,
                  estado: e.estado,
                  instancia: e.instancia,
                  aula: e.aula,
                  fecha: e.fecha,
                  rawExamen: e,
                });
              });
            }

            if (resumenAgendaFilter === "todos" || resumenAgendaFilter === "trabajos") {
              selectedEvents.dayTasks.forEach((t) => {
                agendaItemsList.push({
                  id: `t-${t.id}`,
                  type: "trabajo",
                  title: t.title,
                  subjectName: getSubjectName(t.subjectId),
                  badge: t.type || "Trabajo",
                  timeInfo: t.dueDate ? `Entrega: ${t.dueDate}` : "Sin fecha",
                  detailsInfo: t.completed ? "Completado" : "Pendiente de entrega",
                  completed: t.completed,
                  rawTask: t,
                });
              });
            }

            return (
              <>
                {/* CALENDAR & AGENDA INTEGRATED SECTION IN "MIS ESTUDIOS" */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* LEFT COLUMN: Academic Calendar (5 cols) */}
                  <div
                    className={`p-6 rounded-3xl border flex flex-col justify-between lg:col-span-5 shadow-xs ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                        : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Month Navigation Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/10 dark:border-zinc-800/40">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-primary" />
                          <h3 className="font-extrabold text-sm">Calendario Académico</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setResumenCalendarDate(
                                new Date(resumenCalendarDate.getFullYear(), resumenCalendarDate.getMonth() - 1, 1)
                              )
                            }
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-600 dark:text-zinc-300"
                            title="Mes Anterior"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setResumenCalendarDate(
                                new Date(resumenCalendarDate.getFullYear(), resumenCalendarDate.getMonth() + 1, 1)
                              )
                            }
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-600 dark:text-zinc-300"
                            title="Mes Siguiente"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-center font-extrabold text-xs mb-3 text-slate-800 dark:text-zinc-200 uppercase tracking-widest bg-slate-50 dark:bg-black/40 py-2 rounded-xl">
                        {MONTH_NAMES_ES[resumenCalendarDate.getMonth()]} {resumenCalendarDate.getFullYear()}
                      </div>

                      <div className={`p-3.5 rounded-3xl ${darkMode ? "bg-zinc-950 shadow-sm" : "bg-white shadow-sm border border-slate-100"}`}>
                        {/* Day of Week Headers */}
                        <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                          {WEEK_DAYS_ES.map((wd) => (
                            <div key={wd} className="py-1">
                              {wd}
                            </div>
                          ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysInMonth(resumenCalendarDate).map((day, idx) => {
                            if (day === null) {
                              return <div key={`empty-${idx}`} className="p-1" />;
                            }

                            const dateStr = `${resumenCalendarDate.getFullYear()}-${String(
                              resumenCalendarDate.getMonth() + 1
                            ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                            const events = getAcademicEventsForDate(dateStr);
                            const isSelected = resumenSelectedDateStr === dateStr;

                            const now = new Date();
                            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                            const isToday = todayStr === dateStr;

                            return (
                              <button
                                key={`day-${day}`}
                                onClick={() => setResumenSelectedDateStr(dateStr)}
                                className={`p-1.5 rounded-full flex flex-col items-center justify-center relative cursor-pointer transition-all h-9 w-full font-bold text-xs ${
                                  isSelected
                                    ? "border-2 border-primary text-primary dark:text-primary bg-primary/10 scale-105 shadow-sm"
                                    : isToday
                                      ? "bg-primary text-white dark:text-blue-950 shadow-md font-bold"
                                      : "hover:bg-primary/10 text-slate-700 dark:text-zinc-300"
                                }`}
                              >
                                <span>{day}</span>

                                {events.total > 0 && (
                                  <div className="flex items-center justify-center gap-0.5 absolute bottom-0.5">
                                    {events.hasClases && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary" title="Horario / Clase" />
                                    )}
                                    {events.hasExams && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary/75 ring-1 ring-primary/40 animate-pulse" title="Examen" />
                                    )}
                                    {events.hasTrabs && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary/45" title="Trabajo Práctico" />
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Calendar Legend & Action */}
                      <div className="pt-3 border-t border-zinc-800/10 dark:border-zinc-800/40 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-xs" />
                            <span>Clases</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary/75 ring-1 ring-primary/40" />
                            <span>Exámenes</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary/45" />
                            <span>Trabajos</span>
                          </span>
                          <button
                            onClick={() => {
                              const now = new Date();
                              setResumenCalendarDate(now);
                              const y = now.getFullYear();
                              const m = String(now.getMonth() + 1).padStart(2, "0");
                              const d = String(now.getDate()).padStart(2, "0");
                              setResumenSelectedDateStr(`${y}-${m}-${d}`);
                            }}
                            className="text-primary hover:underline cursor-pointer font-bold capitalize"
                          >
                            Ir a Hoy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Academic Agenda (7 cols) */}
                  <div
                    className={`p-6 rounded-3xl border flex flex-col justify-between lg:col-span-7 shadow-xs ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-white shadow-lg"
                        : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-zinc-800/10 dark:border-zinc-800/40 pb-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-primary shrink-0 self-center" />
                          <h3 className="font-extrabold text-sm self-center translate-y-[0.5px]">
                            Agenda de Cursada y Evaluaciones
                          </h3>
                        </div>
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg">
                          {agendaItemsList.length} Actividades
                        </span>
                      </div>

                      {/* Selected Date Header & Filters */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-4 bg-slate-50 dark:bg-black/40 border border-slate-150 dark:border-zinc-800/50 rounded-2xl">
                        <div>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                            Día Seleccionado
                          </p>
                          <p className="text-xs md:text-sm font-extrabold text-black dark:text-zinc-200 mt-0.5">
                            {formatDateFriendlyEs(resumenSelectedDateStr)}
                          </p>
                        </div>

                        {/* Filter Pills */}
                        <PillFilterBar
                          options={[
                            { id: "todos", label: "Todos" },
                            { id: "clases", label: "Clases" },
                            { id: "examenes", label: "Exámenes" },
                            { id: "trabajos", label: "Trabajos" },
                          ]}
                          activeValue={resumenAgendaFilter}
                          onChange={(val) => setResumenAgendaFilter(val as any)}
                          layoutIdPrefix="academicResumenFilter"
                          className="self-start sm:self-auto"
                        />
                      </div>

                      {/* Agenda Event Items */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={resumenAgendaFilter}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 max-h-[420px] overflow-y-auto pr-1"
                        >
                        {agendaItemsList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                            <BookOpen className="w-8 h-8 text-zinc-400" />
                            <p className="text-zinc-500 text-xs font-semibold max-w-sm italic">
                              No tienes clases, exámenes ni entregas programadas para este día.
                            </p>
                            <button
                              onClick={() => {
                                setActiveSubTab("horario");
                              }}
                              className="mt-2 px-3.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all cursor-pointer border border-primary/20 flex items-center gap-1.5"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Gestionar en Calendario Académico</span>
                            </button>
                          </div>
                        ) : (
                          <AnimatedList<UnifiedAcademicAgendaItem>
                            items={agendaItemsList}
                            showGradients={false}
                            enableArrowNavigation={true}
                            className="max-h-[380px]"
                            style={{
                              '--gradient-color': darkMode ? '#18181b' : '#ffffff',
                            } as React.CSSProperties}
                            renderItem={(item) => {
                              const isExpanded = expandedAgendaItemId === item.id;
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setExpandedAgendaItemId(isExpanded ? null : item.id)}
                                  className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group flex flex-col gap-2 ${
                                    isExpanded
                                      ? "border-primary/50 bg-white dark:bg-black/85 backdrop-blur-md shadow-md ring-1 ring-primary/20"
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900/80"
                                  }`}
                                >
                                  {/* COLLAPSED HEADER LINE */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                                    <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0 w-full sm:w-auto">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <GraduationCap className="w-4 h-4 text-primary shrink-0 self-center" />
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xs font-black truncate text-slate-800 dark:text-zinc-100">
                                              {item.title}
                                            </p>
                                            {item.subjectName && (
                                              <span className="text-[10px] text-zinc-500 font-medium truncate">
                                                ({item.subjectName})
                                              </span>
                                            )}
                                          </div>
                                          {!isExpanded && item.detailsInfo && (
                                            <p className="text-[10px] text-zinc-500 font-medium truncate mt-0.5">
                                              {item.detailsInfo}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {/* Mobile-only Chevron in top right */}
                                      <ChevronDown
                                        className={`sm:hidden w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                                          isExpanded ? "rotate-180 text-primary" : "group-hover:text-zinc-600 dark:group-hover:text-zinc-200"
                                        }`}
                                      />
                                    </div>

                                    {/* Secondary line on mobile (pl-6.5 to align with text), right-aligned on desktop */}
                                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pl-6.5 sm:pl-0">
                                      <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-zinc-300">
                                        {item.timeInfo}
                                      </span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span
                                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                            item.type === "clase"
                                              ? "bg-primary/20 text-primary border border-primary/30"
                                              : item.type === "examen"
                                              ? "bg-primary/15 text-primary/90 border border-primary/25"
                                              : "bg-primary/10 text-primary/75 border border-primary/20"
                                          }`}
                                        >
                                          {item.badge}
                                        </span>
                                        {/* Desktop-only Chevron */}
                                        <ChevronDown
                                          className={`hidden sm:block w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                                            isExpanded ? "rotate-180 text-primary" : "group-hover:text-zinc-600 dark:group-hover:text-zinc-200"
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* EXPANDED DETAILS PANEL */}
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2, ease: "easeOut" }}
                                        className="pt-2 border-t border-slate-200/60 dark:border-zinc-800/80 space-y-3 mt-1"
                                      >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                          {item.type === "clase" && (
                                            <>
                                              <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                                <span className="block text-[9px] font-extrabold text-primary dark:text-primary/90 uppercase tracking-wider mb-0.5">
                                                  Aula / Ubicación
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                  {item.aulas || "Sin aula asignada"}
                                                </span>
                                              </div>
                                              <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                                <span className="block text-[9px] font-extrabold text-primary dark:text-primary/90 uppercase tracking-wider mb-0.5">
                                                  Profesores / Cátedra
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                  {item.profesores || "Sin docente asignado"}
                                                </span>
                                              </div>
                                            </>
                                          )}

                                          {item.type === "examen" && (
                                            <>
                                              <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                                <span className="block text-[9px] font-extrabold text-primary dark:text-primary/90 uppercase tracking-wider mb-0.5">
                                                  Tipo / Estado Examen
                                                </span>
                                                <span className="font-extrabold text-primary text-xs">
                                                  {item.estado || "Examen"}
                                                </span>
                                              </div>
                                              <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                                <span className="block text-[9px] font-extrabold text-primary dark:text-primary/90 uppercase tracking-wider mb-0.5">
                                                  Instancia / Aula
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                  {[item.instancia && `Instancia: ${item.instancia}`, item.aula && `Aula: ${item.aula}`].filter(Boolean).join(" • ") || "Sin especificar"}
                                                </span>
                                              </div>
                                            </>
                                          )}

                                          {item.type === "trabajo" && (
                                            <>
                                              <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                                <span className="block text-[9px] font-extrabold text-primary dark:text-primary/90 uppercase tracking-wider mb-0.5">
                                                  Estado de Entrega
                                                </span>
                                                <span className={`font-extrabold text-xs ${item.completed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                  {item.completed ? "✓ Completado" : "⏳ Pendiente de Entrega"}
                                                </span>
                                              </div>
                                              <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
                                                <span className="block text-[9px] font-extrabold text-primary dark:text-primary/90 uppercase tracking-wider mb-0.5">
                                                  Materia Asociada
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                                  {item.subjectName || "General"}
                                                </span>
                                              </div>
                                            </>
                                          )}
                                        </div>

                                        {/* ACTION BUTTONS */}
                                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/40 dark:border-zinc-800/50">
                                          {item.type === "clase" && item.rawHorario && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingHorarioId(item.rawHorario!.id);
                                                  setHDia(item.rawHorario!.dia);
                                                  setHHoraInicio(item.rawHorario!.horaInicio);
                                                  setHHoraFin(item.rawHorario!.horaFin);
                                                  setHMateria(item.rawHorario!.materia);
                                                  setHAulas(item.rawHorario!.aulas);
                                                  setHProfesores(item.rawHorario!.profesores);
                                                  setShowHorarioModal(true);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all cursor-pointer"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                <span>Editar Horario</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteHorario(item.rawHorario!.id);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-all cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Eliminar</span>
                                              </button>
                                            </>
                                          )}

                                          {item.type === "examen" && item.rawExamen && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingExamenId(item.rawExamen!.id);
                                                  setExMateria(item.rawExamen!.materia);
                                                  setExFecha(item.rawExamen!.fecha);
                                                  setExEstado(item.rawExamen!.estado);
                                                  setExInstancia(item.rawExamen!.instancia || "Primero");
                                                  setExAula(item.rawExamen!.aula);
                                                  setShowExamenModal(true);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all cursor-pointer"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                <span>Editar Examen</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteExamen(item.rawExamen!.id);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-all cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Eliminar</span>
                                              </button>
                                            </>
                                          )}

                                          {item.type === "trabajo" && item.rawTask && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleTask(item.rawTask!.id);
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                  item.completed
                                                    ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                                    : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                                }`}
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{item.completed ? "Marcar Pendiente" : "Marcar Completado"}</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  deleteTask(item.rawTask!.id);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-all cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Eliminar</span>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            }}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Overview stats & Study timer */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Academic summary bento */}
            <div
              className={`p-6 rounded-3xl border ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-md">Desempeño Académico</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 font-medium">
                    Aprobadas
                  </span>
                  <span className="text-xl font-bold">
                    {materiasInfo.filter((m) => m.estado === "Aprobado").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 font-medium">
                    Regularizadas
                  </span>
                  <span className="text-xl font-bold">
                    {
                      materiasInfo.filter((m) => m.estado === "Regularizado")
                        .length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500 font-medium">
                    Sin empezar
                  </span>
                  <span className="text-xl font-bold">
                    {
                      materiasInfo.filter((m) => m.estado === "Sin empezar")
                        .length
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Pomodoro Timer widget */}
            <div
              className={`p-6 rounded-3xl border flex flex-col justify-between ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-md">Temporizador de Enfoque</h3>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Pomodoro
                </span>
              </div>

              <div className="my-4 text-center">
                <span className="text-4xl font-extrabold font-mono tracking-tight">
                  {formatTimer()}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2.5">
                <button
                  onClick={startTimer}
                  disabled={timerRunning}
                  className="px-4 py-1.5 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                >
                  Iniciar
                </button>
                <button
                  onClick={pauseTimer}
                  disabled={!timerRunning}
                  className="px-4 py-1.5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
                >
                  Pausar
                </button>
                <button
                  onClick={resetTimer}
                  className="px-4 py-1.5 rounded-full bg-red-600/10 hover:bg-red-600/20 text-red-500 text-xs font-bold transition-all cursor-pointer"
                >
                  Reiniciar
                </button>
              </div>
            </div>

            {/* Subjects list */}
            <div
              className={`p-6 rounded-3xl border overflow-hidden ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-md">Materias por Rendir</h3>
                </div>
              </div>

              <div className="space-y-2.5">
                {materiasInfo.filter(
                  (m) => getAcademicStatus(m).type === "puede_rendir",
                ).length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 text-center py-4">
                    No hay materias por rendir.
                  </p>
                ) : (
                  <AnimatedList<MateriaInfo>
                    items={materiasInfo.filter(
                      (m) => getAcademicStatus(m).type === "puede_rendir",
                    )}
                    showGradients={true}
                    enableArrowNavigation={true}
                    className="max-h-[220px]"
                    style={{
                      '--gradient-color': darkMode ? '#18181b' : '#ffffff',
                    } as React.CSSProperties}
                    renderItem={(sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                          <div>
                            <p className="text-xs font-bold">{sub.materia}</p>
                            <p className="text-[10px] text-zinc-500 font-medium">
                              Vencimiento: {sub.fechaVencimiento || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Add Subject Modal overlay */}
          {showAddSubject &&
            createPortal(
              <div
                onClick={() => { if (!isSaving) setShowAddSubject(false); }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${
                    darkMode
                      ? "bg-zinc-900 border-zinc-800 text-white"
                      : "bg-white border-zinc-200 text-zinc-800"
                  }`}
                >
                  <h3 className="font-extrabold text-lg">Agregar Materia</h3>
                  <form onSubmit={handleAddSubject} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                        Nombre de la Materia
                      </label>
                      <input
                        type="text"
                        disabled={isSaving}
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        placeholder="Ej: Análisis Matemático III"
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm disabled:opacity-50"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                          Profesor
                        </label>
                        <input
                          type="text"
                          disabled={isSaving}
                          value={newSubProf}
                          onChange={(e) => setNewSubProf(e.target.value)}
                          placeholder="Ej: Dr. Pérez"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                          Aula/Virtual
                        </label>
                        <input
                          type="text"
                          disabled={isSaving}
                          value={newSubClass}
                          onChange={(e) => setNewSubClass(e.target.value)}
                          placeholder="Ej: Aula 102"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm disabled:opacity-50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                        Horario
                      </label>
                      <input
                        type="text"
                        disabled={isSaving}
                        value={newSubSchedule}
                        onChange={(e) => setNewSubSchedule(e.target.value)}
                        placeholder="Ej: Lunes y Miércoles 08:00 - 10:00"
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                        Color Distintivo
                      </label>
                      <div className="flex gap-2.5">
                        {[
                          "#3B82F6",
                          "#8B5CF6",
                          "#EF4444",
                          "#10B981",
                          "#F59E0B",
                          "#EC4899",
                        ].map((color) => (
                          <button
                            key={color}
                            type="button"
                            disabled={isSaving}
                            onClick={() => setNewSubColor(color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all disabled:opacity-50 ${
                              newSubColor === color
                                ? "border-white scale-110"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                          ></button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => { if (!isSaving) setShowAddSubject(false); }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          "Guardar"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>,
              document.body,
            )}

          {/* Main Content Area: Exams Checklist & Notes Workspace */}
          <div className="grid grid-cols-1 gap-6">
            {/* Tasks, Homeworks & Exams Planner */}
            <div
              className={`p-6 rounded-3xl border flex flex-col justify-between ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg"
                  : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-md">
                      Tareas e Investigaciones
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <CustomSelect
                      value={tiFilter}
                      onChange={(val) => setTiFilter(val)}
                      options={[
                        { value: "Todos", label: "Todos" },
                        { value: "Parcial", label: "Parcial" },
                        { value: "Recuperatorio", label: "Recuperatorio" },
                        { value: "Extraordinario", label: "Extraordinario" },
                        { value: "Examen Final", label: "Examen Final" },
                        { value: "Trabajo Practico", label: "Trabajo Práctico" },
                      ]}
                      size="sm"
                      className="w-44 sm:w-48"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {(() => {
                    const filteredExamenes = examenes
                      .filter(
                        (ex) =>
                          tiFilter === "Todos" ||
                          ex.estado === tiFilter ||
                          ex.instancia === tiFilter,
                      )
                      .sort(
                        (a, b) =>
                          new Date(a.fecha).getTime() -
                          new Date(b.fecha).getTime(),
                      );

                    if (filteredExamenes.length === 0) {
                      return (
                        <p className="text-zinc-500 text-xs text-center py-10">
                          No hay tareas o exámenes.
                        </p>
                      );
                    }

                    return (
                      <AnimatedList<ExamenItem>
                        items={filteredExamenes}
                        showGradients={true}
                        enableArrowNavigation={true}
                        className="max-h-[320px]"
                        style={{
                          '--gradient-color': darkMode ? '#18181b' : '#ffffff',
                        } as React.CSSProperties}
                        renderItem={(ex) => (
                          <div
                            key={ex.id}
                            className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/85 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                          >
                            <div className="flex items-start sm:items-center gap-3 w-full">
                              <div className="w-2 self-stretch rounded-full bg-primary shrink-0"></div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">{ex.materia}</p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-0.5 items-start">
                                  <span className="text-[9px] px-2 py-0.5 rounded-md text-white dark:text-blue-950 font-bold bg-primary shrink-0 self-start sm:self-auto">
                                    {ex.estado}{" "}
                                    {ex.instancia ? `(${ex.instancia})` : ""}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                                    {new Date(ex.fecha)
                                      .toLocaleString("es-AR", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })
                                      .replace(",", "")}
                                  </span>
                                  {ex.aula && (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                                      Aula: {ex.aula}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>


          </div>
        </>
      );
    })()}

      {/* Informacion de Materias Submenu Tab */}
      {normalizedParentTab === "informacion_materias" && planEstudioSubTab === "plan_estudio" && (
        <div className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-extrabold text-md flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <span>Plan de Estudio</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Administra el estado, correlativas y fechas clave de regularidad o aprobación de las materias de tu carrera.
              </p>
            </div>
            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setEditingMateriaId(null);
                  setMMateria("");
                  setMEstado("Sin empezar");
                  setMAnoCursado("Primer Año");
                  setMCuatrimestre("Primer Cuatrimestrre");
                  setMCursadoDebil("Sin correlativas");
                  setMCursadoFuerte("Sin correlativas");
                  setMRendirFuerte("Sin correlativas");
                  setMFechaRegularidad("");
                  setMFechaVencimiento("");
                  setMFechaAprobado("");
                  setShowMateriaModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Materia</span>
              </motion.button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
            {/* Search query */}
            <div className="relative w-full sm:w-auto sm:col-span-2 flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                <Search className="w-4 h-4 text-primary" />
              </span>
              <input
                type="text"
                placeholder="Buscar por materia o correlativas..."
                value={mSearchQuery}
                onChange={(e) => setMSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
              />
            </div>

            {/* Year Filter */}
            <CustomSelect
              value={mSelectedYear}
              onChange={(val) => setMSelectedYear(val)}
              options={[
                { value: "Todos", label: "Todos los Años" },
                { value: "Primer Año", label: "Primer Año" },
                { value: "Segundo Año", label: "Segundo Año" },
                { value: "Tercer Año", label: "Tercer Año" },
                { value: "Cuarto Año", label: "Cuarto Año" },
                { value: "Quinto Año", label: "Quinto Año" },
              ]}
              icon={<Filter className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
              size="sm"
            />

            {/* Status Filter */}
            <CustomSelect
              value={mSelectedEstado}
              onChange={(val) => setMSelectedEstado(val)}
              options={[
                { value: "Todos", label: "Todos los Estados" },
                { value: "Aprobado", label: "Aprobado" },
                { value: "Regularizado", label: "Regularizado" },
                { value: "Sin empezar", label: "Sin empezar" },
              ]}
              icon={<Filter className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
              size="sm"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${ darkMode ?"bg-zinc-950/40 text-zinc-400"
                      : "bg-slate-50 text-slate-500"
                  }`}
                >
                  <th className="py-3.5 px-4 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[120px] w-[120px] max-w-[120px]">
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-primary" /> Estado</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap md:sticky md:left-[120px] z-30 bg-slate-100 dark:bg-zinc-950 min-w-[220px] w-[220px] max-w-[220px]">
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Materia</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Año</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cuatrim.</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cursar (D)</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cursar (F)</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Rendir (F)</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> F. Reg.</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> F. Venc.</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> F. Aprob.</span>
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-right">
                    <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                  </th>
                </tr>
              </thead>
              <tbody className="">
                {materiasInfo
                  .filter((item) => {
                    const matchesSearch =
                      item.materia
                        .toLowerCase()
                        .includes(mSearchQuery.toLowerCase()) ||
                      (item.cursadoDebil &&
                        item.cursadoDebil
                          .toLowerCase()
                          .includes(mSearchQuery.toLowerCase())) ||
                      (item.cursadoFuerte &&
                        item.cursadoFuerte
                          .toLowerCase()
                          .includes(mSearchQuery.toLowerCase())) ||
                      (item.rendirFuerte &&
                        item.rendirFuerte
                          .toLowerCase()
                          .includes(mSearchQuery.toLowerCase()));
                    const matchesYear =
                      mSelectedYear === "Todos" ||
                      item.anoCursado === mSelectedYear;
                    const matchesEstado =
                      mSelectedEstado === "Todos" ||
                      item.estado === mSelectedEstado;
                    return matchesSearch && matchesYear && matchesEstado;
                  })
                  .map((item) => (
                    <tr
                      key={item.id}
                      className={`group text-xs font-medium hover:bg-slate-50/80 dark:hover:bg-zinc-950/20 transition-colors ${ darkMode ? "text-zinc-300" : "text-slate-700"
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[120px] w-[120px] max-w-[120px]">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            item.estado === "Aprobado"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : item.estado === "Regularizado"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap md:sticky md:left-[120px] z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[220px] w-[220px] max-w-[220px]" style={{ color: darkMode ? undefined : '#000000' }}>
                        <span className="truncate block" title={item.materia}>{item.materia}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {item.anoCursado}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                        {item.cuatrimestre}
                      </td>
                      <td
                        className="py-3 px-4 text-slate-500 dark:text-zinc-400 max-w-[150px] truncate whitespace-nowrap"
                        title={item.cursadoDebil}
                      >
                        {item.cursadoDebil}
                      </td>
                      <td
                        className="py-3 px-4 text-slate-500 dark:text-zinc-400 max-w-[150px] truncate whitespace-nowrap"
                        title={item.cursadoFuerte}
                      >
                        {item.cursadoFuerte}
                      </td>
                      <td
                        className="py-3 px-4 text-slate-500 dark:text-zinc-400 max-w-[150px] truncate whitespace-nowrap"
                        title={item.rendirFuerte}
                      >
                        {item.rendirFuerte}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 font-mono whitespace-nowrap">
                        {item.fechaRegularidad
                          ? item.fechaRegularidad.split("-").reverse().join("/")
                          : "---"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 font-mono whitespace-nowrap">
                        {item.fechaVencimiento
                          ? item.fechaVencimiento.split("-").reverse().join("/")
                          : "---"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 font-mono whitespace-nowrap">
                        {item.fechaAprobado
                          ? item.fechaAprobado.split("-").reverse().join("/")
                          : "---"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditMateriaClick(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                            title="Editar Materia"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMateria(item.id)}
                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer"
                            title="Eliminar Materia"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
            <span>Total de registros: {materiasInfo.length}</span>
            <span>Sincronizado localmente</span>
          </div>
        </div>
      )}

      {/* Plan de Estudio Submenu Tab */}
      {normalizedParentTab === "informacion_materias" && planEstudioSubTab === "historia_academica" &&
        (() => {
          const peTotal = materiasInfo.length;
          const peAprobadas = materiasInfo.filter(
            (m) => m.estado === "Aprobado",
          ).length;
          const pePercent =
            peTotal > 0 ? Math.round((peAprobadas / peTotal) * 100) : 0;
          const peRegularizadas = materiasInfo.filter(
            (m) => m.estado === "Regularizado",
          ).length;
          const peSinEmpezar = materiasInfo.filter(
            (m) => m.estado === "Sin empezar",
          ).length;

          // Dynamic Filter Options
          const peMateriaOptions = [
            { value: "Todos", label: "Todas las Materias" },
            ...Array.from(new Set(materiasInfo.map((m) => m.materia)))
              .sort()
              .map((name) => ({ value: name, label: name })),
          ];

          const peYearOptions = [
            { value: "Todos", label: "Todos los Años" },
            ...Array.from(new Set(materiasInfo.map((m) => m.anoCursado)))
              .sort()
              .map((yr) => ({ value: yr, label: yr })),
          ];

          const peCuatrimestreOptions = [
            { value: "Todos", label: "Todos los Cuatrimestres" },
            ...Array.from(new Set(materiasInfo.map((m) => m.cuatrimestre)))
              .sort()
              .map((cuat) => ({ value: cuat, label: cuat })),
          ];

          const peCursarRendirOptions = [
            { value: "Todos", label: "Todos los Estados" },
            { value: "Aprobado", label: "Aprobado" },
            { value: "Se puede rendir", label: "Se puede rendir" },
            { value: "Se puede cursar", label: "Se puede cursar" },
            { value: "Necesito Aprobar", label: "Necesito Aprobar" },
            { value: "Necesito Regularizar", label: "Necesito Regularizar" },
          ];

          // Filtered list
          const filteredPlanMaterias = materiasInfo.filter((item) => {
            const matchesSearch = item.materia
              .toLowerCase()
              .includes(peSearchQuery.toLowerCase());
            const matchesMateria =
              peSelectedMateria === "Todos" ||
              item.materia === peSelectedMateria;
            const matchesYear =
              peSelectedYear === "Todos" || item.anoCursado === peSelectedYear;
            const matchesCuatrimestre =
              peSelectedCuatrimestre === "Todos" ||
              item.cuatrimestre === peSelectedCuatrimestre;

            let matchesStatus = true;
            if (peSelectedCursarRendir !== "Todos") {
              const statusObj = getAcademicStatus(item);
              if (peSelectedCursarRendir === "Aprobado") {
                matchesStatus = item.estado === "Aprobado";
              } else if (peSelectedCursarRendir === "Se puede rendir") {
                matchesStatus = statusObj.type === "puede_rendir";
              } else if (peSelectedCursarRendir === "Se puede cursar") {
                matchesStatus = statusObj.type === "puede_cursar";
              } else if (peSelectedCursarRendir === "Necesito Aprobar") {
                matchesStatus =
                  statusObj.type === "necesito_aprobar" ||
                  statusObj.text.includes("Necesito Aprobar");
              } else if (peSelectedCursarRendir === "Necesito Regularizar") {
                matchesStatus =
                  statusObj.type === "necesito_regularizar" ||
                  statusObj.text.includes("Necesito Regularizar");
              }
            }

            return (
              matchesSearch &&
              matchesMateria &&
              matchesYear &&
              matchesCuatrimestre &&
              matchesStatus
            );
          });

          return (
            <div className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
              {/* Header Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-extrabold text-md flex items-center gap-2">
                    <Library className="w-5 h-5 text-primary" />
                    <span>Historia Académica</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Visualiza tu avance académico, verifica correlativas y planifica tu cursado.
                  </p>
                </div>
              </div>

              {/* Bento Grid Stats - Matching comidas pantry/mercaderia bento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  className="p-5 rounded-2xl border transition-all hover:scale-[1.01] bg-white dark:bg-black/85 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Progreso de Carrera
                    </span>
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-2xl font-extrabold tracking-tight">
                      {peAprobadas}{" "}
                      <span className="text-sm font-medium text-slate-400 dark:text-zinc-500">
                        / {peTotal}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {pePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${pePercent}%` }}
                    />
                  </div>
                  <span className="block mt-2 text-[10px] text-slate-400 dark:text-zinc-500">
                    {peTotal - peAprobadas} materias pendientes de aprobación
                  </span>
                </div>

                <div
                  className="p-5 rounded-2xl border transition-all hover:scale-[1.01] bg-white dark:bg-black/85 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Materias Regularizadas
                    </span>
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight mb-1">
                    {peRegularizadas}
                  </div>
                  <span className="block text-[10px] text-slate-400 dark:text-zinc-500">
                    Listo para rendir examen final
                  </span>
                  <div className="mt-3 flex gap-1 items-center text-[10px] text-primary font-semibold bg-primary/10 px-2 py-1 rounded-lg w-fit">
                    <Clock className="w-3 h-3" />
                    <span>Requieren seguimiento de vencimiento</span>
                  </div>
                </div>

                <div
                  className="p-5 rounded-2xl border transition-all hover:scale-[1.01] bg-white dark:bg-black/85 backdrop-blur-md border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                      Sin Empezar (Pendientes)
                    </span>
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight mb-1">
                    {peSinEmpezar}
                  </div>
                  <span className="block text-[10px] text-slate-400 dark:text-zinc-500">
                    Planificación de cursado necesaria
                  </span>
                  <div className="mt-3 flex gap-1 items-center text-[10px] text-primary font-semibold bg-primary/10 px-2 py-1 rounded-lg w-fit">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      {Math.round((peSinEmpezar / (peTotal || 1)) * 100)}% de la
                      currícula
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mt-8 mb-6 w-full">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input
                      type="text"
                      value={peSearchQuery}
                      onChange={(e) => setPeSearchQuery(e.target.value)}
                      placeholder="Buscar materia por nombre..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none transition-all text-xs focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                    

                    <CustomSelect
                      value={peSelectedMateria}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      onChange={(val) => setPeSelectedMateria(val)}
                      options={peMateriaOptions}
                      placeholder="Filtrar Materia"
                      size="sm"
                      className="w-full sm:w-auto"
                    />

                    <CustomSelect
                      value={peSelectedYear}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      onChange={(val) => setPeSelectedYear(val)}
                      options={peYearOptions}
                      placeholder="Año"
                      size="sm"
                      className="w-full sm:w-auto"
                    />

                    <CustomSelect
                      value={peSelectedCuatrimestre}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      onChange={(val) => setPeSelectedCuatrimestre(val)}
                      options={peCuatrimestreOptions}
                      placeholder="Cuatrimestre"
                      size="sm"
                      className="w-full sm:w-auto"
                    />

                    <CustomSelect
                      value={peSelectedCursarRendir}
                      icon={<Filter className="w-3.5 h-3.5" />}
                      onChange={(val) => setPeSelectedCursarRendir(val)}
                      options={peCursarRendirOptions}
                      placeholder="Cursar o Rendir"
                      size="sm"
                      className="w-full sm:w-auto"
                    />
                  </div>
              </div>

              {/* Table of Plan de Estudio */}
                <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                >
                        <th className="py-3.5 px-4 whitespace-nowrap md:sticky md:left-0 z-30 bg-slate-100 dark:bg-zinc-950 min-w-[240px] w-[240px] max-w-[240px]">
                          <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Materia</span>
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Año</span>
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Cuatrim.</span>
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Instancia</span>
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Vence</span>
                        </th>
                        <th className="py-3.5 px-4 whitespace-nowrap text-right">
                          <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="">
                      {filteredPlanMaterias.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-slate-400 dark:text-zinc-500"
                          >
                            Ninguna materia coincide con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        filteredPlanMaterias.map((item) => {
                          const statusObj = getAcademicStatus(item);
                          const vencimientoText = calculateVencimiento(
                            item.fechaRegularidad,
                            item.fechaVencimiento,
                          );

                          return (
                            <tr
                              key={item.id}
                              className="group hover:bg-slate-50/80 dark:hover:bg-zinc-950/20 transition-colors"
                            >
                              <td className="py-3.5 px-4 whitespace-nowrap md:sticky md:left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-slate-50 dark:group-hover:bg-zinc-900 transition-colors min-w-[240px] w-[240px] max-w-[240px]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="font-bold text-black dark:text-white truncate block" title={item.materia} style={{ color: darkMode ? undefined : '#000000' }}>
                                    {item.materia}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 font-medium whitespace-nowrap">
                                {item.anoCursado}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 font-medium whitespace-nowrap">
                                {item.cuatrimestre}
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusObj.color}`}
                                >
                                  {statusObj.type === "aprobado" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  )}
                                  {statusObj.type === "puede_rendir" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                  )}
                                  {statusObj.type === "puede_cursar" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  )}
                                  {(statusObj.type === "necesito_aprobar" ||
                                    statusObj.type ===
                                      "necesito_regularizar") && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                  )}
                                  <span
                                    className="truncate max-w-[280px]"
                                    title={statusObj.text}
                                  >
                                    {statusObj.text}
                                  </span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {item.estado === "Regularizado" ? (
                                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 font-mono">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{vencimientoText}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-zinc-600">
                                    ---
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleEditMateriaClick(item)}
                                  className="p-1.5 text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                                  title="Editar Estado"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">
                                    Estado
                                  </span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                  <span>
                    Total filtrado: {filteredPlanMaterias.length} materias
                  </span>
                  <span>Estilo unificado con módulo Comidas</span>
                </div>
              </div>
          );
        })()}

      {/* Horario Submenu Tab */}
      {normalizedParentTab === "horario" && horarioSubTab === "horario" &&
        (() => {
          const filteredHorarios = horarios.filter((h) => {
            const matchesSearch =
              h.materia.toLowerCase().includes(hSearchQuery.toLowerCase()) ||
              h.profesores.toLowerCase().includes(hSearchQuery.toLowerCase()) ||
              h.aulas.toLowerCase().includes(hSearchQuery.toLowerCase());
            const matchesDia =
              hSelectedDia === "Todos" || h.dia === hSelectedDia;
            const matchesMateria =
              hSelectedMateria === "Todos" || h.materia === hSelectedMateria;
            return matchesSearch && matchesDia && matchesMateria;
          });

          return (
            <div className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
              {/* Header Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-extrabold text-md flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>Horario de Clases</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Consulta tu cronograma semanal de clases, profesores y aulas asignadas.
                  </p>
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setEditingHorarioId(null);
                      setHDia("Lunes");
                      setHHoraInicio("");
                      setHHoraFin("");
                      setHMateria("");
                      setHAulas("");
                      setHProfesores("");
                      setShowHorarioModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Horario</span>
                  </motion.button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <input
                    type="text"
                    value={hSearchQuery}
                    onChange={(e) => setHSearchQuery(e.target.value)}
                    placeholder="Buscar por materia, aula o profesor..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                  

                  <CustomSelect
                    size="sm"
                    className="w-full sm:w-auto"
                    value={hSelectedDia}
                      icon={<Filter className="w-3.5 h-3.5" />}
                    onChange={(val) => setHSelectedDia(val)}
                    options={[
                      { value: "Todos", label: "Todos los Días" },
                      { value: "Lunes", label: "Lunes" },
                      { value: "Martes", label: "Martes" },
                      { value: "Miércoles", label: "Miércoles" },
                      { value: "Jueves", label: "Jueves" },
                      { value: "Viernes", label: "Viernes" },
                      { value: "Sábado", label: "Sábado" },
                    ]}
                    placeholder="Día"
                    
                  />

                  <CustomSelect
                    size="sm"
                    className="w-full sm:w-auto"
                    value={hSelectedMateria}
                      icon={<Filter className="w-3.5 h-3.5" />}
                    onChange={(val) => setHSelectedMateria(val)}
                    options={[
                      { value: "Todos", label: "Todas las Materias" },
                      ...Array.from(new Set(horarios.map((h) => h.materia)))
                        .sort()
                        .map((m) => ({ value: m, label: m })),
                    ]}
                    placeholder="Materia"
                    
                  />

                  
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                >
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Día</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Horario</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Materia</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Aula</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Prof.</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-right">
                        <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {filteredHorarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-slate-400 dark:text-zinc-500"
                        >
                          No hay horarios programados que coincidan con los
                          filtros. Haz clic en "Nuevo Horario" para agregar.
                        </td>
                      </tr>
                    ) : (
                      [
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                      ].map((dia) => {
                        const diaHorarios = filteredHorarios
                          .filter((h) => h.dia === dia)
                          .sort((a, b) =>
                            a.horaInicio.localeCompare(b.horaInicio),
                          );
                        if (diaHorarios.length === 0) return null;
                        return diaHorarios.map((h, i) => (
                          <tr
                            key={h.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-zinc-950/20 transition-colors"
                          >
                            {i === 0 && (
                              <td
                                rowSpan={diaHorarios.length}
                                className="py-3.5 px-4 align-top whitespace-nowrap"
                              >
                                <span className="font-extrabold text-black dark:text-white uppercase tracking-wider text-[10px] bg-slate-100 dark:bg-black px-2 py-1 rounded-md" style={{ color: darkMode ? undefined : '#000000' }}>
                                  {dia}
                                </span>
                              </td>
                            )}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-zinc-300">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <span>
                                  {h.horaInicio} - {h.horaFin}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {h.materia}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                              {h.aulas || "---"}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                              {h.profesores || "---"}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setEditingHorarioId(h.id);
                                  setHDia(h.dia);
                                  setHHoraInicio(h.horaInicio);
                                  setHHoraFin(h.horaFin);
                                  setHMateria(h.materia);
                                  setHAulas(h.aulas);
                                  setHProfesores(h.profesores);
                                  setShowHorarioModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-primary/10 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteHorario(h.id)}
                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-container dark:hover:bg-primary/10 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ));
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

      {/* Examenes Submenu Tab */}
      {normalizedParentTab === "horario" && horarioSubTab === "examenes" &&
        (() => {
          const filteredExamenes = examenes.filter((ex) => {
            const matchesSearch =
              ex.materia.toLowerCase().includes(exSearchQuery.toLowerCase()) ||
              ex.aula.toLowerCase().includes(exSearchQuery.toLowerCase());
            const matchesEstado =
              exSelectedEstado === "Todos" || ex.estado === exSelectedEstado;
            const matchesMateria =
              exSelectedMateria === "Todos" || ex.materia === exSelectedMateria;
            return matchesSearch && matchesEstado && matchesMateria;
          });

          return (
            <div className={`p-6 rounded-3xl border ${darkMode ? "bg-zinc-900 border-zinc-800 text-white shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"}`}>
              {/* Header Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-extrabold text-md flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span>Parciales, Finales y Trabajos</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Registra las fechas de tus próximos exámenes y entregas.
                  </p>
                </div>
                <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setEditingExamenId(null);
                      setExMateria("");
                      setExFecha("");
                      setExEstado("Parcial");
                      setExInstancia("Primero");
                      setExAula("");
                      setShowExamenModal(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Examen / Trabajo</span>
                  </motion.button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center w-full">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <input
                    type="text"
                    value={exSearchQuery}
                    onChange={(e) => setExSearchQuery(e.target.value)}
                    placeholder="Buscar por materia o aula..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none text-xs transition-all focus:border-slate-400 dark:focus:border-zinc-700"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                  

                  <CustomSelect
                    size="sm"
                    className="w-full sm:w-auto"
                    value={exSelectedEstado}
                      icon={<Filter className="w-3.5 h-3.5" />}
                    onChange={(val) => setExSelectedEstado(val)}
                    options={[
                      { value: "Todos", label: "Todos los Estados" },
                      { value: "Parcial", label: "Parcial" },
                      { value: "Recuperatorio", label: "Recuperatorio" },
                      { value: "Extraordinario", label: "Extraordinario" },
                      { value: "Examen Final", label: "Examen Final" },
                    ]}
                    placeholder="Estado"
                    
                  />

                  <CustomSelect
                    size="sm"
                    className="w-full sm:w-auto"
                    value={exSelectedMateria}
                      icon={<Filter className="w-3.5 h-3.5" />}
                    onChange={(val) => setExSelectedMateria(val)}
                    options={[
                      { value: "Todos", label: "Todas las Materias" },
                      ...Array.from(new Set(examenes.map((ex) => ex.materia)))
                        .sort()
                        .map((m) => ({ value: m, label: m })),
                    ]}
                    placeholder="Materia"
                    
                  />

                  
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl bg-white dark:bg-black/85 backdrop-blur-md border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead className="sticky top-0 z-20">
                <tr
                  className={`text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 text-zinc-400" : "bg-slate-50 text-slate-500"}`}
                >
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Materia</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Fecha</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Instancia</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5"><FolderOpen className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Aula</span>
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap text-right">
                        <span className="flex items-center justify-end gap-1.5 w-full"><Settings className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-500" /> Acc.</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {filteredExamenes.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-slate-400 dark:text-zinc-500"
                        >
                          No hay registros programados que coincidan con los
                          filtros. Haz clic en "Nuevo" para agregar.
                        </td>
                      </tr>
                    ) : (
                      filteredExamenes
                        .sort(
                          (a, b) =>
                            new Date(a.fecha).getTime() -
                            new Date(b.fecha).getTime(),
                        )
                        .map((ex) => (
                          <tr
                            key={ex.id}
                            className="hover:bg-slate-50/80 dark:hover:bg-zinc-950/20 transition-colors"
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {ex.materia}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-zinc-300">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span>
                                  {new Date(ex.fecha)
                                    .toLocaleString("es-AR", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })
                                    .replace(",", "")}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span
                                  className="font-bold text-black dark:text-white"
                                  style={{ color: darkMode ? undefined : '#000000' }}
                                >
                                  {ex.estado}
                                </span>
                                {ex.instancia && (
                                  <span className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                                    {ex.instancia}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                              {ex.aula || "---"}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setEditingExamenId(ex.id);
                                  setExMateria(ex.materia);
                                  setExFecha(ex.fecha);
                                  setExEstado(ex.estado);
                                  setExInstancia(ex.instancia || "Primero");
                                  setExAula(ex.aula);
                                  setShowExamenModal(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 dark:hover:bg-primary/10 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExamen(ex.id)}
                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary-container dark:hover:bg-primary/10 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

          {activeSubTab === "facultad" && (
            <DriveFolderVisualizer darkMode={darkMode} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add/Edit Materia Modal */}
      {createPortal(
        <AnimatePresence>
          {showMateriaModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (isSaving) return;
                setShowMateriaModal(false);
                setEditingMateriaId(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingMateriaId
                    ? "Editar Información de Materia"
                    : "Agregar Nueva Materia"}
                </h3>
                <button
                  disabled={isSaving}
                  onClick={() => {
                    if (!isSaving) {
                      setShowMateriaModal(false);
                      setEditingMateriaId(null);
                    }
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleAddOrEditMateria} className="space-y-4 pb-1">
                {/* Row 1: Materia Name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Nombre de la Materia
                  </label>
                  <input
                    type="text"
                    value={mMateria}
                    onChange={(e) => setMMateria(e.target.value)}
                    placeholder="Ej: Matemática I"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                    required
                  />
                </div>

                {/* Row 2: Estado & Año */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Estado
                    </label>
                    <CustomSelect
                      value={mEstado}
                      onChange={(val: any) => setMEstado(val)}
                      options={[
                        { value: "Aprobado", label: "Aprobado" },
                        { value: "Regularizado", label: "Regularizado" },
                        { value: "Sin empezar", label: "Sin empezar" },
                      ]}
                      className="w-full"
                      size="sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Año de Cursado
                    </label>
                    <CustomSelect
                      value={mAnoCursado}
                      onChange={(val) => setMAnoCursado(val)}
                      options={[
                        { value: "Primer Año", label: "Primer Año" },
                        { value: "Segundo Año", label: "Segundo Año" },
                        { value: "Tercer Año", label: "Tercer Año" },
                        { value: "Cuarto Año", label: "Cuarto Año" },
                        { value: "Quinto Año", label: "Quinto Año" },
                      ]}
                      className="w-full"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Row 3: Cuatrimestre */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                    Cuatrimestre
                  </label>
                  <CustomSelect
                    value={mCuatrimestre}
                    onChange={(val) => setMCuatrimestre(val)}
                    options={[
                      {
                        value: "Primer Cuatrimestrre",
                        label: "Primer Cuatrimestre",
                      },
                      {
                        value: "Segundo Cuatrimestre",
                        label: "Segundo Cuatrimestre",
                      },
                      { value: "Optativa I", label: "Optativa I" },
                      { value: "Optativa II", label: "Optativa II" },
                    ]}
                    className="w-full"
                    size="sm"
                  />
                </div>

                {/* Row 4: Cursado Debil / Fuerte / Rendir Fuerte */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Cursado (Débil)
                    </label>
                    <MultiSelect
                      value={mCursadoDebil}
                      onChange={(val) => setMCursadoDebil(val)}
                      options={availableMateriaOptions}
                      className="w-full"
                      placeholder="Seleccionar correlativas..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Cursado (Fuerte)
                    </label>
                    <MultiSelect
                      value={mCursadoFuerte}
                      onChange={(val) => setMCursadoFuerte(val)}
                      options={availableMateriaOptions}
                      className="w-full"
                      placeholder="Seleccionar correlativas..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Rendir (Fuerte)
                    </label>
                    <MultiSelect
                      value={mRendirFuerte}
                      onChange={(val) => setMRendirFuerte(val)}
                      options={availableMateriaOptions}
                      className="w-full"
                      placeholder="Seleccionar correlativas..."
                    />
                  </div>
                </div>

                {/* Row 5: Dates (Fecha Regularidad / Vencimiento / Aprobado) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Fecha Regularidad
                    </label>
                    <SmartDateTimePicker
                      value={mFechaRegularidad}
                      onChange={(val) => setMFechaRegularidad(val)}
                      showTimeOption={false}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                      Fecha Vencimiento
                    </label>
                    <SmartDateTimePicker
                      value={mFechaVencimiento}
                      onChange={(val) => setMFechaVencimiento(val)}
                      showTimeOption={false}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                      Fecha Aprobado
                    </label>
                    <SmartDateTimePicker
                      value={mFechaAprobado}
                      onChange={(val) => setMFechaAprobado(val)}
                      showTimeOption={false}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (!isSaving) {
                        setShowMateriaModal(false);
                        setEditingMateriaId(null);
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      editingMateriaId ? "Guardar Cambios" : "Agregar Materia"
                    )}
                  </button>
                </div>
              </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Add Task Modal overlay */}
      {showAddTask &&
        createPortal(
          <div
            onClick={() => {
              if (isSaving) return;
              setShowAddTask(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 cursor-default ${
                darkMode
                  ? "bg-zinc-900 border-zinc-800 text-white"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <h3 className="font-extrabold text-lg">
                Programar Tarea / Examen
              </h3>
              <form onSubmit={handleAddTask} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                    Título de la Actividad
                  </label>
                  <input
                    type="text"
                    disabled={isSaving}
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Ej: Estudiar para final / Proyecto modular"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800 outline-none text-sm disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                    Materia Asociada
                  </label>
                  <CustomSelect
                    disabled={isSaving}
                    value={newTaskSubId}
                    onChange={(val) => setNewTaskSubId(val)}
                    options={[
                      { value: "", label: "Selecciona una Materia" },
                      ...subjects.map((sub) => ({ value: sub.id, label: sub.name })),
                    ]}
                    placeholder="Selecciona una Materia"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                      Fecha de Vencimiento
                    </label>
                    <SmartDateTimePicker
                      value={newTaskDueDate}
                      onChange={(val) => {
                        if (isSaving) return;
                        setNewTaskDueDate(val);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1.5 uppercase">
                      Tipo de Entrega
                    </label>
                    <CustomSelect
                      disabled={isSaving}
                      value={newTaskType}
                      onChange={(val) => setNewTaskType(val as any)}
                      options={[
                        { value: "Tarea", label: "Tarea" },
                        { value: "Examen", label: "Examen" },
                        { value: "Trabajo", label: "Trabajo de investigación" },
                        { value: "Otro", label: "Otro" },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setShowAddTask(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <span>Guardar</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Add/Edit Horario Modal */}
      {createPortal(
        <AnimatePresence>
          {showHorarioModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (isSaving) return;
                setShowHorarioModal(false);
                setEditingHorarioId(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingHorarioId ? "Editar Horario" : "Nuevo Horario"}
                </h3>
                <button
                  disabled={isSaving}
                  onClick={() => {
                    if (!isSaving) {
                      setShowHorarioModal(false);
                      setEditingHorarioId(null);
                    }
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleAddOrEditHorario} className="space-y-4 pb-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Materia
                    </label>
                    <CustomSelect
                      value={hMateria}
                      onChange={(val) => setHMateria(val)}
                      options={[
                        { value: "", label: "Seleccionar Materia..." },
                        ...Array.from(
                          new Set(
                            materiasInfo
                              .filter(
                                (m) =>
                                  getAcademicStatus(m).type === "puede_cursar" ||
                                  m.materia === hMateria,
                              )
                              .map((m) => m.materia),
                          ),
                        )
                          .sort()
                          .map((m) => ({ value: m, label: m })),
                      ]}
                      placeholder="Seleccionar Materia..."
                      className="w-full"
                      size="sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Día
                      </label>
                      <CustomSelect
                        value={hDia}
                        onChange={(val: any) => setHDia(val)}
                        options={[
                          "Lunes",
                          "Martes",
                          "Miércoles",
                          "Jueves",
                          "Viernes",
                          "Sábado",
                        ].map((d) => ({ value: d, label: d }))}
                        placeholder="Día"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Hora Inicio
                      </label>
                      <TimeInput24h
                        disabled={isSaving}
                        value={hHoraInicio}
                        onChange={(val) => setHHoraInicio(val)}
                        placeholder="08:00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Hora Fin
                      </label>
                      <TimeInput24h
                        disabled={isSaving}
                        value={hHoraFin}
                        onChange={(val) => setHHoraFin(val)}
                        placeholder="10:00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Aula/s
                    </label>
                    <input
                      type="text"
                      disabled={isSaving}
                      value={hAulas}
                      onChange={(e) => setHAulas(e.target.value)}
                      placeholder="Ej: Aula 5, Laboratorio B"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Profesor/es
                    </label>
                    <input
                      type="text"
                      disabled={isSaving}
                      value={hProfesores}
                      onChange={(e) => setHProfesores(e.target.value)}
                      placeholder="Ej: Ing. Gómez, Lic. Pérez"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary disabled:opacity-50"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (!isSaving) {
                          setShowHorarioModal(false);
                          setEditingHorarioId(null);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingHorarioId ? "Guardar Cambios" : "Agregar Horario"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* Examenes Modal */}
      {createPortal(
        <AnimatePresence>
          {showExamenModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                if (isSaving) return;
                setShowExamenModal(false);
                setEditingExamenId(null);
              }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-black/85 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden relative cursor-default"
              >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800/40 bg-white dark:bg-black/85 backdrop-blur-md">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingExamenId
                    ? "Editar Examen/Trabajo"
                    : "Nuevo Examen/Trabajo"}
                </h3>
                <button
                  disabled={isSaving}
                  onClick={() => {
                    setShowExamenModal(false);
                    setEditingExamenId(null);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <form onSubmit={handleAddOrEditExamen} className="space-y-4 pb-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Estado
                    </label>
                    <CustomSelect
                      value={exEstado}
                      onChange={(val) => setExEstado(val)}
                      options={[
                        { value: "Parcial", label: "Parcial" },
                        { value: "Recuperatorio", label: "Recuperatorio" },
                        { value: "Extraordinario", label: "Extraordinario" },
                        { value: "Examen Final", label: "Examen Final" },
                      ]}
                      placeholder="Seleccionar Estado"
                      className="w-full"
                      size="sm"
                    />
                  </div>

                  {exEstado !== "Examen Final" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                        Instancia
                      </label>
                      <CustomSelect
                        value={exInstancia}
                        onChange={(val) => setExInstancia(val)}
                        options={[
                          { value: "Primero", label: "Primero" },
                          { value: "Segundo", label: "Segundo" },
                          { value: "Tercero", label: "Tercero" },
                          { value: "Primero/Segundo", label: "Primero/Segundo" },
                          {
                            value: "Trabajo Practico",
                            label: "Trabajo Practico",
                          },
                        ]}
                        placeholder="Seleccionar Instancia"
                        className="w-full"
                        size="sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Materia
                    </label>
                    <CustomSelect
                      value={exMateria}
                      onChange={(val) => setExMateria(val)}
                      options={(() => {
                        if (exEstado === "Examen Final") {
                          return materiasInfo
                            .filter(
                              (m) => getAcademicStatus(m).type === "puede_rendir",
                            )
                            .map((m) => m.materia)
                            .sort()
                            .map((m) => ({ value: m, label: m }));
                        } else {
                          return Array.from(
                            new Set(horarios.map((h) => h.materia)),
                          )
                            .sort()
                            .map((m) => ({ value: m, label: m }));
                        }
                      })()}
                      placeholder="Seleccionar Materia"
                      className="w-full"
                      size="sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Fecha y Hora
                    </label>
                    <SmartDateTimePicker
                      value={exFecha}
                      onChange={setExFecha}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">
                      Aula
                    </label>
                    <input
                      type="text"
                      value={exAula}
                      onChange={(e) => setExAula(e.target.value)}
                      placeholder="Ej. Aula 10, Laboratorio..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all text-sm focus:border-primary"
                      required
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800/40">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setShowExamenModal(false);
                        setEditingExamenId(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{editingExamenId ? "Guardar Cambios" : "Agregar Examen"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    )}

      {/* CUSTOM CONFIRMATION DIALOG MODAL CON ANIMACIÓN & ESTADO ELIMINANDO */}
      <ConfirmationModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || "Confirmar Eliminación"}
        message={confirmModal?.message || "¿Estás seguro de que deseas eliminar este elemento?"}
        onConfirm={async () => {
          if (confirmModal) {
            await confirmModal.onConfirm();
          }
        }}
        onClose={() => setConfirmModal(null)}
        darkMode={darkMode}
      />
    </div>
  );
}
