import type { Handler } from "@netlify/functions";

const SOURCE_URL = "https://stories.mundodeportivo.com/motor/20260305/56898/escuderias-f-1-2026";

/**
 * Best-effort scrape of the team/driver photos from the article the user pointed at. Pulls
 * every <img src=".."> paired with whatever alt text sits next to it, and hands the raw list
 * back — matching alt text to a specific team/driver name happens client-side (see
 * eventsService.ts), so this stays a dumb, resilient "give me every image + caption" scrape
 * instead of trying to guess this specific page's exact card structure.
 */
export const handler: Handler = async () => {
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FSRWorkspaceBot/1.0)" },
    });
    if (!res.ok) throw new Error(`mundodeportivo.com respondió ${res.status}`);
    const html = await res.text();

    const images: { alt: string; src: string }[] = [];
    const seen = new Set<string>();
    const addMatch = (src: string, alt: string) => {
      const cleanSrc = src.trim();
      if (!cleanSrc || seen.has(cleanSrc)) return;
      seen.add(cleanSrc);
      images.push({ src: cleanSrc, alt: alt.trim() });
    };

    const imgTagRe = /<img\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = imgTagRe.exec(html))) {
      const tag = m[0];
      const src = tag.match(/\bsrc="([^"]+)"/i)?.[1] || tag.match(/\bdata-src="([^"]+)"/i)?.[1];
      const alt = tag.match(/\balt="([^"]*)"/i)?.[1] || "";
      if (src) addMatch(src, alt);
    }

    return { statusCode: 200, body: JSON.stringify({ images }) };
  } catch (error: any) {
    console.error("Error in f1-images:", error);
    return { statusCode: 200, body: JSON.stringify({ images: [], error: error?.message }) };
  }
};
