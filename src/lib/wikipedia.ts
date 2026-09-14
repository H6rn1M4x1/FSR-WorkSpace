/**
 * Fetches a page's thumbnail image from Wikipedia's public REST summary API — free, no key,
 * and CORS-open by design for exactly this kind of client-side use. Used to get official-ish
 * logos/photos for F1 and MotoGP teams and drivers/riders from just their name, instead of
 * hand-picking (and risking broken) direct image URLs for each one.
 */
const cache: Record<string, string | null> = {};

export async function fetchWikiThumbnail(title: string): Promise<string | null> {
  if (title in cache) return cache[title];
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!res.ok) {
      cache[title] = null;
      return null;
    }
    const data = await res.json();
    const url: string | null = data?.thumbnail?.source || data?.originalimage?.source || null;
    cache[title] = url;
    return url;
  } catch (_) {
    cache[title] = null;
    return null;
  }
}
