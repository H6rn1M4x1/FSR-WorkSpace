/**
 * Number formatting and parsing utilities for Spanish/Argentine locale:
 * - Thousands separator: dot ('.')
 * - Decimal separator: comma (',')
 */

/**
 * Parses any numeric or formatted string to a standard Javascript float.
 * Handles: "222.222,25" -> 222222.25, "1234.56" -> 1234.56, "1.000" -> 1000, 45.5 -> 45.5
 */
export function parseFormattedNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;

  const str = String(value).trim();
  if (!str) return 0;

  // If contains comma, everything before comma is integer, after is decimal
  if (str.includes(",")) {
    const parts = str.split(",");
    const intClean = parts[0].replace(/\D/g, "");
    const decClean = parts.slice(1).join("").replace(/\D/g, "");
    const n = parseFloat(`${intClean || "0"}.${decClean || "0"}`);
    return isNaN(n) ? 0 : n;
  }

  // If no comma, remove any thousand separator dots
  const clean = str.replace(/\./g, "").replace(/\s/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

/**
 * Formats a raw user input string as they type:
 * - Inserts dots ('.') every 3 integer digits from right to left
 * - Keeps comma (',') as the decimal separator ONLY when present/placed
 * - Constrains decimal digits to maxDecimals (default 2)
 */
export function formatRawInputToES(rawValue: string, maxDecimals = 2): string {
  if (rawValue === null || rawValue === undefined) return "";
  const str = String(rawValue).trim();
  if (!str) return "";

  const commaIndex = str.indexOf(",");

  if (commaIndex !== -1) {
    const beforeComma = str.slice(0, commaIndex);
    const afterComma = str.slice(commaIndex + 1);

    // Clean digits before comma (removes existing dots/spaces)
    const intDigits = beforeComma.replace(/\D/g, "");
    // Clean digits after comma
    const decDigits = afterComma.replace(/\D/g, "").slice(0, maxDecimals);

    let formattedInt = "";
    if (intDigits) {
      const cleanLeading = intDigits.length > 1 ? intDigits.replace(/^0+(?=\d)/, "") : intDigits;
      formattedInt = cleanLeading.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } else {
      formattedInt = "0";
    }

    return `${formattedInt},${decDigits}`;
  }

  // No comma present -> purely integer format with dots
  const intDigits = str.replace(/\D/g, "");
  if (!intDigits) return "";

  const cleanLeading = intDigits.length > 1 ? intDigits.replace(/^0+(?=\d)/, "") : intDigits;
  return cleanLeading.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formats a numeric value (e.g. 222222.2 or 45.5) for initial display in an input or label.
 * e.g. 222222.2 -> "222.222,2"
 */
export function formatNumberToDisplay(
  value: number | string | null | undefined,
  decimals = 2,
  minDecimals = 0
): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : parseFormattedNumber(String(value));
  if (isNaN(num)) return "";

  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
