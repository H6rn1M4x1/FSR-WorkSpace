import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

// El SDK de Gemini tira el error crudo de la API como mensaje (un JSON anidado tipo
// {"error":{"code":429,"status":"RESOURCE_EXHAUSTED",...}}) — mostrarlo tal cual al usuario (o
// peor, leérselo en voz alta en Jarvis) es ilegible. Se detecta acá para devolver un mensaje
// entendible, y para no reintentar con el modelo liviano cuando la cuota ya está agotada: ese
// reintento fallaría exactamente igual (la cuota es de la clave/proyecto, no del modelo puntual),
// solo suma espera antes de devolver el mismo resultado.
function isQuotaExhaustedError(e: any): boolean {
  const msg = typeof e?.message === "string" ? e.message : "";
  return e?.status === 429 || e?.code === 429 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes('"code":429');
}

function friendlyErrorMessage(e: any): string {
  if (isQuotaExhaustedError(e)) {
    return "Se agotó la cuota de uso de la IA por ahora. Probá de nuevo más tarde.";
  }
  return (typeof e?.message === "string" && e.message) || "Error al comunicarse con Gemini.";
}

// Si la cuota de Gemini está agotada (afecta a la clave/proyecto entero, no a un modelo puntual),
// probamos un modelo gratuito de respaldo en OpenRouter antes de rendirnos, para que Jarvis y
// Viernes sigan respondiendo. Sin OPENROUTER_API_KEY configurada (o si también falla), devuelve
// null y el flujo normal cae en el error de cuota de siempre. Limitación: este camino no tiene
// búsqueda en internet (es específica de Gemini) — se le avisa al modelo para que no invente
// haber buscado algo — y no reenvía archivos adjuntos.
async function callOpenRouterFallback(
  message: string,
  history: any,
  systemInstruction?: string
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  try {
    const messages: any[] = [
      {
        role: "system",
        content:
          (systemInstruction || "") +
          " No tenés acceso a búsqueda en internet en este modo de respaldo: respondé solo con lo que ya sabés, y si la pregunta depende de información muy reciente o cambiante, aclaralo en vez de inventar una respuesta.",
      },
    ];
    if (Array.isArray(history)) {
      history.forEach((msg: any) => {
        messages.push({ role: msg.role === "user" ? "user" : "assistant", content: String(msg.text || "") });
      });
    }
    messages.push({ role: "user", content: message });

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openrouter/free", messages }),
    });
    if (!resp.ok) return null;
    const data: any = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text : null;
  } catch {
    return null;
  }
}

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Falta la clave GEMINI_API_KEY. Configúrala en las variables de entorno de Netlify.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { message, history, model, systemInstruction, enableSearch, enableMaps, userLocation, files } = body;

    if (!message || typeof message !== "string") {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta el mensaje." }) };
    }

    const ai = getGeminiClient();
    const selectedModel = model || "gemini-3.5-flash";
    const tools: any[] = [];

    if (enableSearch) {
      tools.push({ googleSearch: {} });
    } else if (enableMaps) {
      tools.push({ googleMaps: {} });
    }

    const toolConfig: any = {};
    if (enableMaps && userLocation) {
      toolConfig.retrievalConfig = {
        latLng: {
          latitude: parseFloat(userLocation.latitude),
          longitude: parseFloat(userLocation.longitude),
        },
      };
    }

    const config: any = {
      // Sin esto, los modelos "flash" de la familia 3.x gastan varios segundos de "pensamiento"
      // interno antes de responder — en un chat con contexto largo (documentos/PDF adjuntos,
      // historial) eso empuja la respuesta más allá del timeout de la función de Netlify (~30s),
      // que corta la conexión con un 504 antes de que el modelo termine. Este chat es preguntas y
      // respuestas de tutoría, no necesita razonamiento extendido: lo apagamos para que responda
      // dentro del tiempo disponible.
      thinkingConfig: { thinkingBudget: 0 },
    };
    if (systemInstruction) config.systemInstruction = systemInstruction;
    if (tools.length > 0) config.tools = tools;
    if (enableMaps && userLocation) config.toolConfig = toolConfig;

    const formattedContents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        formattedContents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }
    const userParts: any[] = [{ text: message }];
    if (Array.isArray(files)) {
      files.forEach((f: any) => {
        if (f?.mimeType && f?.data) {
          userParts.push({ inlineData: { mimeType: f.mimeType, data: f.data } });
        }
      });
    }
    formattedContents.push({ role: "user", parts: userParts });

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config,
      });
    } catch (e: any) {
      // Si la cuota está agotada (afecta a la clave/proyecto entero, no a un modelo puntual),
      // probamos el respaldo de OpenRouter antes de rendirnos (ver callOpenRouterFallback).
      if (isQuotaExhaustedError(e)) {
        const fallbackText = await callOpenRouterFallback(message, history, systemInstruction);
        if (fallbackText) {
          return { statusCode: 200, body: JSON.stringify({ text: fallbackText, groundingChunks: [] }) };
        }
        throw e;
      }
      // Si ya se había pedido el modelo liviano, no hay a qué más caer — reintentar acá adentro
      // solo duplicaría la espera (y el riesgo de que Netlify corte la función por tiempo) sin
      // cambiar el resultado.
      if (selectedModel === "gemini-3.5-flash-lite") throw e;
      console.warn(`Model ${selectedModel} busy/unavailable. Retrying with gemini-3.5-flash-lite...`, e?.message);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: formattedContents,
        config,
      });
    }

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { statusCode: 200, body: JSON.stringify({ text, groundingChunks: chunks }) };
  } catch (error: any) {
    console.error("Error in gemini-chat function:", error);
    const statusCode = isQuotaExhaustedError(error) ? 429 : 500;
    return { statusCode, body: JSON.stringify({ error: friendlyErrorMessage(error) }) };
  }
};
