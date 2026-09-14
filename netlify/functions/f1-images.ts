import type { Handler } from "@netlify/functions";

/**
 * Scrapes Formula1.com's own official drivers/teams pages — the source of the transparent
 * cutout driver photos and minimalist team logos used everywhere official (broadcasts, the
 * F1 app, merchandise), which is what "como aparecen oficialmente" means. Pulls every
 * <img src=".."> paired with its alt/title text from both pages; matching a specific
 * driver/team name to one of these happens client-side (see eventsService.ts).
 */
const SOURCES = ["https://www.formula1.com/en/drivers", "https://www.formula1.com/en/teams"];

export const handler: Handler = async () => {
  const images: { alt: string; src: string }[] = [];
  const seen = new Set<string>();
  const addMatch = (src: string, alt: string) => {
    const cleanSrc = src.trim();
    if (!cleanSrc || seen.has(cleanSrc)) return;
    seen.add(cleanSrc);
    images.push({ src: cleanSrc, alt: alt.trim() });
  };

  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; FSRWorkspaceBot/1.0)" } });
      if (!res.ok) continue;
      const html = await res.text();
      const imgTagRe = /<img\b[^>]*>/gi;
      let m: RegExpExecArray | null;
      while ((m = imgTagRe.exec(html))) {
        const tag = m[0];
        const src = tag.match(/\bsrc="([^"]+)"/i)?.[1] || tag.match(/\bdata-src="([^"]+)"/i)?.[1];
        const alt = tag.match(/\balt="([^"]*)"/i)?.[1] || tag.match(/\btitle="([^"]*)"/i)?.[1] || "";
        if (src) addMatch(src, alt);
      }
    } catch (err) {
      console.error(`Error scraping ${url}:`, err);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ images }) };
};
