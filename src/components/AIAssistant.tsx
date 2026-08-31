import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SubNav } from "./SubNav";
import {
  Sparkles,
  Send,
  Volume2,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  MicOff,
  CloudLightning,
  AlertTriangle,
  Play,
  Download,
  Loader2,
  MapPin,
  Globe,
  Upload,
  RefreshCw,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { GeminiService, ChatMessage, GroundingChunk } from "../lib/gemini";

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  darkMode: boolean;
  className?: string;
  menuClassName?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  darkMode,
  className = "",
  menuClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selected = options.find((opt) => opt.value === value) || options[0];

  return (
    <div ref={dropdownRef} className={`relative block text-left transition-all duration-200 ${className} ${isOpen ? "z-50" : "z-10"}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer px-4 py-2.5 rounded-full border text-xs focus:border-primary shadow-xs duration-300 ${
          darkMode
            ? "bg-zinc-900/80 border-white/10 text-zinc-200"
            : "bg-zinc-100/60 border-zinc-300/60 text-zinc-800 backdrop-blur-md"
        }`}
      >
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ml-1 ${
            darkMode ? "text-zinc-400" : "text-zinc-500"
          }`}
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-[100] w-full mt-1.5 rounded-2xl border p-1.5 shadow-xl max-h-56 overflow-y-auto backdrop-blur-md transition-all duration-200 left-0 scrollbar-none animate-in fade-in duration-150 ${
            darkMode
              ? "bg-zinc-950/95 border-white/10 shadow-black/50 text-zinc-200"
              : "bg-zinc-100/90 border-zinc-300/80 shadow-zinc-300/40 text-zinc-800"
          } ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-full text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white dark:text-blue-950 font-bold shadow-xs"
                    : darkMode
                    ? "text-zinc-300 hover:bg-white/10"
                    : "text-zinc-800 hover:bg-zinc-200/80"
                }`}
              >
                <span className="truncate pr-2">{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface AIAssistantProps {
  darkMode: boolean;
  activeSubTab?: string;
  onSubTabChange?: (subTabId: string) => void;
}

export default function AIAssistant({
  darkMode,
  activeSubTab: propActiveSubTab,
  onSubTabChange,
}: AIAssistantProps) {
  const [localActiveSubTab, setLocalActiveSubTab] = useState<
    "chat" | "image" | "video" | "analysis"
  >("chat");

  const activeSubTab = (propActiveSubTab || localActiveSubTab) as "chat" | "image" | "video" | "analysis";
  const setActiveSubTab = (tab: "chat" | "image" | "video" | "analysis") => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setLocalActiveSubTab(tab);
    }
  };

  // Chatbot State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: "¡Hola! Soy tu Copiloto Inteligente de Liquid Workspace. Puedo ayudarte a planificar tu menú semanal, organizar tus tareas de la universidad, registrar tus facturas, llevar control de tu salud o incluso generar imágenes y videos creativos. ¿Qué deseas hacer hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [enableMaps, setEnableMaps] = useState(false);
  const [groundingLinks, setGroundingLinks] = useState<GroundingChunk[]>([]);

  // Speech Recorder State
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const audioChunksRef = useRef<Blob[]>([]);

  // TTS playback state
  const [ttsPlayingId, setTtsPlayingId] = useState<number | null>(null);
  const [ttsVoice, setTtsVoice] = useState("Zephyr");

  // Image Generation State
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgSize, setImgSize] = useState("1K");
  const [imgAspect, setImgAspect] = useState("1:1");
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [imgLoading, setImgLoading] = useState(false);

  // Video Generation (Veo) State
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspect, setVideoAspect] = useState("16:9");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoOpName, setVideoOpName] = useState<string | null>(null);
  const [videoDone, setVideoDone] = useState(false);
  const [videoStatusMsg, setVideoStatusMsg] = useState("");

  // Video Analysis State
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [analysisBase64, setAnalysisBase64] = useState<string | null>(null);
  const [analysisQuestion, setAnalysisQuestion] = useState(
    "Analiza detalladamente lo que ocurre en este video.",
  );
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto Scroll Chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      setRecording(true);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        // Convert audioBlob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          try {
            setLoading(true);
            const transcription = await GeminiService.transcribeAudio(
              base64Audio,
              "audio/webm",
            );
            if (transcription) {
              setInput(transcription);
            }
          } catch (e: any) {
            console.error("Transcription error:", e);
            alert("No se pudo transcribir el audio: " + e.message);
          } finally {
            setLoading(false);
          }
        };
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (err) {
      console.error("Microphone access failed", err);
      alert("No se pudo acceder al micrófono.");
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      // stop stream tracks
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Chat Message submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    const updatedHistory: ChatMessage[] = [
      ...messages,
      { role: "user", text: userMsg },
    ];
    setMessages(updatedHistory);
    setLoading(true);
    setGroundingLinks([]);

    try {
      // Get location coordinates for maps grounding
      let userLocation: any = undefined;
      if (enableMaps) {
        // Fallback or request geolocation
        try {
          const pos = await new Promise<any>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 3000,
            });
          });
          userLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
        } catch (err) {
          // Default location (Buenos Aires)
          userLocation = { latitude: -34.6037, longitude: -58.3816 };
        }
      }

      const response = await GeminiService.sendChatMessage(userMsg, messages, {
        systemInstruction:
          "Eres el Copiloto Inteligente de Liquid Workspace en español, un experto amigable en organización personal. Apoya al usuario en todo momento.",
        enableSearch,
        enableMaps,
        userLocation,
      });

      setMessages((prev) => [...prev, { role: "model", text: response.text }]);
      if (response.groundingChunks && response.groundingChunks.length > 0) {
        setGroundingLinks(response.groundingChunks);
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `⚠️ Error de Copiloto: ${err.message}. Verifica que poseas configurada la clave GEMINI_API_KEY en Settings > Secrets del panel principal de AI Studio.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Play text-to-speech for model message
  const handlePlayTTS = async (text: string, msgIdx: number) => {
    try {
      setTtsPlayingId(msgIdx);
      const base64Audio = await GeminiService.generateTTS(text, ttsVoice);

      // Create raw pcm playback or blob audio element
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // We received raw wav or mp3 audio file binary from server tts route
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => setTtsPlayingId(null);
      audio.play();
    } catch (err: any) {
      console.error("TTS playback failure", err);
      alert("Error al generar voz: " + err.message);
      setTtsPlayingId(null);
    }
  };

  // Image Generation submission
  const handleGenerateImage = async () => {
    if (!imgPrompt.trim()) return;
    setImgLoading(true);
    setGeneratedImg(null);
    try {
      const url = await GeminiService.generateImage(
        imgPrompt,
        imgAspect,
        imgSize,
      );
      setGeneratedImg(url);
    } catch (err: any) {
      alert("Error al generar imagen: " + err.message);
    } finally {
      setImgLoading(false);
    }
  };

  // Image Editing submission
  const handleEditImage = async () => {
    if (!generatedImg || !editInstruction.trim()) return;
    setImgLoading(true);
    try {
      const url = await GeminiService.editImage(generatedImg, editInstruction);
      setGeneratedImg(url);
      setEditInstruction("");
    } catch (err: any) {
      alert("Error al editar imagen: " + err.message);
    } finally {
      setImgLoading(false);
    }
  };

  // Video generation submission (Veo)
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) return;
    setVideoLoading(true);
    setVideoDone(false);
    setVideoOpName(null);
    setVideoStatusMsg("Iniciando renderizado con Veo Lite...");

    try {
      const opName = await GeminiService.generateVideo(
        videoPrompt,
        videoAspect,
      );
      setVideoOpName(opName);

      // Start status polling
      let finished = false;
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;
        setVideoStatusMsg(
          `Procesando video... Intento #${attempts}. Por favor aguarda.`,
        );

        try {
          const status = await GeminiService.checkVideoStatus(opName);
          if (status.done) {
            finished = true;
            clearInterval(interval);
            setVideoDone(true);
            setVideoLoading(false);
            setVideoStatusMsg("¡Video generado con éxito!");
          }
        } catch (e) {
          console.error("Polling error:", e);
        }

        if (attempts >= 45 && !finished) {
          clearInterval(interval);
          setVideoLoading(false);
          setVideoStatusMsg(
            "La generación excedió el tiempo límite del demo. Reintenta con un prompt más corto.",
          );
        }
      }, 8000);
    } catch (err: any) {
      setVideoLoading(false);
      alert("Error en generación Veo: " + err.message);
    }
  };

  // Drag & drop or upload video analysis file
  const handleAnalysisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnalysisFile(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        setAnalysisBase64(reader.result as string);
      };
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!analysisBase64) return;
    setAnalysisLoading(true);
    setAnalysisResult("");
    try {
      const text = await GeminiService.analyzeVideo(
        analysisBase64,
        analysisQuestion,
        analysisFile?.type,
      );
      setAnalysisResult(text);
    } catch (err: any) {
      alert("Error en análisis de video: " + err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-6 h-[calc(100vh-100px)] flex flex-col justify-between">
      {/* Submenu Tabs Selector with Navigation Arrows */}
      {!propActiveSubTab && (
        <SubNav
          activeTab={activeSubTab}
          onTabChange={(id) => setActiveSubTab(id as any)}
          className="mb-2 shrink-0"
          tabs={[
            {
              id: "chat",
              label: "Chat de Organización",
              icon: Sparkles,
            },
            {
              id: "image",
              label: "Generar Imagen",
              icon: ImageIcon,
            },
            {
              id: "video",
              label: "Generar Video (Veo)",
              icon: VideoIcon,
            },
            {
              id: "analysis",
              label: "Entender Video",
              icon: CloudLightning,
            },
          ]}
        />
      )}

      {/* Main tab viewer panel */}
      <div className="flex-1 min-h-0 py-4 overflow-hidden flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col justify-between h-full overflow-hidden"
          >
            {activeSubTab === "chat" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden justify-between">
            {/* Grounding toggles */}
            <div className={`relative z-30 flex flex-wrap items-center gap-4 mb-3.5 shrink-0 p-3.5 rounded-2xl border text-xs font-bold shadow-lg backdrop-blur-md transition-colors duration-300 ${
              darkMode
                ? "bg-zinc-950/75 border-white/10 text-zinc-200 shadow-black/40"
                : "bg-zinc-100/60 border-zinc-300/40 text-zinc-800 shadow-zinc-200/30"
            }`}>
              <label className={`flex items-center gap-2 cursor-pointer transition-colors duration-200 ${
                darkMode ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-950"
              }`}>
                <input
                  type="checkbox"
                  checked={enableSearch}
                  onChange={(e) => {
                    setEnableSearch(e.target.checked);
                    if (e.target.checked) setEnableMaps(false);
                  }}
                  className="rounded bg-zinc-950/40 border-zinc-800 text-primary"
                />
                <Globe className="w-3.5 h-3.5 text-primary" />
                Soporte de Búsqueda de Google (Grounding)
              </label>

              <label className={`flex items-center gap-2 cursor-pointer transition-colors duration-200 ${
                darkMode ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-950"
              }`}>
                <input
                  type="checkbox"
                  checked={enableMaps}
                  onChange={(e) => {
                    setEnableMaps(e.target.checked);
                    if (e.target.checked) setEnableSearch(false);
                  }}
                  className="rounded bg-zinc-950/40 border-zinc-800 text-primary"
                />
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Soporte de OpenStreetMap (Geolocalización)
              </label>

              {/* TTS Prebuilt Voice */}
              <div className="flex items-center gap-2 sm:ml-auto">
                <span className={`font-semibold shrink-0 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>Voz Copiloto:</span>
                <CustomSelect
                  value={ttsVoice}
                  onChange={setTtsVoice}
                  options={[
                    { value: "Zephyr", label: "Zephyr (Cálido)" },
                    { value: "Kore", label: "Kore (Profesional)" },
                    { value: "Fenrir", label: "Fenrir (Firme)" },
                  ]}
                  darkMode={darkMode}
                  className="w-36 sm:w-40"
                />
              </div>
            </div>

            {/* Chat list */}
            <div className={`flex-1 min-h-0 overflow-y-auto space-y-4 p-4 mb-4 rounded-3xl border shadow-lg backdrop-blur-md transition-colors duration-300 ${
              darkMode
                ? "bg-zinc-950/45 border-white/10 shadow-black/30 animate-fade-in"
                : "bg-zinc-100/40 border-zinc-300/30 shadow-zinc-200/20 animate-fade-in"
            }`}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] p-4 rounded-3xl text-xs leading-relaxed transition-all shadow-md ${
                      msg.role === "user"
                        ? "bg-primary text-white dark:text-blue-950 rounded-br-none"
                        : darkMode
                        ? "bg-zinc-900/85 text-zinc-100 border border-white/10 rounded-bl-none"
                        : "bg-zinc-100/90 text-zinc-900 border border-zinc-200/60 rounded-bl-none"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.role === "model" && (
                        <button
                          onClick={() => handlePlayTTS(msg.text, idx)}
                          disabled={ttsPlayingId === idx}
                          className="p-1 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/50 transition-all text-zinc-400 hover:text-white shrink-0"
                          title="Escuchar respuesta de voz de Gemini"
                        >
                          {ttsPlayingId === idx ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start gap-3 animate-pulse">
                  <div className={`border p-4 rounded-3xl rounded-bl-none shadow-sm ${
                    darkMode ? "bg-zinc-900/85 border-white/10" : "bg-zinc-100/90 border-zinc-200/60"
                  }`}>
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Grounding chunks panel */}
            {groundingLinks.length > 0 && (
              <div className="p-3 bg-primary-container border border-primary/30 rounded-2xl mb-3 shrink-0 text-xs">
                <span className="font-extrabold text-primary block mb-1">
                  Fuentes y Referencias:
                </span>
                <div className="flex flex-wrap gap-2">
                  {groundingLinks.map((chunk, cidx) => {
                    const link = chunk.web || chunk.maps;
                    if (!link) return null;
                    return (
                      <a
                        key={cidx}
                        href={link.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950/40 border border-zinc-800 hover:border-primary/30 transition-all text-[11px] text-primary hover:underline"
                      >
                        {chunk.maps ? (
                          <MapPin className="w-3 h-3 text-primary" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
                        <span className="truncate max-w-[150px]">
                          {link.title || "Ver Sitio"}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input bar */}
            <form
              onSubmit={handleSendMessage}
              className={`flex gap-2.5 shrink-0 p-3.5 rounded-2xl border shadow-lg backdrop-blur-md transition-colors duration-300 ${
                darkMode
                  ? "bg-zinc-950/75 border-white/10 shadow-black/40"
                  : "bg-zinc-100/60 border-zinc-300/40 shadow-zinc-200/30"
              }`}
            >
              {/* Mic / voice trigger */}
              <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                className={`p-3 rounded-xl border transition-all shrink-0 cursor-pointer ${
                  recording
                    ? "bg-red-600 border-red-500 text-white animate-pulse"
                    : darkMode
                    ? "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                    : "bg-zinc-200/60 border-zinc-300/60 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/80"
                }`}
                title={
                  recording
                    ? "Detener grabación y transcribir"
                    : "Grabar entrada de voz"
                }
              >
                {recording ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  recording
                    ? "Grabando audio desde tu micrófono..."
                    : "Consulta sobre tus tareas, finanzas o pídele que te planifique..."
                }
                className={`flex-1 px-4 py-3 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/20 transition-all ${
                  darkMode
                    ? "bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 focus:border-primary"
                    : "bg-zinc-50/80 border border-zinc-300/50 text-zinc-900 placeholder-zinc-500 focus:border-primary"
                }`}
                disabled={recording}
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-3 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 transition-all shrink-0 cursor-pointer shadow-lg shadow-primary/20 disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* Image generator panel */}
        {activeSubTab === "image" && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto pr-1 animate-fade-in">
            {/* Form controls */}
            <div className={`space-y-4 p-5 rounded-3xl border shadow-lg backdrop-blur-md transition-colors duration-300 ${
              darkMode
                ? "bg-zinc-950/75 border-white/10 shadow-black/40 text-zinc-100"
                : "bg-zinc-100/60 border-zinc-300/40 shadow-zinc-200/30 text-zinc-800"
            }`}>
              <div>
                <label className={`block text-xs font-bold uppercase mb-2 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                  Prompt de la Imagen
                </label>
                <textarea
                  value={imgPrompt}
                  onChange={(e) => setImgPrompt(e.target.value)}
                  placeholder="Ej: Un gatito de neón cyberpunk programando en una laptop, estilo bento, renders de alta resolución"
                  className={`w-full px-4 py-3 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none h-24 ${
                    darkMode
                      ? "bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 focus:border-primary"
                      : "bg-zinc-50/80 border border-zinc-300/50 text-zinc-900 placeholder-zinc-500 focus:border-primary"
                  }`}
                ></textarea>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <div className="w-full">
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                    Relación de Aspecto
                  </label>
                  <CustomSelect
                    value={imgAspect}
                    onChange={setImgAspect}
                    options={[
                      { value: "1:1", label: "1:1 (Cuadrado)" },
                      { value: "16:9", label: "16:9 (Horizontal)" },
                      { value: "9:16", label: "9:16 (Vertical)" },
                      { value: "4:3", label: "4:3 (Estándar)" },
                    ]}
                    darkMode={darkMode}
                    className="w-full"
                  />
                </div>
                <div className="w-full">
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                    Resolución
                  </label>
                  <CustomSelect
                    value={imgSize}
                    onChange={setImgSize}
                    options={[
                      { value: "1K", label: "1K (Estándar)" },
                      { value: "512px", label: "512px (Baja)" },
                    ]}
                    darkMode={darkMode}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateImage}
                disabled={imgLoading || !imgPrompt.trim()}
                className="w-full py-3 px-4 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-lg disabled:opacity-40"
              >
                {imgLoading
                  ? "Procesando con Gemini..."
                  : "Generar Imagen con AI"}
              </button>

              {/* Editing controls for generated image */}
              {generatedImg && (
                <div className="pt-4 border-t border-zinc-800/10 space-y-3">
                  <span className="block text-xs font-bold text-primary uppercase">
                    ¿Quieres modificar la imagen?
                  </span>
                  <input
                    type="text"
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    placeholder="Ej: Reemplaza la laptop por una taza de café humeante"
                    className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-900/80 border border-white/10 text-white focus:border-primary"
                        : "bg-zinc-50/80 border border-zinc-300/50 text-zinc-900 focus:border-primary"
                    }`}
                  />
                  <button
                    onClick={handleEditImage}
                    disabled={imgLoading || !editInstruction.trim()}
                    className="w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer"
                  >
                    Aplicar Modificación
                  </button>
                </div>
              )}
            </div>

            {/* Viewport display */}
            <div className={`flex items-center justify-center border border-dashed rounded-3xl p-5 shadow-lg backdrop-blur-md transition-colors duration-300 relative overflow-hidden min-h-[250px] ${
              darkMode
                ? "bg-zinc-950/45 border-white/10 shadow-black/30"
                : "bg-zinc-100/40 border-zinc-300/30 shadow-zinc-200/20"
            }`}>
              {imgLoading ? (
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-zinc-500">
                    Generando tu obra maestra...
                  </p>
                </div>
              ) : generatedImg ? (
                <img
                  src={generatedImg}
                  alt="AI Generated Output"
                  referrerPolicy="no-referrer"
                  className="max-h-full rounded-2xl object-contain shadow-2xl"
                />
              ) : (
                <div className="text-center text-xs text-zinc-500 font-medium">
                  Escribe un prompt a la izquierda para visualizar tu creación.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video generator panel */}
        {activeSubTab === "video" && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto pr-1 animate-fade-in">
            <div className={`space-y-4 p-5 rounded-3xl border shadow-lg backdrop-blur-md transition-colors duration-300 ${
              darkMode
                ? "bg-zinc-950/75 border-white/10 shadow-black/40 text-zinc-100"
                : "bg-zinc-100/60 border-zinc-300/40 shadow-zinc-200/30 text-zinc-800"
            }`}>
              <div>
                <label className={`block text-xs font-bold uppercase mb-2 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                  Prompt de Video (Veo)
                </label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Ej: Un plano de drones volando sobre una ciudad futurista flotando sobre nubes doradas, hiperrealista"
                  className={`w-full px-4 py-3 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none h-24 ${
                    darkMode
                      ? "bg-zinc-900/80 border border-white/10 text-white placeholder-zinc-500 focus:border-primary"
                      : "bg-zinc-50/80 border border-zinc-300/50 text-zinc-900 placeholder-zinc-500 focus:border-primary"
                  }`}
                ></textarea>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                  Relación de Aspecto
                </label>
                <CustomSelect
                  value={videoAspect}
                  onChange={setVideoAspect}
                  options={[
                    { value: "16:9", label: "16:9 (Horizontal)" },
                    { value: "9:16", label: "9:16 (Vertical)" },
                  ]}
                  darkMode={darkMode}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleGenerateVideo}
                disabled={videoLoading || !videoPrompt.trim()}
                className="w-full py-3 px-4 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-lg disabled:opacity-40"
              >
                {videoLoading
                  ? "Iniciando generación con Veo..."
                  : "Generar Video (Veo)"}
              </button>

              {videoStatusMsg && (
                <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 shadow-sm transition-colors duration-300 ${
                  darkMode
                    ? "bg-zinc-900/80 border-white/10 text-zinc-300"
                    : "bg-zinc-100/80 border-zinc-300/60 text-zinc-700"
                }`}>
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  <span>{videoStatusMsg}</span>
                </div>
              )}
            </div>

            {/* Video Viewport / Download */}
            <div className={`flex items-center justify-center border border-dashed rounded-3xl p-5 shadow-lg backdrop-blur-md transition-colors duration-300 relative overflow-hidden min-h-[250px] ${
              darkMode
                ? "bg-zinc-950/45 border-white/10 shadow-black/30"
                : "bg-zinc-100/40 border-zinc-300/30 shadow-zinc-200/20"
            }`}>
              {videoLoading ? (
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-zinc-400">Generando tu video...</p>
                  <span className="text-[10px] text-zinc-500">
                    Este proceso puede tardar hasta 1 minuto. Por favor no
                    cierres la pestaña.
                  </span>
                </div>
              ) : videoDone && videoOpName ? (
                <div className="text-center space-y-4">
                  <div className="p-3.5 rounded-full bg-primary/10 text-primary w-12 h-12 flex items-center justify-center mx-auto">
                    <CloudLightning className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="font-extrabold text-sm">
                    ¡Renderizado de Veo Completo!
                  </h4>
                  <a
                    href={GeminiService.getVideoDownloadUrl(videoOpName)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold rounded-full transition-all shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Video MP4
                  </a>
                </div>
              ) : (
                <div className="text-center text-xs text-zinc-500 font-medium">
                  Escribe un prompt de video y haz clic en Generar arriba.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video analysis / upload understanding panel */}
        {activeSubTab === "analysis" && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto pr-1 animate-fade-in">
            <div className={`space-y-4 p-5 rounded-3xl border shadow-lg backdrop-blur-md transition-colors duration-300 ${
              darkMode
                ? "bg-zinc-950/75 border-white/10 shadow-black/40 text-zinc-100"
                : "bg-zinc-100/60 border-zinc-300/40 shadow-zinc-200/30 text-zinc-800"
            }`}>
              <span className={`block text-xs font-bold uppercase ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                Cargar Video para Análisis
              </span>
              {/* File Drag and Drop container */}
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-6 transition-all cursor-pointer relative ${
                darkMode
                  ? "bg-zinc-900/40 border-white/10 hover:bg-zinc-900/60"
                  : "bg-zinc-200/40 border-zinc-300/60 hover:bg-zinc-200/60"
              }`}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleAnalysisFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-primary mb-2" />
                <span className="text-xs font-bold">
                  {analysisFile
                    ? analysisFile.name
                    : "Subir video desde dispositivo"}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium mt-1">
                  Soporta formatos MP4 o WebM
                </span>
              </label>

              {analysisBase64 && (
                <div className="space-y-3 pt-2">
                  <label className={`block text-xs font-bold uppercase ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}>
                    ¿Qué deseas preguntarle a Gemini sobre el video?
                  </label>
                  <input
                    type="text"
                    value={analysisQuestion}
                    onChange={(e) => setAnalysisQuestion(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all ${
                      darkMode
                        ? "bg-zinc-900/80 border border-white/10 text-white focus:border-primary"
                        : "bg-zinc-50/80 border border-zinc-300/50 text-zinc-900 focus:border-primary"
                    }`}
                  />
                  <button
                    onClick={handleAnalyzeVideo}
                    disabled={analysisLoading}
                    className="w-full py-2.5 px-4 rounded-full bg-primary hover:bg-primary text-white dark:text-blue-950 text-xs font-bold transition-all cursor-pointer shadow-lg"
                  >
                    {analysisLoading
                      ? "Analizando fotogramas..."
                      : "Analizar Video"}
                  </button>
                </div>
              )}
            </div>

            {/* Analysis results Display */}
            <div className={`flex flex-col justify-between border border-dashed rounded-3xl p-5 shadow-lg backdrop-blur-md transition-colors duration-300 overflow-y-auto max-h-[350px] ${
              darkMode
                ? "bg-zinc-950/45 border-white/10 shadow-black/30"
                : "bg-zinc-100/40 border-zinc-300/30 shadow-zinc-200/20"
            }`}>
              {analysisLoading ? (
                <div className="m-auto text-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-zinc-400">
                    Gemini está analizando detalladamente tu video...
                  </p>
                </div>
              ) : analysisResult ? (
                <div className="space-y-2.5 animate-fade-in">
                  <span className="text-xs font-bold text-primary block uppercase">
                    Análisis del Video:
                  </span>
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap ${darkMode ? "text-zinc-300" : "text-zinc-700"}`}>
                    {analysisResult}
                  </p>
                </div>
              ) : (
                <div className="m-auto text-center text-xs text-zinc-500 font-medium">
                  Los resultados de la comprensión del video se visualizarán
                  aquí una vez finalizado el análisis.
                </div>
              )}
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
