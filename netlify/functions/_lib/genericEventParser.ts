/**
 * Generic best-effort event/listing parser, shared by scrapers that don't have an official
 * API/RSS to read from instead (San Juan's local agenda, MotoGP's calendar). Tries, in order:
 *   1. schema.org JSON-LD <script type="application/ld+json"> blocks.
 *   2. A framework hydration blob (__NEXT_DATA__ or similar), scanned generically for
 *      date-shaped + title-shaped objects.
 *   3. A plain regex sweep over <table>/<tr> or card-like HTML, as a last resort.
 * Returns [] rather than throwing if nothing matches, so the caller can degrade gracefully.
 */
export interface ParsedEvent {
  title: string;
  rawDate: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
}

export function parseJsonLdEvents(html: string, baseUrl: string): ParsedEvent[] {
  const items: ParsedEvent[] = [];
  const scriptRe = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = scriptRe.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const entries = Array.isArray(parsed) ? parsed : parsed["@graph"] || [parsed];
      for (const entry of entries) {
        if (!entry || (entry["@type"] !== "Event" && entry["@type"] !== "SportsEvent")) continue;
        if (!entry.name) continue;
        items.push({
          title: entry.name,
          rawDate: entry.startDate || null,
          imageUrl: entry.image?.url || entry.image || null,
          sourceUrl: entry.url ? resolveUrl(entry.url, baseUrl) : null,
        });
      }
    } catch (_) {
      // not JSON — ignore
    }
  }
  return items;
}

function resolveUrl(href: string, baseUrl: string): string {
  return href.startsWith("http") ? href : new URL(href, baseUrl).toString();
}

/** Scans a table-based calendar (common for sports-calendar pages) row by row. */
export function parseTableRows(html: string, baseUrl: string): ParsedEvent[] {
  const items: ParsedEvent[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) && items.length < 60) {
    const row = m[1];
    const cells = Array.from(row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((c) =>
      c[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (cells.length < 2) continue;
    const dateMatch = cells.join(" ").match(/(\d{1,2}\s+de\s+\w+|\d{1,2}\/\d{1,2}(\/\d{2,4})?)/i);
    const title = cells.find((c) => c.length > 3 && !/^\d/.test(c));
    if (!title) continue;
    const linkMatch = row.match(/<a[^>]+href="([^"]+)"/i);
    const imgMatch = row.match(/<img[^>]+src="([^"]+)"/i);
    items.push({
      title,
      rawDate: dateMatch ? dateMatch[0] : null,
      imageUrl: imgMatch ? imgMatch[1] : null,
      sourceUrl: linkMatch ? resolveUrl(linkMatch[1], baseUrl) : null,
    });
  }
  return items;
}
