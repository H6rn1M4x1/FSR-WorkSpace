/**
 * Best-effort parser for yendly.com's event listing. There's no official API/RSS, so this
 * tries, in order, the most-to-least reliable sources of the same data:
 *   1. schema.org JSON-LD <script type="application/ld+json"> blocks (many event sites embed
 *      these for SEO/rich snippets — when present they're clean, structured JSON).
 *   2. A Next.js-style __NEXT_DATA__ script tag, scanned generically for event-shaped objects
 *      (anything with a name/title + a date-ish field).
 *   3. A plain regex sweep over rendered <a href=".../evento/...">...</a> cards, as a last
 *      resort against raw HTML.
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

function toEventItem(href: string, title: string, rawDate?: string | null, imageUrl?: string | null) {
  return {
    id: `sj_${Buffer.from(href || title).toString("base64").slice(0, 16)}`,
    title: title.trim(),
    rawDate: rawDate || null,
    imageUrl: imageUrl || null,
    sourceUrl: href ? (href.startsWith("http") ? href : `https://sanjuan.yendly.com${href}`) : null,
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

function parseSanJuanFromCards(html: string): any[] {
  const items: any[] = [];
  const cardRe = /<a[^>]+href="([^"]*\/evento\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) && items.length < 60) {
    const href = m[1];
    const block = m[2];
    if (seen.has(href)) continue;
    seen.add(href);

    const titleMatch = block.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i) || block.match(/alt="([^"]+)"/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : null;
    if (!title) continue;

    const imgMatch = block.match(/<img[^>]+src="([^"]+)"/i);
    const dateMatch = block.match(/(\d{1,2}\s+de\s+\w+|\d{1,2}\/\d{1,2}(\/\d{2,4})?)/i);

    items.push(toEventItem(href, title, dateMatch ? dateMatch[0] : null, imgMatch ? imgMatch[1] : null));
  }
  return items;
}
