import type { Handler } from "@netlify/functions";
import { parseJsonLdEvents, parseTableRows } from "./_lib/genericEventParser";

const SOURCE_URL = "https://www.marca.com/motor/motogp/calendario.html";

export const handler: Handler = async () => {
  try {
    const pageRes = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FSRWorkspaceBot/1.0)" },
    });
    if (!pageRes.ok) throw new Error(`marca.com respondió ${pageRes.status}`);
    const html = await pageRes.text();

    let items = parseJsonLdEvents(html, SOURCE_URL);
    if (items.length === 0) items = parseTableRows(html, SOURCE_URL);

    return { statusCode: 200, body: JSON.stringify({ items }) };
  } catch (error: any) {
    console.error("Error in motogp-calendar:", error);
    return { statusCode: 200, body: JSON.stringify({ items: [], error: error?.message }) };
  }
};
