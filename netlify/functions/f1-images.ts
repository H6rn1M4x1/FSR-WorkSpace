import type { Handler } from "@netlify/functions";

/**
 * Scrapes formula1.com/en/drivers for driver photos (the official transparent cutouts) —
 * matched by name client-side (see eventsService.ts). Team logos don't need this: they're a
 * fixed, known-good Cloudinary URL per team (see data/f1.ts), given directly by the user.
 */
const SOURCE_URL = "https://www.formula1.com/en/drivers";

export const handler: Handler = async () => {
  const images: { alt: string; src: string }[] = [];
  const seen = new Set<string>();
  const addMatch = (src: string, alt: string) => {
    const cleanSrc = src.trim();
    if (!cleanSrc || seen.has(cleanSrc)) return;
    seen.add(cleanSrc);
    images.push({ src: cleanSrc, alt: alt.trim() });
  };

  try {
    const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0 (compatible; FSRWorkspaceBot/1.0)" } });
    if (res.ok) {
      const html = await res.text();
      const imgTagRe = /<img\b[^>]*>/gi;
      let m: RegExpExecArray | null;
      while ((m = imgTagRe.exec(html))) {
        const tag = m[0];
        const src = tag.match(/\bsrc="([^"]+)"/i)?.[1] || tag.match(/\bdata-src="([^"]+)"/i)?.[1];
        const alt = tag.match(/\balt="([^"]*)"/i)?.[1] || tag.match(/\btitle="([^"]*)"/i)?.[1] || "";
        if (src) addMatch(src, alt);
      }
    }
  } catch (err) {
    console.error(`Error scraping ${SOURCE_URL}:`, err);
  }

  return { statusCode: 200, body: JSON.stringify({ images }) };
};
