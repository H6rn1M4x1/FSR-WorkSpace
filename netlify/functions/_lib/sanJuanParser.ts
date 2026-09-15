/**
 * Best-effort parser for yendly.com's event listing. There's no official API/RSS, so this
 * tries, in order, the most-to-least reliable sources of the same data:
 *   1. schema.org JSON-LD <script type="application/ld+json"> blocks (many event sites embed
 *      these for SEO/rich snippets — when present they're clean, structured JSON).
 *   2. A Next.js-style __NEXT_DATA__ script tag, scanned generically for event-shaped objects
 *      (anything with a name/title + a date-ish field).
 *   3. A plain regex sweep over rendered <a href="/eventos/{id}">...</a> cards, as a last
 *      resort against raw HTML. Each card's inner markup is split into "text runs" (the text
 *      between tag boundaries) rather than read as one flattened `textContent`, because the
 *      site renders venue / title / date as separate sibling elements with no whitespace
 *      between them — flattening them first would glue e.g. "Velódromo...ChancayDia 16 -
 *      Campeonato..." into one unreadable string.
 * Whichever strategy finds something first wins; if none do, it returns an empty list rather
 * than throwing, so the rest of the Eventos tab keeps working either way.
 */
export function parseSanJuanEvents(html: string): any[] {
  const fromJsonLd = parseSanJuanFromJsonLd(html);
  if (fromJsonLd.length > 0) return fromJsonLd;

  const fromNextData = parseSanJuanFromNextData(html);
  if (fromNextData.length > 0) return fromNextData;

  return parseSanJuanFromCards(html);
}

function absolutizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("data:")) return null; // inline placeholder, not a real image
  return `https://sanjuan.yendly.com${url.startsWith("/") ? "" : "/"}${url}`;
}

function toEventItem(href: string, title: string, rawDate?: string | null, imageUrl?: string | null) {
  return {
    id: `sj_${Buffer.from(href || title).toString("base64").slice(0, 16)}`,
    title: title.trim(),
    rawDate: rawDate || null,
    imageUrl: absolutizeUrl(imageUrl),
    sourceUrl: absolutizeUrl(href),
  };
}

function parseSanJuanFromJsonLd(html: string): any[] {
  const items: any[] = [];
  const scriptRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const entries = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
      for (const entry of entries) {
        if (!entry || entry["@type"] !== "Event") continue;
        const title = entry.name;
        if (!title) continue;
        const loc = entry.location?.name || entry.location?.address?.addressLocality || null;
        items.push({
          ...toEventItem(entry.url, title, entry.startDate, entry.image?.url || entry.image || null),
          location: loc,
        });
      }
    } catch (_) {
      // not valid JSON — ignore this block
    }
  }
  return items;
}

function parseSanJuanFromNextData(html: string): any[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return [];
  let data: any;
  try {
    data = JSON.parse(match[1]);
  } catch (_) {
    return [];
  }

  const found: any[] = [];
  const dateKeyRe = /^(date|start|startDate|fecha|fechaInicio)$/i;
  const titleKeyRe = /^(title|name|nombre|titulo)$/i;
  const visited = new Set<any>();

  const walk = (node: any) => {
    if (!node || typeof node !== "object" || visited.has(node) || found.length >= 60) return;
    visited.add(node);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const titleKey = Object.keys(node).find((k) => titleKeyRe.test(k));
    const dateKey = Object.keys(node).find((k) => dateKeyRe.test(k));
    if (titleKey && typeof node[titleKey] === "string" && node[titleKey].length > 2) {
      const href = node.url || node.slug || node.link || "";
      const img = node.image || node.imageUrl || node.cover || null;
      found.push(toEventItem(String(href), node[titleKey], dateKey ? String(node[dateKey]) : null, img ? String(img) : null));
    }
    Object.values(node).forEach(walk);
  };
  walk(data);
  return found;
}

// Matches a date/time-ish fragment: "14/09/2026", "16 de marzo", "Dia 16", "Día 16", or a
// weekday abbreviation like "Lun, 14 sept, 20:00 hs".
const DATE_RUN_RE =
  /(\d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{1,2}\s+de\s+\w+|d[ií]a\s+\d{1,2}|^(lun|mar|mi[eé]|jue|vie|s[aá]b|dom)[,.]?\s)/i;

// The subset of date runs that EventsView's own `guessIsoDate()` (dd/mm[/yyyy] or "dd de mes")
// can actually turn into a real calendar date — prefer these over e.g. "Lun, 14 sept, 20:00 hs",
// which reads fine but has no ISO-parseable shape.
const STRICT_DATE_RE = /\d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{1,2}\s+de\s+\w+/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits a card's inner HTML into the text found between tag boundaries, dropping empties. */
function extractTextRuns(blockHtml: string): string[] {
  const cleaned = blockHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  return cleaned
    .split(/<[^>]+>/)
    .map(decodeEntities)
    .filter((s) => s.length > 0);
}

/**
 * Next.js sites commonly lazy-load card images: `src` holds a tiny base64 blur placeholder
 * (or is left empty) while the real URL sits in `data-src`/`data-original` or as the first
 * candidate in `srcset`. Prefer those over a placeholder `src`, which is what rendered as a
 * broken-image icon in the app (a base64 data URI, or a relative path resolved against the
 * app's own origin instead of yendly.com's).
 */
function extractImageUrl(block: string): string | null {
  const dataSrc = block.match(/<img[^>]+data-src="([^"]+)"/i) || block.match(/<img[^>]+data-original="([^"]+)"/i);
  if (dataSrc) return dataSrc[1];

  const srcset = block.match(/<img[^>]+srcset="([^"]+)"/i);
  if (srcset) {
    const first = srcset[1].split(",")[0].trim().split(/\s+/)[0];
    if (first) return first;
  }

  const src = block.match(/<img[^>]+src="([^"]+)"/i);
  if (src && !src[1].startsWith("data:")) return src[1];

  return null;
}

function parseSanJuanFromCards(html: string): any[] {
  const items: any[] = [];
  const cardRe = /<a[^>]+href="([^"]*\/eventos\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) && items.length < 60) {
    const href = m[1];
    const block = m[2];
    if (seen.has(href)) continue;
    seen.add(href);

    const imageUrl = extractImageUrl(block);
    const altMatch = block.match(/alt="([^"]+)"/i);
    const headingMatch = block.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);

    const runs = extractTextRuns(block);
    const dateRuns = runs.filter((r) => DATE_RUN_RE.test(r));
    const nonDateRuns = runs.filter((r) => !DATE_RUN_RE.test(r));

    // Title: prefer an explicit heading if the markup has one; otherwise the site renders
    // venue then title as the first two non-date text runs, in that order — so fall back to
    // "second non-date run" (or the only one, if just one is present) rather than picking
    // "whichever run happens to be longest", which misfires when the venue name outruns a
    // short title (e.g. "Mendoza Nte. 27o" vs. "Torneo de Truco").
    let title = headingMatch ? decodeEntities(headingMatch[1].replace(/<[^>]+>/g, "")) : null;
    if (!title) {
      if (nonDateRuns.length >= 2) title = nonDateRuns[1];
      else if (nonDateRuns.length === 1) title = nonDateRuns[0];
    }
    if (!title && altMatch) title = altMatch[1].trim();
    if (!title) continue;

    const location = nonDateRuns.find((r) => r !== title) || null;
    const rawDate = dateRuns.find((r) => STRICT_DATE_RE.test(r)) || dateRuns.sort((a, b) => b.length - a.length)[0] || null;

    items.push({ ...toEventItem(href, title, rawDate, imageUrl), location });
  }
  return items;
}
