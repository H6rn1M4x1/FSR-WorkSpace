import type { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

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
    const { message, history, model, systemInstruction, enableSearch, enableMaps, userLocation } = body;

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

    const config: any = {};
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
    formattedContents.push({ role: "user", parts: [{ text: message }] });

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config,
      });
    } catch (e: any) {
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
    return { statusCode: 500, body: JSON.stringify({ error: error.message || "Error al comunicarse con Gemini." }) };
  }
};
