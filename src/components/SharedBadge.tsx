import React from "react";
import { Share2 } from "lucide-react";

/**
 * Small badge shown on any record that is part of a share:
 *  - if it was shared WITH me, it shows who shared it
 *  - if it's mine and I shared it OUT, it just says "Compartido"
 *
 * Renders nothing when the item isn't shared at all, so it's safe to drop into any card.
 */
export const SharedBadge: React.FC<{
  item: any;
  isSharedOut?: boolean;
  sharedOutWith?: string;
  className?: string;
}> = ({ item, isSharedOut, sharedOutWith, className = "" }) => {
  const sharedByEmail = item?.__sharedByEmail;
  const sharedByName = item?.__sharedByName;

  if (sharedByEmail) {
    const label = (sharedByName || sharedByEmail || "").split("@")[0];
    return (
      <span
        title={`Compartido por ${sharedByName || sharedByEmail}`}
        className={`shrink-0 self-center inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-extrabold max-w-[130px] ${className}`}
      >
        <Share2 className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  if (isSharedOut) {
    return (
      <span
        title={sharedOutWith ? `Compartido con ${sharedOutWith}` : "Compartido"}
        className={`shrink-0 self-center inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-extrabold ${className}`}
      >
        <Share2 className="w-2.5 h-2.5 shrink-0" />
        <span>Compartido</span>
      </span>
    );
  }

  return null;
};

/**
 * Helpers so each section can answer "did I share this out, and with whom?" without
 * re-implementing the lookup. Pass the itemsIShared list down from App.
 */
export function makeSharedOutHelpers(itemsIShared: any[] = []) {
  return {
    isSharedOut: (category: string, itemId: string): boolean =>
      itemsIShared.some((s) => s.category === category && s.itemId === itemId),
    sharedOutWith: (category: string, itemId: string): string =>
      itemsIShared
        .filter((s) => s.category === category && s.itemId === itemId)
        .map((s) => s.sharedWithEmail)
        .join(", "),
  };
}
