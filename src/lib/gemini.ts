export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export class GeminiService {
  // Call Chatbot route
  static async sendChatMessage(
    message: string,
    history: ChatMessage[],
    options: {
      model?: string;
      systemInstruction?: string;
      enableSearch?: boolean;
      enableMaps?: boolean;
      userLocation?: { latitude: number; longitude: number };
    } = {}
  ): Promise<{ text: string; groundingChunks?: GroundingChunk[] }> {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, ...options }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al enviar mensaje.");
    }
    return res.json();
  }

  // Call Text-to-Speech route
  static async generateTTS(text: string, voiceName: string = "Kore"): Promise<string> {
    const res = await fetch("/api/gemini/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al generar voz.");
    }
    const data = await res.json();
    return data.audio; // base64 pcm audio
  }

  // Call Image Generation route
  static async generateImage(prompt: string, aspectRatio: string = "1:1", imageSize: string = "1K"): Promise<string> {
    const res = await fetch("/api/gemini/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio, imageSize }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al generar imagen.");
    }
    const data = await res.json();
    return data.imageUrl; // data URL
  }

  // Call Image Editing route
  static async editImage(base64Image: string, instruction: string, mimeType: string = "image/png"): Promise<string> {
    const res = await fetch("/api/gemini/edit-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Image, mimeType, instruction }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al editar imagen.");
    }
    const data = await res.json();
    return data.imageUrl;
  }

  // Call Audio Transcription route
  static async transcribeAudio(base64Audio: string, mimeType: string = "audio/webm"): Promise<string> {
    const res = await fetch("/api/gemini/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Audio, mimeType }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al transcribir.");
    }
    const data = await res.json();
    return data.text;
  }

  // Call Video Generation route (Veo)
  static async generateVideo(prompt: string, aspectRatio: string = "16:9", resolution: string = "1080p"): Promise<string> {
    const res = await fetch("/api/gemini/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio, resolution }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al iniciar generación de video.");
    }
    const data = await res.json();
    return data.operationName;
  }

  // Poll video status
  static async checkVideoStatus(operationName: string): Promise<{ done: boolean; response?: any }> {
    const res = await fetch("/api/gemini/video-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al consultar estado del video.");
    }
    return res.json();
  }

  // Download video URL
  static getVideoDownloadUrl(operationName: string): string {
    // We return an endpoint that serves the mp4 stream binary
    return `/api/gemini/video-download?operationName=${encodeURIComponent(operationName)}`;
  }

  // Call Video Analysis route
  static async analyzeVideo(base64Video: string, question: string, mimeType: string = "video/mp4"): Promise<string> {
    const res = await fetch("/api/gemini/analyze-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Video, question, mimeType }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al analizar video.");
    }
    const data = await res.json();
    return data.text;
  }

  // Call Card Statement Ingestion route
  static async parseCardStatement(
    fileData: string,
    mimeType: string,
    cardName?: string
  ): Promise<{ descripcion: string; categoria: string; fecha: string; metodo: string; monto: number }[]> {
    const res = await fetch("/api/parse-card-statement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileData, mimeType, cardName }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al procesar el resumen con IA.");
    }
    const data = await res.json();
    return data.items || [];
  }
}
