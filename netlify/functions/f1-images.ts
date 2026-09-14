import type { Handler } from "@netlify/functions";

/**
 * Scrapes Formula1.com's own official drivers/teams pages — the source of the transparent
 * cutout driver photos and minimalist team logos used everywhere official. Returns two things:
 *   - teamLogos: specifically the team crest images (the small round logo, top-right of each
 *     team card on /en/teams), identified by their distinctive Cloudinary path
 *     (.../common/f1/<year>/<team-slug>/...logo....webp) — the slug in that path is a much
 *     more reliable id than guessing from alt text.
 *   - images: every other <img src> + alt/title pair, used for driver-photo name matching.
 */
const SOURCES = ["https://www.formula1.com/en/drivers", "https://www.formula1.com/en/teams"];
const TEAM_LOGO_RE = /\/common\/f1\/(\d{4})\/([a-z0-9]+)\/[^"'\s]*logo[^"'\s]*\.(?:webp|png)/i;

export const handler: Handler = async () => {
  const images: { alt: string; src: string }[] = [];
  const teamLogos: Record<string, string> = {};
  const seen = new Set<string>();

  const addMatch = (src: string, alt: string) => {
    const cleanSrc = src.trim();
    if (!cleanSrc || seen.has(cleanSrc)) return;
    seen.add(cleanSrc);

    const logoMatch = cleanSrc.match(TEAM_LOGO_RE);
    if (logoMatch) {
      const slug = logoMatch[2];
      // Prefer a "logowhite" variant if we see more than one for the same team.
      if (!teamLogos[slug] || /logowhite/i.test(cleanSrc)) teamLogos[slug] = cleanSrc;
      return;
    }
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
      // Cloudinary URLs also show up inside srcset attributes and inline JSON — sweep those too.
      const rawUrlRe = /https:\/\/media\.formula1\.com\/image\/upload\/[^"'\s)]+/gi;
      while ((m = rawUrlRe.exec(html))) addMatch(m[0], "");
    } catch (err) {
      console.error(`Error scraping ${url}:`, err);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ images, teamLogos }) };
};
