import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    const q = event.queryStringParameters?.q;
    if (!q || q.trim().length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
      { headers: { "User-Agent": "FSR-Workspace/1.0" } }
    );

    if (!res.ok) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify(Array.isArray(data) ? data : []) };
  } catch (error: any) {
    return { statusCode: 200, body: JSON.stringify([]) };
  }
};
