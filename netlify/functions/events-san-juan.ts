import type { Handler } from "@netlify/functions";
import { parseSanJuanEvents } from "./_lib/sanJuanParser";

export const handler: Handler = async () => {
  try {
    const pageRes = await fetch("https://sanjuan.yendly.com/este-mes", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FSRWorkspaceBot/1.0)" },
    });
    if (!pageRes.ok) {
      throw new Error(`yendly.com respondió ${pageRes.status}`);
    }
    const html = await pageRes.text();
    const items = parseSanJuanEvents(html);
    return { statusCode: 200, body: JSON.stringify({ items }) };
  } catch (error: any) {
    console.error("Error in events-san-juan:", error);
    return { statusCode: 200, body: JSON.stringify({ items: [], error: error?.message }) };
  }
};
