import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { formatRawInputToES, parseFormattedNumber, formatNumberToDisplay } from "../lib/numberFormat";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string | number | null | undefined;
  onChange?: (formattedValue: string) => void;
  onValueChange?: (formattedValue: string, numericValue: number) => void;
  maxDecimals?: number;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      maxDecimals = 2,
      placeholder = "0,00",
      className = "",
      disabled,
      ...rest
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLInputElement | null>(null);
    const cursorPositionRef = useRef<number | null>(null);

    // Format initial / controlled value
    const getFormattedValue = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined || val === "") return "";
      if (typeof val === "number") {
        return formatNumberToDisplay(val, maxDecimals, 0);
      }
      return formatRawInputToES(String(val), maxDecimals);
    };

    const [displayVal, setDisplayVal] = useState<string>(() => getFormattedValue(value));

    // Keep displayVal in sync when external value prop changes
    useEffect(() => {
      const formatted = getFormattedValue(value);
      setDisplayVal(formatted);
    }, [value, maxDecimals]);

    // Restore cursor position after formatting update
    useLayoutEffect(() => {
      if (cursorPositionRef.current !== null && internalRef.current) {
        const pos = Math.min(cursorPositionRef.current, internalRef.current.value.length);
        internalRef.current.setSelectionRange(pos, pos);
        cursorPositionRef.current = null;
      }
    }, [displayVal]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let rawInput = e.target.value;
      const inputEl = e.target;
      const selectionStart = inputEl.selectionStart || 0;

      // Handle typing decimal separator (comma or dot from numpad)
      const commaIndexInRaw = rawInput.indexOf(",");
      const isAfterComma = commaIndexInRaw !== -1 && selectionStart > commaIndexInRaw;

      // Count digits before cursor
      let intDigitsBeforeCursor = 0;
      let decDigitsBeforeCursor = 0;

      if (!isAfterComma) {
        const textBefore = commaIndexInRaw !== -1 
          ? rawInput.slice(0, Math.min(selectionStart, commaIndexInRaw)) 
          : rawInput.slice(0, selectionStart);
        intDigitsBeforeCursor = textBefore.replace(/\D/g, "").length;
      } else {
        const textBeforeComma = rawInput.slice(0, commaIndexInRaw);
        intDigitsBeforeCursor = textBeforeComma.replace(/\D/g, "").length;
        const textAfterCommaBeforeCursor = rawInput.slice(commaIndexInRaw + 1, selectionStart);
        decDigitsBeforeCursor = textAfterCommaBeforeCursor.replace(/\D/g, "").length;
      }

      // Format the input
      const formatted = formatRawInputToES(rawInput, maxDecimals);
      setDisplayVal(formatted);

      // Compute exact new cursor position in formatted string
      let newCursorPos = 0;
      if (!isAfterComma) {
        if (intDigitsBeforeCursor === 0) {
          newCursorPos = 0;
        } else {
          let count = 0;
          for (let i = 0; i < formatted.length; i++) {
            if (formatted[i] === ",") {
              // Reached decimal part
              newCursorPos = i;
              break;
            }
            if (/\d/.test(formatted[i])) {
              count++;
              if (count === intDigitsBeforeCursor) {
                newCursorPos = i + 1;
                break;
              }
            }
          }
          if (count < intDigitsBeforeCursor) {
            const cIdx = formatted.indexOf(",");
            newCursorPos = cIdx !== -1 ? cIdx : formatted.length;
          }
        }
      } else {
        const formattedCommaIdx = formatted.indexOf(",");
        if (formattedCommaIdx === -1) {
          newCursorPos = formatted.length;
        } else if (decDigitsBeforeCursor === 0) {
          // Caret was placed directly after the comma
          newCursorPos = formattedCommaIdx + 1;
        } else {
          const decPart = formatted.slice(formattedCommaIdx + 1);
          let count = 0;
          let offsetInDec = decPart.length;
          for (let i = 0; i < decPart.length; i++) {
            if (/\d/.test(decPart[i])) {
              count++;
              if (count === decDigitsBeforeCursor) {
                offsetInDec = i + 1;
                break;
              }
            }
          }
          newCursorPos = formattedCommaIdx + 1 + offsetInDec;
        }
      }

      cursorPositionRef.current = newCursorPos;

      // Trigger callbacks
      if (onChange) {
        onChange(formatted);
      }
      if (onValueChange) {
        onValueChange(formatted, parseFormattedNumber(formatted));
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // If user types '.' or ',', ensure smooth decimal entry
      if (e.key === "." || e.key === ",") {
        const inputEl = internalRef.current;
        if (inputEl) {
          const val = inputEl.value;
          // If already has comma, prevent adding another
          if (val.includes(",")) {
            e.preventDefault();
            // If user types comma again, move cursor after existing comma
            const commaIdx = val.indexOf(",");
            inputEl.setSelectionRange(commaIdx + 1, commaIdx + 1);
            return;
          }

          // If user pressed '.', change it to ',' seamlessly
          if (e.key === ".") {
            e.preventDefault();
            const start = inputEl.selectionStart || 0;
            const end = inputEl.selectionEnd || 0;
            const newVal = val.slice(0, start) + "," + val.slice(end);
            
            const event = {
              target: { value: newVal, selectionStart: start + 1 },
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            
            handleInputChange(event);
            return;
          }
        }
      }
      if (rest.onKeyDown) {
        rest.onKeyDown(e);
      }
    };

    return (
      <input
        {...rest}
        ref={(el) => {
          internalRef.current = el;
          if (typeof forwardedRef === "function") {
            forwardedRef(el);
          } else if (forwardedRef) {
            (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
          }
        }}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={displayVal}
        placeholder={placeholder}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={className}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;
