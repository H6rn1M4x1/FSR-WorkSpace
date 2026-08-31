/**
 * Utility functions for local date formatting and calculations without timezone skew.
 */

export const getLocalDateString = (d: Date = new Date()): string => {
  const offset = d.getTimezoneOffset();
  const withOffset = new Date(d.getTime() - offset * 60 * 1000);
  return withOffset.toISOString().split("T")[0];
};

export const formatLocalDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};
