/**
 * Fetches a page's thumbnail image from Wikipedia's public REST summary API — free, no key,
 * and CORS-open by design for exactly this kind of client-side use. Used to get official-ish
 * logos/photos for F1 and MotoGP teams and drivers/riders from just their name, instead of
 * hand-picking (and risking broken) direct image URLs for each one.
 */
const cache: Record<string, string | null> = {};

async function fetchSummaryThumbnail(title: string): Promise<string | null> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.thumbnail?.source || data?.originalimage?.source || null;
}

/**
 * Busca el título real de la página de Wikipedia más parecido a `title` cuando no hay una
 * coincidencia exacta — necesario, por ejemplo, para nombres de carreras de F1 que traen el
 * nombre del sponsor incluido (ej. "MSC Cruises Barcelona-Catalunya Grand Prix"), que nunca
 * matchea el título exacto de la página real ("Circuit de Barcelona-Catalunya").
 */
async function fetchClosestWikiTitle(title: string): Promise<string | null> {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(title)}&limit=1&namespace=0&format=json&origin=*`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[1]?.[0] || null;
}

export async function fetchWikiThumbnail(title: string): Promise<string | null> {
  if (title in cache) return cache[title];
  try {
    let url = await fetchSummaryThumbnail(title);
    if (!url) {
      const closest = await fetchClosestWikiTitle(title);
      if (closest && closest !== title) url = await fetchSummaryThumbnail(closest);
    }
    cache[title] = url;
    return url;
  } catch (_) {
    cache[title] = null;
    return null;
  }
}
