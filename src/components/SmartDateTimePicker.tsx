import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";

interface PickerSelectProps {
  value: number;
  onChange: (val: number) => void;
  options: { value: number; label: string }[];
  className?: string;
  isMono?: boolean;
}

const PickerSelect: React.FC<PickerSelectProps> = ({
  value,
  onChange,
  options,
  className = "",
  isMono = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector(
        '[data-selected="true"]',
      );
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "center" });
      }
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white font-bold text-xs sm:text-[10px] hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer focus:outline-none shadow-2xs"
      >
        <span className={`capitalize ${isMono ? "font-mono" : ""}`}>
          {selectedOption ? selectedOption.label : value}
        </span>
        <ChevronDown
          className="w-2.5 h-2.5 text-zinc-400 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute z-50 mt-1 min-w-[76px] max-h-40 overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1 left-0 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 origin-top"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-selected={isSelected ? "true" : "false"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1 text-xs sm:text-[10px] font-semibold rounded-lg text-left transition-colors cursor-pointer capitalize ${
                    isSelected
                      ? "bg-primary text-white dark:text-blue-950 font-bold shadow-xs"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  } ${isMono ? "font-mono" : ""}`}
                >
                  <span className="truncate pr-1">{opt.label}</span>
                  {isSelected && <Check className="w-2.5 h-2.5 shrink-0 ml-1" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SmartDateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  showTimeOption?: boolean;
  size?: "sm" | "md";
}

interface PopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  placement: "top" | "bottom";
  isMobile: boolean;
}

export const SmartDateTimePicker: React.FC<SmartDateTimePickerProps> = ({
  value = "",
  onChange,
  className = "",
  required = false,
  id,
  placeholder = "Seleccionar fecha",
  showTimeOption = true,
  size = "md",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);

  // Formato de hora: 12h (AM/PM) o 24h
  const [is12h, setIs12h] = useState(false);

  // Parse current value or default to current date
  const hasTime =
    showTimeOption &&
    (value.includes("T") ||
      (value.includes(" ") && value.split(" ")[1]?.includes(":")));

  let initDate = new Date();
  let initHour = initDate.getHours();
  let initMinute = initDate.getMinutes();

  if (value) {
    const parts = value.split("T");
    const datePart = parts[0];
    const timePart = parts[1] || "";

    const [y, m, d] = datePart.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      initDate = new Date(y, m - 1, d);
    }

    if (timePart) {
      const [h, min] = timePart.split(":").map(Number);
      if (!isNaN(h)) initHour = h;
      if (!isNaN(min)) initMinute = min;
    }
  }

  // Active month/year for navigation in the calendar popover
  const [navMonth, setNavMonth] = useState(initDate.getMonth());
  const [navYear, setNavYear] = useState(initDate.getFullYear());

  // Synchronize calendar view when value updates
  useEffect(() => {
    if (value) {
      const parts = value.split("T");
      const datePart = parts[0];
      const [y, m, d] = datePart.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        setNavMonth(m - 1);
        setNavYear(y);
      }
    }
  }, [value]);

  // Helper to check if the trigger element is still visible in the viewport and inside any scrollable ancestors
  const isTriggerVisible = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();

    // Check if scrolled outside browser window viewport
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    if (
      rect.bottom <= 10 ||
      rect.top >= viewportHeight - 10 ||
      rect.right <= 10 ||
      rect.left >= viewportWidth - 10
    ) {
      return false;
    }

    // Check if element is collapsed
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    // Check scrollable parent containers (such as modal overlays / scroll areas)
    let parent = el.parentElement;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      const style = window.getComputedStyle(parent);
      const isScrollable =
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        style.overflowX === "auto" ||
        style.overflowX === "scroll";

      if (isScrollable) {
        const parentRect = parent.getBoundingClientRect();
        if (
          rect.bottom <= parentRect.top + 8 ||
          rect.top >= parentRect.bottom - 8 ||
          rect.right <= parentRect.left + 8 ||
          rect.left >= parentRect.right - 8
        ) {
          return false;
        }
      }
      parent = parent.parentElement;
    }

    return true;
  };

  const computePopoverPosition = (): PopoverPosition | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

    let popoverWidth: number;
    let left: number;

    if (isMobile) {
      // Clean and centered on mobile devices
      popoverWidth = Math.min(300, window.innerWidth - 32);
      left = Math.max(16, Math.round((window.innerWidth - popoverWidth) / 2));

      const estimatedHeight = hasTime ? 370 : 295;
      const popoverHeight = popoverRef.current?.offsetHeight || estimatedHeight;
      const top = Math.max(16, Math.round((window.innerHeight - popoverHeight) / 2));

      return {
        top,
        left,
        width: popoverWidth,
        placement: "bottom",
        isMobile,
      };
    } else {
      // Desktop: Guarantee ample width (at least 280px) so calendar and time selector are never cramped
      popoverWidth = Math.max(280, rect.width);
      // Ensure left doesn't push popover offscreen
      if (rect.left + popoverWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      } else {
        left = Math.max(16, rect.left);
      }

      const estimatedHeight = hasTime ? 370 : 290;
      const popoverHeight = popoverRef.current?.offsetHeight || estimatedHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Detect before opening if it fits below or should open upwards
      const openUpwards =
        spaceBelow < popoverHeight + 10 && spaceAbove > spaceBelow;

      if (openUpwards) {
        // Position cleanly above the input box (never overlapping)
        return {
          bottom: Math.max(8, window.innerHeight - rect.top + 6),
          left,
          width: popoverWidth,
          placement: "top",
          isMobile: false,
        };
      } else {
        // Position cleanly below the input box (never overlapping)
        return {
          top: rect.bottom + 6,
          left,
          width: popoverWidth,
          placement: "bottom",
          isMobile: false,
        };
      }
    }
  };

  const updatePosition = () => {
    const pos = computePopoverPosition();
    if (pos) {
      setPopoverPosition(pos);
    }
  };

  const handleToggleOpen = () => {
    if (!isOpen) {
      const pos = computePopoverPosition();
      if (pos) {
        setPopoverPosition(pos);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 640;
      if (isDesktop && containerRef.current) {
        if (!isTriggerVisible(containerRef.current)) {
          setIsOpen(false);
          return;
        }
      }
      updatePosition();
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen, hasTime, navMonth, navYear]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const MONTHS_ES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const DAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Generate 42 cells representing the 6-week calendar grid (Monday first)
  const getCalendarCells = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const dayOfWeekIdx = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday...
    const padDays = (dayOfWeekIdx + 6) % 7; // Convert to Monday-first index (0 = Monday, ..., 6 = Sunday)

    const cells = [];

    // 1. Previous month's padding days
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);

    for (let i = padDays - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevMonthYear,
        isCurrentMonth: false,
      });
    }

    // 2. Current month's days
    const daysInCurrentMonth = getDaysInMonth(year, month);
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      cells.push({
        day: i,
        month,
        year,
        isCurrentMonth: true,
      });
    }

    // 3. Next month's padding days to complete only the required full weeks
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    let nextPad = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        day: nextPad++,
        month: nextMonth,
        year: nextMonthYear,
        isCurrentMonth: false,
      });
    }

    return cells;
  };

  const handleDaySelect = (dayNum: number, m: number, y: number) => {
    const paddedM = String(m + 1).padStart(2, "0");
    const paddedD = String(dayNum).padStart(2, "0");
    const dateStr = `${y}-${paddedM}-${paddedD}`;

    if (hasTime) {
      const paddedH = String(initHour).padStart(2, "0");
      const paddedMin = String(initMinute).padStart(2, "0");
      onChange(`${dateStr}T${paddedH}:${paddedMin}`);
    } else {
      onChange(dateStr);
    }
  };

  const handleToggleIncludeTime = () => {
    if (hasTime) {
      const datePart =
        value.split("T")[0] || new Date().toISOString().split("T")[0];
      onChange(datePart);
    } else {
      const datePart = value || new Date().toISOString().split("T")[0];
      const paddedH = String(initHour).padStart(2, "0");
      const paddedMin = String(initMinute).padStart(2, "0");
      onChange(`${datePart}T${paddedH}:${paddedMin}`);
    }
  };

  const handleSetNow = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    if (hasTime) {
      const h = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      onChange(`${dateStr}T${h}:${min}`);
    } else {
      onChange(dateStr);
    }
  };

  const handleTimeChange = (type: "hour" | "minute", val: number) => {
    const datePart =
      value.split("T")[0] || new Date().toISOString().split("T")[0];
    let h = initHour;
    let m = initMinute;

    if (type === "hour") {
      h = Math.max(0, Math.min(23, val));
    } else {
      m = Math.max(0, Math.min(59, val));
    }

    const paddedH = String(h).padStart(2, "0");
    const paddedMin = String(m).padStart(2, "0");
    onChange(`${datePart}T${paddedH}:${paddedMin}`);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const prevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(navYear - 1);
    } else {
      setNavMonth(navMonth - 1);
    }
  };

  const nextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(navYear + 1);
    } else {
      setNavMonth(navMonth + 1);
    }
  };

  // Helper formatting for main preview input
  const formatDisplay = () => {
    if (!value) return "";
    const parts = value.split("T");
    const datePart = parts[0];
    const timePart = parts[1] || "";

    const [y, m, d] = datePart.split("-").map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return value;

    const pad = (num: number) => String(num).padStart(2, "0");
    let str = `${pad(d)}/${pad(m)}/${y}`;

    if (hasTime && timePart) {
      let [h, min] = timePart.split(":").map(Number);
      if (isNaN(h)) h = 0;
      if (isNaN(min)) min = 0;

      const minStr = String(min).padStart(2, "0");

      if (is12h) {
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        str += ` ${h12}:${minStr} ${ampm}`;
      } else {
        str += ` ${String(h).padStart(2, "0")}:${minStr}`;
      }
    }
    return str;
  };

  const isSelectedCell = (day: number, m: number, y: number) => {
    if (!value) return false;
    const datePart = value.split("T")[0];
    const [selY, selM, selD] = datePart.split("-").map(Number);
    return day === selD && m === selM - 1 && y === selY;
  };

  const isTodayCell = (day: number, m: number, y: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      m === today.getMonth() &&
      y === today.getFullYear()
    );
  };

  const cells = getCalendarCells(navYear, navMonth);

  return (
    <div className={`relative w-full ${className}`} id={id} ref={containerRef}>
      {/* Target Trigger Input */}
      <div
        onClick={handleToggleOpen}
        className="relative flex items-center group w-full cursor-pointer"
      >
        <div className={`absolute ${size === "sm" ? "left-2" : "left-2.5"} text-slate-400 dark:text-zinc-500 group-hover:text-primary dark:group-hover:text-primary transition-colors pointer-events-none`}>
          {hasTime ? (
            <Clock className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          ) : (
            <Calendar className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          )}
        </div>
        <input
          type="text"
          readOnly
          value={formatDisplay()}
          placeholder={placeholder}
          title={formatDisplay()}
          className={`w-full ${size === "sm" ? "pl-7 pr-2 h-[34px] rounded-xl text-xs" : "pl-8 pr-3 h-[42px] rounded-xl text-xs md:text-sm"} border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-black/50 text-slate-900 dark:text-white outline-none font-semibold focus:border-primary dark:focus:border-primary hover:border-slate-300 dark:hover:border-zinc-700 transition-all cursor-pointer`}
        />
      </div>

      {/* CUSTOM POPOVER DIALOG */}
      {createPortal(
        <AnimatePresence>
          {isOpen && popoverPosition && (
            <>
              {/* Subtle backdrop overlay on mobile to focus modal and prevent accidental taps */}
              {popoverPosition.isMobile && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[99998]"
                />
              )}
              <motion.div
                ref={popoverRef}
                initial={{
                  opacity: 0,
                  scale: 0.95,
                  y: popoverPosition.isMobile ? 0 : popoverPosition.placement === "top" ? 4 : -4,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  y: popoverPosition.isMobile ? 0 : popoverPosition.placement === "top" ? 4 : -4,
                }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
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
                className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 shadow-2xl text-zinc-900 dark:text-zinc-100 flex flex-col gap-1.5 font-sans select-none datetime-picker-popover"
              >
                {/* Month and Year Navigation */}
                <div className="flex items-center justify-between px-0.5 gap-1 py-0.5">
                  <div className="flex items-center gap-1">
                    <PickerSelect
                      value={navMonth}
                      onChange={(m) => setNavMonth(m)}
                      options={MONTHS_ES.map((m, idx) => ({
                        value: idx,
                        label: m.substring(0, 3),
                      }))}
                    />

                    <PickerSelect
                      value={navYear}
                      onChange={(y) => setNavYear(y)}
                      options={Array.from(
                        { length: 135 },
                        (_, i) => new Date().getFullYear() + 5 - i,
                      ).map((y) => ({
                        value: y,
                        label: String(y),
                      }))}
                      isMono={true}
                    />
                  </div>

                  <div className="flex items-center gap-1 text-zinc-400">
                    <button
                      type="button"
                      onClick={handleSetNow}
                      className="text-[10px] sm:text-[9px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-2 sm:px-1.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer leading-none"
                    >
                      {hasTime ? "Ahora" : "Hoy"}
                    </button>
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </button>
                  </div>
                </div>

                {/* 3. Days of the Week headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-[8.5px] font-bold text-slate-400 dark:text-zinc-500 py-0.5 leading-tight">
                  {DAYS_ES.map((d) => (
                    <div key={d} className="py-0.5">
                      {d}
                    </div>
                  ))}
                </div>

                {/* 4. Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-y-1 sm:gap-x-0.5 text-center font-semibold">
                  {cells.map((cell, idx) => {
                    const selected = isSelectedCell(
                      cell.day,
                      cell.month,
                      cell.year,
                    );
                    const isToday = isTodayCell(cell.day, cell.month, cell.year);
                    return (
                      <div
                        key={idx}
                        onClick={() =>
                          handleDaySelect(cell.day, cell.month, cell.year)
                        }
                        className={`h-7 sm:h-6.5 w-full flex items-center justify-center rounded-full cursor-pointer transition-all text-[11px] sm:text-[9.5px] leading-none ${
                          selected
                            ? "bg-primary text-white dark:text-blue-950 font-extrabold shadow-xs"
                            : isToday
                              ? "bg-slate-100 dark:bg-slate-800 text-primary font-bold border border-primary/50"
                              : cell.isCurrentMonth
                                ? "text-zinc-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                : "text-zinc-400 dark:text-zinc-600 hover:bg-slate-100/50 dark:hover:bg-zinc-900/40"
                        }`}
                      >
                        {cell.day}
                      </div>
                    );
                  })}
                </div>

                {/* 5. Custom Controls: Incluir la hora (Conditional) */}
                {showTimeOption && (
                  <>
                    {/* Divider line */}
                    <div className="border-t border-slate-100 dark:border-zinc-800 my-0.5"></div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-[11px] sm:text-[9.5px] font-bold text-zinc-700 dark:text-zinc-300">
                          Incluir la hora
                        </span>
                        <button
                          type="button"
                          onClick={handleToggleIncludeTime}
                          className={`relative inline-flex h-4.5 sm:h-4 w-8 sm:w-7 shrink-0 items-center cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                            hasTime ? "bg-primary" : "bg-slate-200 dark:bg-zinc-800"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-3.5 w-3.5 sm:h-3 sm:w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              hasTime ? "translate-x-3.5 sm:translate-x-3" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Custom Time Selector Wheels/inputs (appears when hasTime) */}
                      {hasTime && (
                        <div className="flex items-center gap-3 justify-center bg-slate-50 dark:bg-zinc-900/90 py-2 px-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] sm:text-[8px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">
                              Hora
                            </span>
                            <div className="flex items-center">
                              <input
                                type="number"
                                min={0}
                                max={23}
                                value={String(initHour).padStart(2, "0")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleTimeChange(
                                    "hour",
                                    isNaN(val) ? 0 : Math.min(23, Math.max(0, val))
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    handleTimeChange("hour", (initHour + 1) % 24);
                                  } else if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    handleTimeChange("hour", (initHour - 1 + 24) % 24);
                                  }
                                }}
                                className="w-14 sm:w-12 h-8 text-center bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 font-mono text-sm sm:text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                              />
                            </div>
                          </div>

                          <span className="text-zinc-400 font-mono mt-3 text-sm font-bold">:</span>

                          <div className="flex flex-col items-center">
                            <span className="text-[9px] sm:text-[8px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">
                              Minuto
                            </span>
                            <div className="flex items-center">
                              <input
                                type="number"
                                min={0}
                                max={59}
                                value={String(initMinute).padStart(2, "0")}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleTimeChange(
                                    "minute",
                                    isNaN(val) ? 0 : Math.min(59, Math.max(0, val))
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    handleTimeChange("minute", (initMinute + 1) % 60);
                                  } else if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    handleTimeChange("minute", (initMinute - 1 + 60) % 60);
                                  }
                                }}
                                className="w-14 sm:w-12 h-8 text-center bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 font-mono text-sm sm:text-xs font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs"
                              />
                            </div>
                          </div>

                          {is12h && (
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] sm:text-[8px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">
                                Periodo
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const isPm = initHour >= 12;
                                  if (isPm) {
                                    handleTimeChange("hour", initHour - 12);
                                  } else {
                                    handleTimeChange("hour", initHour + 12);
                                  }
                                }}
                                className="px-2.5 h-8 text-xs font-bold rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-slate-200 dark:border-zinc-700 uppercase cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors flex items-center shadow-2xs"
                              >
                                {initHour >= 12 ? "PM" : "AM"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 6. Action Buttons: Borrar & Aceptar */}
                <div className="border-t border-slate-100 dark:border-zinc-800 my-0.5"></div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex-1 py-1.5 rounded-xl hover:bg-red-500/10 text-red-500 hover:text-red-600 dark:text-red-400 text-xs sm:text-[10px] font-bold transition-all text-center cursor-pointer border border-transparent hover:border-red-500/20"
                  >
                    Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-1.5 rounded-xl bg-primary text-white dark:text-blue-950 text-xs sm:text-[10px] font-bold transition-all text-center cursor-pointer shadow-xs hover:brightness-105 active:scale-98"
                  >
                    Aceptar
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};
