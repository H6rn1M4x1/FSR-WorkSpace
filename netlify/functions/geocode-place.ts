import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    const q = event.queryStringParameters?.q;
    if (!q || q.trim().length < 2) {
      return { statusCode: 200, body: JSON.stringify({ lat: null, lon: null }) };
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      { headers: { "User-Agent": "FSR-Workspace/1.0" } }
    );

    if (!res.ok) {
      return { statusCode: 200, body: JSON.stringify({ lat: null, lon: null }) };
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ lat: null, lon: null }) };
  } catch (error: any) {
    return { statusCode: 200, body: JSON.stringify({ lat: null, lon: null }) };
  }
};
