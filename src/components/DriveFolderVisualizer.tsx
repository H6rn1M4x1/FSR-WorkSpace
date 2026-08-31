import React, { useState, useEffect, useRef } from "react";
import AnimatedFolder from "./AnimatedFolder";
import { createPortal } from "react-dom";
import {
  Folder,
  FolderOpen,
  FileText,
  File,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Download,
  Loader2,
  Trash2,
  Edit2,
  Plus,
  Search,
  Grid,
  List,
  Upload,
  Check,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Info,
  AlertTriangle,
  FileSpreadsheet,
  FileCheck2,
  Presentation,
  ShieldAlert,
  FileImage,
  Sparkles,
  Lock,
  PlusCircle,
  Eye,
  MessageSquare,
  Bot,
  Send,
  GraduationCap,
  User,
  Copy,
  Scissors,
  Clipboard,
  Maximize2,
  Minimize2,
  Minus,
} from "lucide-react";
import {
  googleSignIn,
  getAccessToken,
  logout as firebaseLogout,
  initAuth,
} from "../lib/supabase";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
}

interface Breadcrumb {
  id: string;
  name: string;
}

// Lightweight parser for simple Markdown from Gemini responses
const renderMarkdown = (text: string) => {
  if (!text) return null;

  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeLines: string[] = [];

  return lines
    .map((line, idx) => {
      // Handle code block toggle
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          inCodeBlock = false;
          const codeContent = codeLines.join("\n");
          codeLines = [];
          return (
            <pre
              key={idx}
              className="bg-zinc-950 text-zinc-300 p-3 rounded-xl text-[11px] font-mono overflow-y-hidden overflow-x-auto my-2.5 border border-zinc-800 leading-relaxed max-w-full"
            >
              <code>{codeContent}</code>
            </pre>
          );
        } else {
          inCodeBlock = true;
          return null;
        }
      }

      if (inCodeBlock) {
        codeLines.push(line);
        return null;
      }

      // Parse bold text **text**
      const parseBold = (str: string) => {
        const parts = str.split(/\*\*([^*]+)\*\*/g);
        return parts.map((part, i) => {
          if (i % 2 === 1) {
            return (
              <strong
                key={i}
                className="font-bold text-zinc-900 dark:text-white"
              >
                {part}
              </strong>
            );
          }
          return part;
        });
      };

      // Handle bullet list item
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const cleanLine = line.trim().replace(/^[-*]\s+/, "");
        return (
          <li
            key={idx}
            className="ml-3.5 list-disc text-xs leading-relaxed my-1 pl-1 text-zinc-700 dark:text-zinc-300"
          >
            {parseBold(cleanLine)}
          </li>
        );
      }

      // Handle numbered list item
      if (/^\d+\.\s/.test(line.trim())) {
        const cleanLine = line.trim().replace(/^\d+\.\s+/, "");
        return (
          <li
            key={idx}
            className="ml-3.5 list-decimal text-xs leading-relaxed my-1 pl-1 text-zinc-700 dark:text-zinc-300"
          >
            {parseBold(cleanLine)}
          </li>
        );
      }

      // Empty lines
      if (line.trim() === "") {
        return <div key={idx} className="h-1.5" />;
      }

      // Normal paragraph
      return (
        <p
          key={idx}
          className="text-xs leading-relaxed my-1 text-zinc-700 dark:text-zinc-300"
        >
          {parseBold(line)}
        </p>
      );
    })
    .filter((el) => el !== null);
};

interface DriveFolderVisualizerProps {
  darkMode: boolean;
}

export default function DriveFolderVisualizer({
  darkMode,
}: DriveFolderVisualizerProps) {
  const [accessToken, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navigation states
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [hoveredFileId, setHoveredFileId] = useState<string | null>(null);

  // Custom Default Folder State
  const [facultadFolderId, setFacultadFolderId] = useState<string | null>(null);
  const [showFolderNotFound, setShowFolderNotFound] = useState(false);
  const [isCreatingBaseFolder, setIsCreatingBaseFolder] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [folderSearchTerm, setFolderSearchTerm] = useState("");
  const [folderSearchResults, setFolderSearchResults] = useState<GoogleDriveFile[]>([]);
  const [isSearchingFolders, setIsSearchingFolders] = useState(false);
  const [folderSearchError, setFolderSearchError] = useState<string | null>(null);

  // UI state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals & Forms State
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [showCreateDocModal, setShowCreateDocModal] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocType, setNewDocType] = useState<
    "document" | "spreadsheet" | "presentation"
  >("document");
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<GoogleDriveFile | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GoogleDriveFile | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Embedded File Viewer/Editor state
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(
    null,
  );
  const [viewerMode, setViewerMode] = useState<"preview" | "edit">("preview");
  const [textContent, setTextContent] = useState("");
  const [isFetchingTextContent, setIsFetchingTextContent] = useState(false);
  const [isSavingTextContent, setIsSavingTextContent] = useState(false);

  // Collapse/Expand state for folder content explorer to maximize screen space
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);

  // Custom Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: GoogleDriveFile | null;
  } | null>(null);

  // Clipboard state for Copiar, Cortar, Pegar
  const [clipboard, setClipboard] = useState<{
    file: GoogleDriveFile;
    action: "copy" | "cut";
    sourceFolderId: string | null;
  } | null>(null);

  const [isPasting, setIsPasting] = useState(false);

  // Floating Resizable Windows State
  interface FloatingWindow {
    id: string;
    file: GoogleDriveFile;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
    viewerMode: "preview" | "edit";
    textContent: string;
    isFetchingTextContent: boolean;
    isSavingTextContent: boolean;
  }

  const [floatingWindows, setFloatingWindows] = useState<FloatingWindow[]>([]);
  const [isDraggingOrResizing, setIsDraggingOrResizing] = useState(false);

  // Gemini Professor Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInputValue, setChatInputValue] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const [isReadingFileContent, setIsReadingFileContent] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      sender: "user" | "bot";
      text: string;
      timestamp: Date;
      fileName?: string;
    }>
  >([
    {
      sender: "bot",
      text: "¡Hola! Soy tu **Profesor de Facultad** impulsado por Google Gemini. 🎓✨ Estudiemos juntos.\n\nCuando selecciones o edites un apunte o documento aquí en la sección de Facultad, podré **leerlo automáticamente** para responder tus preguntas, explicar fórmulas complejas, resumir conceptos difíciles o crear cuestionarios de práctica para tus exámenes.\n\n¿En qué materia o tema te gustaría trabajar hoy?",
      timestamp: new Date(),
    },
  ]);

  // Ref for auto-scrolling chat history
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch token and sync user on mount
  useEffect(() => {
    const checkToken = async () => {
      const token = await getAccessToken();
      if (token) {
        setToken(token);
      }
    };
    checkToken();

    // Sincronizar activamente el estado de Firebase Auth para obtener la info de perfil
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setToken(token);
        }
      },
      () => {
        // En caso de que no haya sesión en Firebase, mantener el token de Google si está guardado
        getAccessToken().then((token) => {
          if (!token) {
            setUser(null);
            setToken(null);
          }
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // When token is available, search or initialize the "1 - Facultad" folder
  useEffect(() => {
    if (accessToken) {
      initFacultadFolder();
    }
  }, [accessToken]);

  // When folder ID changes, fetch files inside
  useEffect(() => {
    if (accessToken && currentFolderId) {
      fetchFolderContents(currentFolderId);
    }
  }, [accessToken, currentFolderId]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        "No se pudo autenticar con Google. Por favor, intenta de nuevo.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = async () => {
    await firebaseLogout();
    setToken(null);
    setUser(null);
    setCurrentFolderId(null);
    setFacultadFolderId(null);
    setFiles([]);
    setBreadcrumbs([]);
    setSelectedFile(null);
  };

  useEffect(() => {
    if (
      accessToken &&
      selectedFile &&
      viewerMode === "edit" &&
      isPlainTextEditableFormat(selectedFile.mimeType, selectedFile.name)
    ) {
      fetchTextContent(selectedFile.id);
    }
  }, [accessToken, selectedFile, viewerMode]);

  // Load content of selected file for Gemini Professor Context
  const loadSelectedFileContent = async (file: GoogleDriveFile) => {
    if (!accessToken) return;
    setIsReadingFileContent(true);
    setSelectedFileContent("");
    try {
      if (isPlainTextEditableFormat(file.mimeType, file.name)) {
        const url = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const text = await response.text();
          setSelectedFileContent(text);
        }
      } else if (file.mimeType === "application/vnd.google-apps.document") {
        const url = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const text = await response.text();
          setSelectedFileContent(text);
        }
      } else {
        // Non-text files, just provide basic description to the bot
        setSelectedFileContent(
          `[Archivo: ${file.name} | Tipo de archivo: ${file.mimeType}]`,
        );
      }
    } catch (err) {
      console.error("Error reading file content for Gemini Professor:", err);
    } finally {
      setIsReadingFileContent(false);
    }
  };

  // Trigger content load when selected file changes
  useEffect(() => {
    if (selectedFile && accessToken) {
      loadSelectedFileContent(selectedFile);
    } else {
      setSelectedFileContent("");
    }
  }, [selectedFile, accessToken]);

  // Scroll to bottom when new chat messages arrive or chat is opened
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // Send an arbitrary text query to Gemini Professor (used for typed messages and suggestion clicks)
  const triggerSendWithText = async (textToSend: string) => {
    if (!textToSend.trim() || isChatSending) return;

    setIsChatSending(true);

    const activeDocNames = [
      ...(selectedFile ? [selectedFile.name] : []),
      ...floatingWindows.map((w) => w.file.name),
    ];

    // Add user message locally
    const newUserMessage = {
      sender: "user" as const,
      text: textToSend,
      timestamp: new Date(),
      fileName:
        activeDocNames.length > 0
          ? activeDocNames.slice(0, 3).join(", ") +
            (activeDocNames.length > 3 ? "..." : "")
          : undefined,
    };
    setChatMessages((prev) => [...prev, newUserMessage]);

    // Build comprehensive context of all open documents (fixed + floating)
    let hasContext = false;
    let contextDocsString =
      "=== CONTEXTO DE DOCUMENTOS ABIERTOS EN EL ESCRITORIO ===\n\n";

    // 1. Fixed Main file in screen
    if (selectedFile) {
      hasContext = true;
      contextDocsString += `[DOCUMENTO PRINCIPAL FIJO EN PANTALLA]\n`;
      contextDocsString += `Nombre: "${selectedFile.name}"\n`;
      contextDocsString += `Formato/MIME: ${selectedFile.mimeType}\n`;
      if (selectedFileContent) {
        contextDocsString += `Contenido:\n\"\"\"\n${selectedFileContent}\n\"\"\"\n\n`;
      } else {
        contextDocsString += `Contenido: (Archivo no editable o sin texto extraído)\n\n`;
      }
    }

    // 2. Open floating windows
    if (floatingWindows.length > 0) {
      hasContext = true;
      contextDocsString += `[VENTANAS FLOTANTES ABIERTAS EN EL ESCRITORIO]\n`;
      floatingWindows.forEach((win, index) => {
        contextDocsString += `- Ventana #${index + 1}: "${win.file.name}" ${win.isMinimized ? "(Minimizada)" : "(Activa en pantalla)"}\n`;
        contextDocsString += `  Formato/MIME: ${win.file.mimeType}\n`;
        if (win.textContent) {
          contextDocsString += `  Contenido:\n  \"\"\"\n  ${win.textContent}\n  \"\"\"\n\n`;
        } else {
          contextDocsString += `  Contenido: (Sin texto extraído aún, previsualización o archivo no-texto)\n\n`;
        }
      });
    }

    let finalMessageText = textToSend;
    if (hasContext) {
      finalMessageText = `${contextDocsString}\n==================================================\n\nPREGUNTA O CONSULTA DEL ESTUDIANTE:\n${textToSend}`;
    }

    try {
      // Map last 15 messages for history context
      const formattedHistory = chatMessages.slice(-15).map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        text: msg.text,
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: finalMessageText,
          history: formattedHistory,
          model: "gemini-3.5-flash",
          systemInstruction: `Eres "Prof. Gemini", un distinguido y empático profesor universitario y tutor académico personal.
Tu objetivo es ayudar al estudiante de forma clara, didáctica y estructurada a comprender los conceptos de sus apuntes, guías y materias de la facultad.
- Explica los temas de forma educativa, constructiva y con ejemplos claros.
- En el bloque "CONTEXTO DE DOCUMENTOS ABIERTOS EN EL ESCRITORIO" se te provee el texto o estado de todos los documentos y apuntes que el estudiante tiene abiertos en pantalla (tanto la vista principal como las ventanas flotantes). Léelos detenidamente para relacionarlos, comparar conceptos, responder dudas o armar cuestionarios citando/nombrando el archivo correspondiente.
- Adapta tu nivel explicativo al ámbito universitario. Sé paciente, motivador y utiliza un lenguaje amigable en español.
- Responde con formato Markdown limpio (usa negritas, listas o bloques de código si es necesario para facilitar la lectura del estudiante).`,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al comunicarse con el Profesor Gemini.");
      }

      const data = await response.json();
      if (data.text) {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: data.text,
            timestamp: new Date(),
          },
        ]);
      } else {
        throw new Error("No se recibió respuesta del profesor.");
      }
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `❌ **Error del Profesor:** Lo siento, no pude procesar tu consulta en este momento. Inténtalo de nuevo. (${err.message || "Error desconocido"})`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Send message to Gemini Professor from the input form
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInputValue.trim() || isChatSending) return;

    const userMessageText = chatInputValue.trim();
    setChatInputValue("");
    await triggerSendWithText(userMessageText);
  };

  const fetchTextContent = async (fileId: string) => {
    setIsFetchingTextContent(true);
    setErrorMsg(null);
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error("No se pudo descargar el contenido del archivo.");
      }
      const text = await response.text();
      setTextContent(text);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message || "Error al cargar el contenido del archivo de texto.",
      );
    } finally {
      setIsFetchingTextContent(false);
    }
  };

  const handleSaveTextContent = async () => {
    if (!selectedFile) return;
    setIsSavingTextContent(true);
    setErrorMsg(null);
    try {
      const url = `https://www.googleapis.com/upload/drive/v3/files/${selectedFile.id}?uploadType=media`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": selectedFile.mimeType || "text/plain",
        },
        body: textContent,
      });

      if (!response.ok) {
        throw new Error("No se pudo guardar el archivo.");
      }
      setIsSavingTextContent(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al guardar los cambios.");
      setIsSavingTextContent(false);
    }
  };

  const initFacultadFolder = async () => {
    setIsLoading(true);
    setShowFolderNotFound(false);
    setErrorMsg(null);
    try {
      // Check if there is a saved default folder in localStorage
      const savedFolderId = localStorage.getItem("facultad_default_folder_id");
      if (savedFolderId) {
        // Fetch its metadata to verify it exists and is accessible
        const url = `https://www.googleapis.com/drive/v3/files/${savedFolderId}?fields=id,name,mimeType,trashed`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const folderMeta = await response.json();
          if (folderMeta && !folderMeta.trashed) {
            setFacultadFolderId(folderMeta.id);
            setCurrentFolderId(folderMeta.id);
            setBreadcrumbs([{ id: folderMeta.id, name: folderMeta.name }]);
            setIsLoading(false);
            return;
          }
        } else {
          // If the folder is no longer accessible or deleted, clean up
          localStorage.removeItem("facultad_default_folder_id");
          localStorage.removeItem("facultad_default_folder_name");
        }
      }

      const query =
        "name = '1 - Facultad' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&pageSize=10`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired
          handleDisconnect();
          throw new Error(
            "La sesión de Google Drive ha expirado. Por favor inicia sesión de nuevo.",
          );
        }
        throw new Error(
          "No se pudieron verificar las carpetas de Google Drive.",
        );
      }

      const data = await response.json();
      const folderList = data.files || [];

      if (folderList.length > 0) {
        // Folder exists!
        const baseFolder = folderList[0];
        setFacultadFolderId(baseFolder.id);
        setCurrentFolderId(baseFolder.id);
        setBreadcrumbs([{ id: baseFolder.id, name: baseFolder.name }]);
      } else {
        // Fallback: search for any folder containing 'facultad' (case-insensitive)
        const fallbackQuery =
          "name contains 'facultad' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        const fallbackUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fallbackQuery)}&fields=files(id,name,mimeType)&pageSize=10`;

        const fallbackResponse = await fetch(fallbackUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const fallbackList = fallbackData.files || [];
          if (fallbackList.length > 0) {
            const baseFolder = fallbackList[0];
            setFacultadFolderId(baseFolder.id);
            setCurrentFolderId(baseFolder.id);
            setBreadcrumbs([{ id: baseFolder.id, name: baseFolder.name }]);
            return;
          }
        }

        // Not found, offer to create it
        setShowFolderNotFound(true);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al conectar con Google Drive.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetAsDefaultFolder = () => {
    if (!currentFolderId) return;
    const currentCrumb = breadcrumbs.find((b) => b.id === currentFolderId);
    const currentName = currentCrumb ? currentCrumb.name : "Carpeta de Facultad";
    
    localStorage.setItem("facultad_default_folder_id", currentFolderId);
    localStorage.setItem("facultad_default_folder_name", currentName);
    setFacultadFolderId(currentFolderId);
    setSuccessMsg(`La carpeta "${currentName}" ha sido configurada como tu carpeta predeterminada de Facultad.`);
    
    // Automatically clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMsg((prev) => (prev?.includes(currentName) ? null : prev));
    }, 5000);
  };

  const handleResetDefaultFolder = () => {
    localStorage.removeItem("facultad_default_folder_id");
    localStorage.removeItem("facultad_default_folder_name");
    setSuccessMsg("Se ha restablecido la carpeta predeterminada original de la Facultad.");
    initFacultadFolder();
    
    setTimeout(() => {
      setSuccessMsg((prev) => (prev?.includes("restablecido") ? null : prev));
    }, 5000);
  };

  const searchFoldersInDrive = async (term: string) => {
    setIsSearchingFolders(true);
    setFolderSearchError(null);
    try {
      // Escape single quotes to prevent broken API queries
      const escapedTerm = term.replace(/'/g, "\\'");
      let query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
      if (escapedTerm.trim()) {
        query += ` and name contains '${escapedTerm}'`;
      }
      
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime)&pageSize=30&orderBy=modifiedTime desc`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        throw new Error("No se pudieron buscar carpetas en tu Google Drive.");
      }
      
      const data = await response.json();
      setFolderSearchResults(data.files || []);
    } catch (err: any) {
      console.error(err);
      setFolderSearchError(err.message || "Error al buscar carpetas.");
    } finally {
      setIsSearchingFolders(false);
    }
  };

  const handleOpenSearchModal = () => {
    setIsSearchModalOpen(true);
    setFolderSearchTerm("");
    setFolderSearchResults([]);
    searchFoldersInDrive("");
  };

  const handleCreateBaseFolder = async () => {
    setIsCreatingBaseFolder(true);
    setErrorMsg(null);
    try {
      const url = "https://www.googleapis.com/drive/v3/files";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "1 - Facultad",
          mimeType: "application/vnd.google-apps.folder",
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo crear la carpeta en Google Drive.");
      }

      const newFolder = await response.json();
      setFacultadFolderId(newFolder.id);
      setCurrentFolderId(newFolder.id);
      setBreadcrumbs([{ id: newFolder.id, name: "1 - Facultad" }]);
      setShowFolderNotFound(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al crear la carpeta predeterminada.");
    } finally {
      setIsCreatingBaseFolder(false);
    }
  };

  const fetchFolderContents = async (
    folderId: string,
    searchVal: string = "",
  ) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let query = `'${folderId}' in parents and trashed = false`;
      if (searchVal.trim() !== "") {
        // Search inside current folder
        query += ` and name contains '${searchVal.replace(/'/g, "\\'")}'`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,iconLink,webViewLink,size,modifiedTime)&orderBy=folder,name&pageSize=100`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error("No se pudo recuperar el listado de archivos.");
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al cargar los archivos de la carpeta.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (currentFolderId) {
      fetchFolderContents(currentFolderId, searchQuery);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentFolderId) {
      fetchFolderContents(currentFolderId, searchQuery);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    if (currentFolderId) {
      fetchFolderContents(currentFolderId, "");
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    // Add folder to breadcrumbs
    const existingIndex = breadcrumbs.findIndex((b) => b.id === folderId);
    if (existingIndex !== -1) {
      // Clicked on a parent breadcrumb, truncate the trail to this point
      setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
    } else {
      setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
    }
    setCurrentFolderId(folderId);
    setSearchQuery("");
  };

  // Context Menu and clipboard helper methods
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const handlePaste = async () => {
    if (!clipboard || !accessToken || !currentFolderId) return;
    setIsPasting(true);
    setErrorMsg(null);
    try {
      if (clipboard.action === "copy") {
        // Split filename into base and extension to support clean numbered copying
        let baseName = clipboard.file.name;
        let extension = "";
        const lastDotIndex = clipboard.file.name.lastIndexOf(".");
        if (lastDotIndex > 0 && lastDotIndex < clipboard.file.name.length - 1) {
          baseName = clipboard.file.name.substring(0, lastDotIndex);
          extension = clipboard.file.name.substring(lastDotIndex);
        }

        const existingNames = new Set(files.map((f) => f.name.toLowerCase()));
        let targetName = clipboard.file.name;

        // If the file with the same name exists, automatically number it between parenthesis
        if (existingNames.has(targetName.toLowerCase())) {
          let counter = 1;
          while (true) {
            const candidate1 = `${baseName}(${counter})${extension}`;
            const candidate2 = `${baseName} (${counter})${extension}`;

            if (
              !existingNames.has(candidate1.toLowerCase()) &&
              !existingNames.has(candidate2.toLowerCase())
            ) {
              targetName = candidate1;
              break;
            } else if (!existingNames.has(candidate1.toLowerCase())) {
              targetName = candidate1;
              break;
            } else if (!existingNames.has(candidate2.toLowerCase())) {
              targetName = candidate2;
              break;
            }
            counter++;
          }
        }

        const url = `https://www.googleapis.com/drive/v3/files/${clipboard.file.id}/copy`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parents: [currentFolderId],
            name: targetName,
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo copiar el archivo en Google Drive.");
        }
      } else if (clipboard.action === "cut") {
        const fileId = clipboard.file.id;
        const sourceFolderId = clipboard.sourceFolderId;
        if (sourceFolderId === currentFolderId) {
          throw new Error("El archivo ya se encuentra en esta carpeta.");
        }

        let url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${currentFolderId}`;
        if (sourceFolderId) {
          url += `&removeParents=${sourceFolderId}`;
        }

        const response = await fetch(url, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("No se pudo mover el archivo en Google Drive.");
        }

        // Clear clipboard after a move (cut)
        setClipboard(null);
      }

      // Refresh folder contents
      fetchFolderContents(currentFolderId, searchQuery);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al realizar la operación de pegado.");
    } finally {
      setIsPasting(false);
    }
  };

  const getNextZIndex = () => {
    if (floatingWindows.length === 0) return 100;
    return Math.max(...floatingWindows.map((w) => w.zIndex)) + 1;
  };

  const openInFloatingWindow = (file: GoogleDriveFile) => {
    const existing = floatingWindows.find((w) => w.file.id === file.id);
    const nextZ = getNextZIndex();
    if (existing) {
      setFloatingWindows((prev) =>
        prev.map((w) => {
          if (w.file.id === file.id) {
            return { ...w, isMinimized: false, zIndex: nextZ };
          }
          return w;
        }),
      );
      return;
    }

    const offset = (floatingWindows.length % 8) * 25;
    const newWindow: FloatingWindow = {
      id: `win-${file.id}`,
      file: file,
      x: 100 + offset,
      y: 150 + offset,
      width: 680,
      height: 520,
      zIndex: nextZ,
      isMinimized: false,
      isMaximized: false,
      viewerMode: "preview",
      textContent: "",
      isFetchingTextContent: false,
      isSavingTextContent: false,
    };

    setFloatingWindows((prev) => [...prev, newWindow]);

    if (
      isPlainTextEditableFormat(file.mimeType, file.name) ||
      file.mimeType === "application/vnd.google-apps.document"
    ) {
      fetchFloatingWindowTextContent(newWindow.id, file.id, file.mimeType);
    }
  };

  const fetchFloatingWindowTextContent = async (
    windowId: string,
    fileId: string,
    mimeType?: string,
  ) => {
    setFloatingWindows((prev) =>
      prev.map((w) =>
        w.id === windowId ? { ...w, isFetchingTextContent: true } : w,
      ),
    );
    try {
      let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      if (mimeType === "application/vnd.google-apps.document") {
        url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error("No se pudo descargar el contenido del archivo.");
      }
      const text = await response.text();
      setFloatingWindows((prev) =>
        prev.map((w) =>
          w.id === windowId
            ? { ...w, textContent: text, isFetchingTextContent: false }
            : w,
        ),
      );
    } catch (err) {
      console.error(err);
      setFloatingWindows((prev) =>
        prev.map((w) =>
          w.id === windowId ? { ...w, isFetchingTextContent: false } : w,
        ),
      );
    }
  };

  const saveFloatingWindowTextContent = async (
    windowId: string,
    file: GoogleDriveFile,
    content: string,
  ) => {
    setFloatingWindows((prev) =>
      prev.map((w) =>
        w.id === windowId ? { ...w, isSavingTextContent: true } : w,
      ),
    );
    try {
      const url = `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": file.mimeType || "text/plain",
        },
        body: content,
      });

      if (!response.ok) {
        throw new Error("No se pudo guardar el archivo.");
      }
      setFloatingWindows((prev) =>
        prev.map((w) =>
          w.id === windowId ? { ...w, isSavingTextContent: false } : w,
        ),
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al guardar los cambios.");
      setFloatingWindows((prev) =>
        prev.map((w) =>
          w.id === windowId ? { ...w, isSavingTextContent: false } : w,
        ),
      );
    }
  };

  const showContextMenu = (
    e: React.MouseEvent,
    file: GoogleDriveFile | null,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 220;
    const menuHeight = file ? 280 : 160;

    let x = e.clientX;
    let y = e.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    x = Math.max(10, x);
    y = Math.max(10, y);

    setContextMenu({ x, y, file });
  };

  const minimizeAllFloatingWindows = () => {
    setFloatingWindows((prev) =>
      prev.map((w) => ({ ...w, isMinimized: true })),
    );
  };

  const cascadeFloatingWindows = () => {
    setFloatingWindows((prev) => {
      return prev.map((w, index) => {
        const offset = (index % 8) * 30;
        return {
          ...w,
          x: 100 + offset,
          y: 120 + offset,
          isMinimized: false,
          isMaximized: false,
          zIndex: 100 + index,
        };
      });
    });
  };

  const closeAllFloatingWindows = () => {
    setFloatingWindows([]);
  };

  const handleWindowDragStart = (e: React.MouseEvent, windowId: string) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setIsDraggingOrResizing(true);

    const nextZ = getNextZIndex();
    setFloatingWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, zIndex: nextZ } : w)),
    );

    const win = floatingWindows.find((w) => w.id === windowId);
    if (!win || win.isMaximized) {
      setIsDraggingOrResizing(false);
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = win.x;
    const initialY = win.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      setFloatingWindows((prev) =>
        prev.map((w) => {
          if (w.id === windowId) {
            return {
              ...w,
              x: Math.max(
                -w.width + 80,
                Math.min(window.innerWidth - 80, initialX + deltaX),
              ),
              y: Math.max(
                0,
                Math.min(window.innerHeight - 40, initialY + deltaY),
              ),
            };
          }
          return w;
        }),
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setIsDraggingOrResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleWindowResizeStart = (
    e: React.MouseEvent,
    windowId: string,
    direction: "e" | "s" | "se" = "se",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOrResizing(true);

    const win = floatingWindows.find((w) => w.id === windowId);
    if (!win || win.isMaximized) {
      setIsDraggingOrResizing(false);
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = win.width;
    const initialHeight = win.height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      setFloatingWindows((prev) =>
        prev.map((w) => {
          if (w.id === windowId) {
            return {
              ...w,
              width:
                direction === "s"
                  ? w.width
                  : Math.max(320, initialWidth + deltaX),
              height:
                direction === "e"
                  ? w.height
                  : Math.max(260, initialHeight + deltaY),
            };
          }
          return w;
        }),
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setIsDraggingOrResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleGoBack = () => {
    if (breadcrumbs.length <= 1) return;
    const parent = breadcrumbs[breadcrumbs.length - 2];
    setBreadcrumbs(breadcrumbs.slice(0, breadcrumbs.length - 1));
    setCurrentFolderId(parent.id);
    setSearchQuery("");
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    // Avoid triggering if clicking on buttons, inputs, links, or inside forms/menus
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("form") ||
      target.closest("a")
    ) {
      return;
    }
    setIsExplorerCollapsed(!isExplorerCollapsed);
  };

  // Create Sub-Folder Logic
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !currentFolderId) return;
    setIsCreatingFolder(true);
    setErrorMsg(null);
    try {
      const url = "https://www.googleapis.com/drive/v3/files";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          mimeType: "application/vnd.google-apps.folder",
          parents: [currentFolderId],
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo crear la carpeta.");
      }

      setNewFolderName("");
      setShowCreateFolderModal(false);
      handleRefresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al crear la subcarpeta.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Create Doc/Sheet/Slide Logic
  const handleCreateDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !currentFolderId) return;
    setIsCreatingDoc(true);
    setErrorMsg(null);
    try {
      const mimeType = `application/vnd.google-apps.${newDocType}`;
      const url = "https://www.googleapis.com/drive/v3/files";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newDocName.trim(),
          mimeType,
          parents: [currentFolderId],
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo crear el documento.");
      }

      const createdFile = await response.json();
      setNewDocName("");
      setShowCreateDocModal(false);
      handleRefresh();

      // Automatically open the newly created file in preview/edit
      setSelectedFile({
        id: createdFile.id,
        name: newDocName.trim(),
        mimeType: mimeType,
      });
      setViewerMode("edit");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al crear el documento.");
    } finally {
      setIsCreatingDoc(false);
    }
  };

  // Rename Logic
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;
    setIsRenaming(true);
    setErrorMsg(null);
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${renameTarget.id}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: renameValue.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo cambiar el nombre del archivo.");
      }

      setShowRenameModal(false);
      setRenameTarget(null);
      setRenameValue("");
      handleRefresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al renombrar el archivo.");
    } finally {
      setIsRenaming(false);
    }
  };

  // Delete Logic (With mandatory user confirmation modal)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${deleteTarget.id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error("No se pudo eliminar el archivo.");
      }

      setShowDeleteModal(false);
      setDeleteTarget(null);
      // Close viewer if the deleted file was open
      if (selectedFile && selectedFile.id === deleteTarget.id) {
        setSelectedFile(null);
      }
      handleRefresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al eliminar el archivo.");
    } finally {
      setIsDeleting(false);
    }
  };

  // File Upload Handling
  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !currentFolderId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const fileObj = fileList[i];

        // Google Drive multipart upload
        const metadata = {
          name: fileObj.name,
          parents: [currentFolderId],
        };

        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" }),
        );
        form.append("file", fileObj);

        const response = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: form,
          },
        );

        if (!response.ok) {
          throw new Error(`Error al subir el archivo: ${fileObj.name}`);
        }
      }
      handleRefresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ocurrió un error al subir los archivos.");
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and Drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const formatBytes = (bytes?: string, decimals = 1) => {
    if (!bytes) return "-";
    const b = parseInt(bytes);
    if (isNaN(b) || b === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (mimeType: string, isFolderHovered = false) => {
    if (mimeType === "application/vnd.google-apps.folder") {
      return <AnimatedFolder size={20} isHovered={isFolderHovered} className="text-primary" />;
    }
    if (mimeType.includes("document") || mimeType.includes("wordprocessing")) {
      return <FileText className="w-5 h-5 text-primary fill-blue-500/10" />;
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
      return (
        <FileSpreadsheet className="w-5 h-5 text-primary fill-primary/10" />
      );
    }
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
      return (
        <Presentation className="w-5 h-5 text-orange-500 fill-orange-500/10" />
      );
    }
    if (mimeType === "application/pdf") {
      return <FileCheck2 className="w-5 h-5 text-primary fill-primary/10" />;
    }
    if (mimeType.startsWith("image/")) {
      return <FileImage className="w-5 h-5 text-primary fill-indigo-500/10" />;
    }
    return <File className="w-5 h-5 text-slate-500 fill-slate-500/10" />;
  };

  const isGoogleDocFormat = (mimeType: string) => {
    return (
      mimeType === "application/vnd.google-apps.document" ||
      mimeType === "application/vnd.google-apps.spreadsheet" ||
      mimeType === "application/vnd.google-apps.presentation"
    );
  };

  const isIframeEditableFormat = (mimeType: string) => {
    return (
      mimeType === "application/vnd.google-apps.document" ||
      mimeType === "application/vnd.google-apps.spreadsheet" ||
      mimeType === "application/vnd.google-apps.presentation" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/msword" ||
      mimeType === "application/vnd.ms-excel" ||
      mimeType === "application/vnd.ms-powerpoint"
    );
  };

  const isPlainTextEditableFormat = (
    mimeType: string,
    fileName: string = "",
  ) => {
    if (!mimeType) return false;
    const isTextMime =
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/javascript" ||
      mimeType === "application/x-javascript" ||
      mimeType === "application/xml";
    if (isTextMime) return true;

    // Also check common file extensions
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return [
      "txt",
      "md",
      "json",
      "html",
      "css",
      "js",
      "ts",
      "tsx",
      "jsx",
      "xml",
      "csv",
    ].includes(ext);
  };

  const getIframeUrl = (file: GoogleDriveFile, mode: "preview" | "edit") => {
    const isEditable = isIframeEditableFormat(file.mimeType);
    if (mode === "preview" || !isEditable) {
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }

    // Editing URL
    if (
      file.mimeType === "application/vnd.google-apps.document" ||
      file.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimeType === "application/msword"
    ) {
      return `https://docs.google.com/document/d/${file.id}/edit?chrome=false&embedded=true`;
    }
    if (
      file.mimeType === "application/vnd.google-apps.spreadsheet" ||
      file.mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimeType === "application/vnd.ms-excel"
    ) {
      return `https://docs.google.com/spreadsheets/d/${file.id}/edit?widget=true&headers=false`;
    }
    if (
      file.mimeType === "application/vnd.google-apps.presentation" ||
      file.mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      file.mimeType === "application/vnd.ms-powerpoint"
    ) {
      return `https://docs.google.com/presentation/d/${file.id}/edit?rm=minimal`;
    }

    return `https://drive.google.com/file/d/${file.id}/preview`;
  };

  // If not logged in, show onboarding sign-in screen
  if (!accessToken) {
    return (
      <div
        className={`p-8 rounded-3xl border flex flex-col items-center text-center justify-center min-h-[450px] ${
          darkMode
            ? "bg-zinc-900/30 border-zinc-800/80"
            : "bg-white border-zinc-200"
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mb-6 text-primary dark:text-primary">
          <FolderOpen className="w-8 h-8" />
        </div>

        <h2
          className={`text-2xl font-bold mb-3 ${darkMode ? "text-white" : "text-zinc-800"}`}
        >
          Visualizador de Archivos de Facultad
        </h2>

        <p
          className={`text-sm max-w-md mb-8 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
        >
          Conecta tu cuenta de Google para acceder, previsualizar, editar y
          organizar de manera segura todas tus carpetas, apuntes, parciales y
          prácticos universitarios en Google Drive.
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-center gap-2 max-w-sm">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="relative inline-flex items-center gap-3.5 px-6 py-3 rounded-full text-sm font-semibold border transition-all duration-200 active:scale-98 shadow-sm cursor-pointer bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-800 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-100 disabled:opacity-50"
        >
          {isLoggingIn ? (
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          ) : (
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="w-5 h-5"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              ></path>
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              ></path>
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              ></path>
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              ></path>
            </svg>
          )}
          <span>Iniciar sesión con Google</span>
        </button>
      </div>
    );
  }

  // If logged in, but "1 - Facultad" folder doesn't exist
  if (showFolderNotFound) {
    return (
      <div
        className={`p-8 rounded-3xl border flex flex-col items-center text-center justify-center min-h-[450px] ${
          darkMode
            ? "bg-zinc-900/30 border-zinc-800/80"
            : "bg-white border-zinc-200"
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2
          className={`text-xl font-bold mb-3 ${darkMode ? "text-white" : "text-zinc-800"}`}
        >
          No se encontró la carpeta predeterminada
        </h2>

        <p
          className={`text-sm max-w-md mb-8 ${darkMode ? "text-zinc-400" : "text-zinc-500"}`}
        >
          No hemos encontrado ninguna carpeta llamada{" "}
          <span className="font-semibold text-slate-900 dark:text-zinc-100">
            "1 - Facultad"
          </span>{" "}
          en tu Google Drive. ¿Deseas crearla ahora para comenzar a guardar tus
          apuntes?
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3.5">
          <button
            onClick={handleCreateBaseFolder}
            disabled={isCreatingBaseFolder}
            className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white dark:text-blue-950 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-primary/20"
          >
            {isCreatingBaseFolder ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            Crear Carpeta "1 - Facultad"
          </button>

          <button
            onClick={handleDisconnect}
            className="px-5 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400 rounded-full text-xs font-semibold transition-all cursor-pointer"
          >
            Cerrar sesión de Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Google Account Info & Disconnect option */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          darkMode
            ? "bg-zinc-900/20 border-zinc-800/50"
            : "bg-slate-50 border-slate-100"
        }`}
      >
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full border border-zinc-200 dark:border-zinc-800"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary text-white dark:text-blue-950 font-bold flex items-center justify-center text-sm">
              {user?.displayName
                ? user.displayName[0].toUpperCase()
                : user?.email
                  ? user.email[0].toUpperCase()
                  : "G"}
            </div>
          )}
          <div>
            <p
              className={`text-xs font-bold leading-none ${darkMode ? "text-zinc-100" : "text-zinc-800"}`}
            >
              Google Drive Conectado
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              {user?.email || "Usuario de Google"}
            </p>
          </div>
        </div>

        <button
          onClick={handleDisconnect}
          className="px-3.5 py-1.5 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full text-[11px] font-semibold transition-all cursor-pointer"
        >
          Desconectar Google Drive
        </button>
      </div>

      {/* Main File Explorer Panel */}
      <div
        className={`rounded-3xl border flex flex-col transition-all duration-300 relative ${
          isExplorerCollapsed ? "min-h-0" : "min-h-[500px]"
        } ${
          darkMode
            ? "bg-zinc-900/30 border-zinc-800/80 text-zinc-100"
            : "bg-white border-zinc-200 text-zinc-800"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag over overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-xs border-2 border-dashed border-primary rounded-3xl flex flex-col items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-primary text-white dark:text-blue-950 flex items-center justify-center animate-bounce shadow-lg shadow-primary/20">
              <Upload className="w-8 h-8" />
            </div>
            <p className="mt-4 font-bold text-primary dark:text-primary">
              Suelta los archivos para subirlos a esta carpeta
            </p>
          </div>
        )}

        {/* Toolbar Header */}
        <div
          onClick={handleHeaderClick}
          className={`p-5 flex flex-col gap-4 cursor-pointer hover:bg-zinc-500/[0.01] transition-all duration-200 select-none ${
            isExplorerCollapsed
              ? ""
              : "border-b border-zinc-200 dark:border-zinc-800/60"
          }`}
          title="Haz clic en cualquier parte vacía de esta barra para colapsar o expandir el explorador de carpetas"
        >
          {/* Breadcrumbs Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs flex-wrap w-full">
            {breadcrumbs.length > 1 && (
              <button
                onClick={handleGoBack}
                className="p-1 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 text-zinc-500 cursor-pointer shrink-0"
                title="Volver"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
                <button
                  onClick={() => navigateToFolder(crumb.id, crumb.name)}
                  className={`font-semibold transition-colors truncate max-w-[120px] cursor-pointer hover:text-primary shrink-0 ${
                    idx === breadcrumbs.length - 1
                      ? "text-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                  style={!darkMode && idx === breadcrumbs.length - 1 ? { color: "#000000" } : undefined}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Action Toolbar Row - under the breadcrumbs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            {/* Left side actions (Predeterminada status, Cambiar carpeta, Ocultar carpetas) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Configuración de Carpeta Predeterminada de Facultad */}
              {currentFolderId && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20"
                    title="Esta es tu carpeta predeterminada de Facultad"
                  >
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Predeterminada</span>
                  </span>

                  {/* Botón para cambiar la carpeta predeterminada desde Google Drive */}
                  <button
                    onClick={handleOpenSearchModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-zinc-300 dark:border-zinc-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-zinc-500 dark:text-zinc-400 cursor-pointer bg-transparent"
                    title="Buscar y elegir cualquier carpeta de tu Google Drive como predeterminada"
                  >
                    <Search className="w-2.5 h-2.5 text-primary" />
                    <span>Cambiar Carpeta</span>
                  </button>

                  {/* Si hay una carpeta personalizada guardada en localStorage, permitir restablecerla */}
                  {localStorage.getItem("facultad_default_folder_id") && (
                    <button
                      onClick={handleResetDefaultFolder}
                      className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors border border-zinc-200 dark:border-zinc-800"
                      title="Restablecer carpeta predeterminada original de Facultad (1 - Facultad)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Collapse/Expand Toggle button */}
              <button
                onClick={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
                className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 text-zinc-500 cursor-pointer shrink-0 flex items-center gap-1.5 transition-all"
                title={
                  isExplorerCollapsed
                    ? "Mostrar archivos y carpetas"
                    : "Ocultar archivos y carpetas"
                }
              >
                {isExplorerCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 animate-pulse text-primary" />
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      Mostrar Carpetas
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      Ocultar Carpetas
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Right side actions (Search, Refresh, Layout Toggles, Create & Upload Actions) */}
            {!isExplorerCollapsed && (
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {/* Search Input */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative flex-1 sm:flex-initial "
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar archivos..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Search className="w-3.5 h-3.5 text-primary absolute left-2.5 top-1/2 -translate-y-1/2" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>

                {/* Refresh */}
                <button
                  onClick={handleRefresh}
                  className="p-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 text-zinc-500 cursor-pointer"
                  title="Actualizar carpeta"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Layout Toggles */}
                <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === "grid" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"}`}
                    title="Vista de cuadrícula"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === "list" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"}`}
                    title="Vista de lista"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Create Actions Button */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateFolderModal(true)}
                    className="p-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 text-zinc-500 cursor-pointer"
                    title="Crear Nueva Carpeta"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleUploadFiles(e.target.files)}
                    className="hidden"
                    multiple
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="m-4 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Global Success Notice */}
        {successMsg && (
          <div className="m-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
            <button
              onClick={() => setSuccessMsg(null)}
              className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Files/Folders Grid or List Area */}
        {!isExplorerCollapsed && (
          <div
            className="p-5 flex-1 flex flex-col justify-between"
            onContextMenu={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("[data-file-item]")) return;
              showContextMenu(e, null);
            }}
          >
            {isLoading ? (
              <div className="flex-1 flex flex-col gap-5">
                {/* Loader Alert Bar at the top */}
                <div className="flex items-center gap-3 p-3.5 px-4 rounded-xl border border-primary/20 bg-primary/[0.03] text-primary/90 text-xs font-semibold animate-pulse shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                  <span>Sincronizando y cargando apuntes de Google Drive...</span>
                </div>

                {viewMode === "grid" ? (
                  /* Grid skeleton layout */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={`skeleton-grid-${i}`}
                        className={`p-4 rounded-2xl border flex flex-col justify-between h-36 select-none relative overflow-hidden animate-pulse ${
                          darkMode
                            ? "bg-zinc-900/30 border-zinc-800/80"
                            : "bg-white border-zinc-200/90"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          {/* Animated folder skeleton shape */}
                          <div className="w-10 h-10 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/40" />
                        </div>
                        <div className="space-y-2 mt-4">
                          <div className="h-3 w-5/6 rounded bg-zinc-200/50 dark:bg-zinc-800/40" />
                          <div className="h-2 w-1/2 rounded bg-zinc-200/30 dark:bg-zinc-800/20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List skeleton layout */
                  <div className="overflow-x-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 animate-pulse">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr
                          className={`border-b text-xs font-bold uppercase tracking-wider ${ darkMode ?"bg-zinc-950/40 border-zinc-800/60 text-zinc-400"
                              : "bg-slate-50 border-slate-100 text-slate-500"
                          }`}
                        >
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Última Modificación</th>
                          <th className="px-4 py-3">Tamaño</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <tr key={`skeleton-list-${i}`}>
                            <td className="px-4 py-3.5 flex items-center gap-3 font-semibold">
                              <div className="w-9 h-9 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/40 shrink-0" />
                              <div className="h-3.5 w-48 rounded bg-zinc-200/50 dark:bg-zinc-800/40" />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="h-3 w-28 rounded bg-zinc-200/40 dark:bg-zinc-800/30" />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="h-3 w-16 rounded bg-zinc-200/40 dark:bg-zinc-800/30" />
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="inline-block h-6 w-16 rounded bg-zinc-200/30 dark:bg-zinc-800/20" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <FolderOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4 animate-pulse" />
                <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                  Esta carpeta está vacía
                </p>
                <p className="text-xs text-zinc-400 max-w-xs mt-1.5">
                  Crea un nuevo documento o arrastra tus apuntes universitarios
                  aquí para comenzar a organizarlos.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir tu primer archivo</span>
                </button>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  /* Grid view rendering */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        data-file-item="true"
                        onMouseEnter={() => setHoveredFileId(file.id)}
                        onMouseLeave={() => setHoveredFileId(null)}
                        onContextMenu={(e) => showContextMenu(e, file)}
                        onMouseDown={(e) => {
                          if (e.button === 1 || e.button === 3) {
                            e.preventDefault();
                            if (file.mimeType !== "application/vnd.google-apps.folder") {
                              const fileUrl =
                                file.webViewLink ||
                                `https://drive.google.com/file/d/${file.id}/view`;
                              window.open(fileUrl, "_blank", "noopener,noreferrer");
                            } else {
                              navigateToFolder(file.id, file.name);
                            }
                          }
                        }}
                        onClick={() => {
                          if (
                            file.mimeType ===
                            "application/vnd.google-apps.folder"
                          ) {
                            navigateToFolder(file.id, file.name);
                          } else {
                            setSelectedFile(file);
                            setViewerMode("preview");
                          }
                        }}
                        className={`group p-3 rounded-2xl border transition-all duration-200 select-none flex flex-col justify-between h-36 cursor-pointer hover:-translate-y-0.5 ${
                          selectedFile?.id === file.id
                            ? "bg-blue-50/40 dark:bg-blue-950/15 border-primary dark:border-primary/30"
                            : darkMode
                              ? "bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/70 hover:border-zinc-700"
                              : "bg-white border-zinc-200/90 hover:bg-slate-50/70 hover:border-zinc-300"
                        }`}
                      >
                        {/* Top part: Icon & Menu */}
                        <div className="flex items-start justify-between">
                          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/50 dark:border-zinc-800/30">
                            {getFileIcon(file.mimeType, hoveredFileId === file.id)}
                          </div>

                          {/* Action buttons inside card */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameTarget(file);
                                setRenameValue(file.name);
                                setShowRenameModal(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                              title="Renombrar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(file);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom part: Name & Type details */}
                        <div className="mt-4">
                          <p
                            className={`text-xs font-bold truncate ${darkMode ? "text-zinc-100" : "text-zinc-800"}`}
                            style={!darkMode ? { color: "#000000" } : undefined}
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
                            {file.mimeType ===
                            "application/vnd.google-apps.folder"
                              ? "Carpeta"
                              : formatBytes(file.size)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* List view rendering */
                  <div className="overflow-x-auto max-h-[210px] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
            <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-20">
                        <tr
                          className={`border-b text-xs font-bold uppercase tracking-wider ${darkMode ?"bg-zinc-950/40 border-zinc-800/60 text-zinc-400" : "bg-slate-50 border-slate-100 text-slate-500"}`}
                        >
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Última Modificación</th>
                          <th className="px-4 py-3">Tamaño</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                        {files.map((file) => (
                          <tr
                            key={file.id}
                            data-file-item="true"
                            onMouseEnter={() => setHoveredFileId(file.id)}
                            onMouseLeave={() => setHoveredFileId(null)}
                            onContextMenu={(e) => showContextMenu(e, file)}
                            onAuxClick={(e) => {
                              if (e.button === 1) {
                                e.preventDefault();
                                if (file.mimeType !== "application/vnd.google-apps.folder") {
                                  const fileUrl =
                                    file.webViewLink ||
                                    `https://drive.google.com/file/d/${file.id}/view`;
                                  window.open(fileUrl, "_blank", "noopener,noreferrer");
                                } else {
                                  navigateToFolder(file.id, file.name);
                                }
                              }
                            }}
                            onClick={() => {
                              if (
                                file.mimeType ===
                                "application/vnd.google-apps.folder"
                              ) {
                                navigateToFolder(file.id, file.name);
                              } else {
                                setSelectedFile(file);
                                setViewerMode("preview");
                              }
                            }}
                            className={`hover:bg-slate-50/60 dark:hover:bg-zinc-900/30 cursor-pointer transition-colors ${
                              selectedFile?.id === file.id
                                ? "bg-blue-50/20 dark:bg-blue-950/10"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-3.5 flex items-center gap-3 font-semibold truncate max-w-xs md:max-w-md">
                              <div className="shrink-0">
                                {getFileIcon(file.mimeType, hoveredFileId === file.id)}
                              </div>
                              <span
                                className={
                                  darkMode ? "text-zinc-100" : "text-zinc-800"
                                }
                                style={!darkMode ? { color: "#000000" } : undefined}
                              >
                                {file.name}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400">
                              {formatDate(file.modifiedTime)}
                            </td>
                            <td className="px-4 py-3.5 text-zinc-500 dark:text-zinc-400">
                              {file.mimeType ===
                              "application/vnd.google-apps.folder"
                                ? "Carpeta"
                                : formatBytes(file.size)}
                            </td>
                            <td
                              className="px-4 py-3.5 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setRenameTarget(file);
                                    setRenameValue(file.name);
                                    setShowRenameModal(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
                                  title="Renombrar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteTarget(file);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {file.mimeType !==
                                  "application/vnd.google-apps.folder" && (
                                  <button
                                    onClick={() => {
                                      setSelectedFile(file);
                                      setViewerMode("preview");
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-primary cursor-pointer"
                                    title="Ver archivo"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Embedded File Viewer & Editor Panel (Directly inside the page) */}
      {selectedFile && (
        <div
          className={`rounded-3xl border overflow-hidden p-6 ${
            darkMode
              ? "bg-zinc-900/30 border-zinc-800/80 text-zinc-100"
              : "bg-white border-zinc-200 text-zinc-800"
          }`}
        >
          {/* Viewer Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800/60 pb-4 mb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800">
                {getFileIcon(selectedFile.mimeType)}
              </div>
              <div>
                <h3
                  className={`text-sm font-bold truncate max-w-xs md:max-w-md ${darkMode ? "text-white" : "text-zinc-800"}`}
                >
                  {selectedFile.name}
                </h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                  {selectedFile.mimeType ===
                  "application/vnd.google-apps.folder"
                    ? "Carpeta"
                    : "Documento de la Facultad"}
                </p>
              </div>
            </div>

            {/* Viewer Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* If it is an iframe-editable format or plain-text-editable, offer Edit Mode tab */}
              {isIframeEditableFormat(selectedFile.mimeType) ||
              isPlainTextEditableFormat(
                selectedFile.mimeType,
                selectedFile.name,
              ) ? (
                <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5">
                  <button
                    onClick={() => setViewerMode("preview")}
                    className={`px-3 py-1.5 rounded-full cursor-pointer text-[11px] font-semibold transition-colors ${viewerMode === "preview" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"}`}
                  >
                    Vista Previa
                  </button>
                  <button
                    onClick={() => setViewerMode("edit")}
                    className={`px-3 py-1.5 rounded-full cursor-pointer text-[11px] font-semibold transition-colors ${viewerMode === "edit" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"}`}
                  >
                    Editar Apunte
                  </button>
                </div>
              ) : (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-zinc-500 font-semibold">
                  Solo Lectura (Iframe Google Drive)
                </span>
              )}

              {/* Action buttons */}
              {selectedFile.webViewLink && (
                <a
                  href={selectedFile.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 rounded-full text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Abrir en Google Drive</span>
                </a>
              )}

              <button
                onClick={() => {
                  setDeleteTarget(selectedFile);
                  setShowDeleteModal(true);
                }}
                className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 cursor-pointer"
                title="Eliminar este archivo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSelectedFile(null)}
                className="p-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 text-zinc-500 cursor-pointer ml-1"
                title="Cerrar Visualizador"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Viewport Container (Iframe or Local Plain Text Editor) */}
          <div className="w-full border border-zinc-200 dark:border-zinc-800/60 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 overflow-hidden h-[600px] shadow-inner relative flex flex-col">
            {viewerMode === "edit" &&
            isPlainTextEditableFormat(
              selectedFile.mimeType,
              selectedFile.name,
            ) ? (
              <div className="flex-1 flex flex-col bg-zinc-900 text-zinc-100 font-mono text-sm p-4 relative">
                {isFetchingTextContent ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <p className="text-xs text-zinc-400">
                      Descargando contenido...
                    </p>
                  </div>
                ) : (
                  <>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="flex-1 w-full bg-zinc-950 text-zinc-200 resize-none outline-none border border-zinc-800 rounded-xl p-3.5 font-mono text-xs overflow-y-auto leading-relaxed focus:border-zinc-700"
                      placeholder="Escribe el contenido de tu apunte aquí..."
                    />
                    <div className="pt-3.5 flex items-center justify-between shrink-0">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                        Formato: {selectedFile.mimeType || "text/plain"}
                      </span>
                      <button
                        onClick={handleSaveTextContent}
                        disabled={isSavingTextContent}
                        className="px-4.5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white dark:text-blue-950 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/20 transition-all"
                      >
                        {isSavingTextContent ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Guardar Cambios</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <iframe
                src={getIframeUrl(selectedFile, viewerMode)}
                className="w-full h-full border-none rounded-2xl"
                allow="autoplay"
                title={selectedFile.name}
              />
            )}
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 bg-primary-container p-3 rounded-xl border border-primary/30">
            <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
            <p>
              En el modo{" "}
              <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                "Editar Apunte"
              </span>{" "}
              puedes editar el documento en tiempo real y todos los cambios se
              guardarán automáticamente en tu cuenta de Google Drive.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: Select Default Facultad Folder */}
      {isSearchModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div
              className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl flex flex-col max-h-[85vh] ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-primary animate-pulse" />
                  <span>Definir carpeta predeterminada de Facultad</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                Busca y selecciona cualquier carpeta de tu Google Drive para establecerla como el inicio por defecto de tu sección Facultad.
              </p>

              {/* Search Bar */}
              <div className="relative mb-4 shrink-0">
                <input
                  type="text"
                  value={folderSearchTerm}
                  onChange={(e) => setFolderSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      searchFoldersInDrive(folderSearchTerm);
                    }
                  }}
                  placeholder="Escribe el nombre de la carpeta..."
                  className="w-full pl-9 pr-24 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-700 dark:placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  onClick={() => searchFoldersInDrive(folderSearchTerm)}
                  disabled={isSearchingFolders}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-white dark:text-blue-950 rounded-lg text-[10px] font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                >
                  {isSearchingFolders ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>Buscar</span>
                  )}
                </button>
              </div>

              {/* Results Container */}
              <div className="flex-1 overflow-y-auto pr-1 min-h-[200px] max-h-[300px] border-y border-zinc-100 dark:border-zinc-950/40 py-2">
                {isSearchingFolders ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                    <p className="text-xs">Buscando carpetas en tu Google Drive...</p>
                  </div>
                ) : folderSearchError ? (
                  <div className="flex flex-col items-center justify-center py-10 text-red-500 text-xs text-center">
                    <AlertTriangle className="w-6 h-6 mb-2 text-red-500" />
                    <p>{folderSearchError}</p>
                    <button
                      onClick={() => searchFoldersInDrive(folderSearchTerm)}
                      className="mt-2 text-primary hover:underline text-[10px] font-bold"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : folderSearchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-400 text-xs text-center">
                    <Folder className="w-6 h-6 mb-2 opacity-40 animate-bounce" />
                    <p>No se encontraron carpetas.</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Intenta buscar con otra palabra clave.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {folderSearchResults.map((folder) => {
                      const isCurrentlyDefault = folder.id === facultadFolderId;
                      return (
                        <div
                          key={folder.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                            isCurrentlyDefault
                              ? "bg-primary/5 border-primary/30 text-primary"
                              : "border-zinc-100 dark:border-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Folder className={`w-4 h-4 shrink-0 ${isCurrentlyDefault ? "text-primary" : "text-zinc-400"}`} />
                            <div className="min-w-0 flex-1">
                              <p 
                                className="font-semibold truncate text-zinc-800 dark:text-zinc-100"
                                style={!darkMode ? { color: "#000000" } : undefined}
                              >
                                {folder.name}
                              </p>
                              {folder.modifiedTime && (
                                <p className="text-[9px] text-zinc-400">
                                  Modificado: {new Date(folder.modifiedTime).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isCurrentlyDefault ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                <Check className="w-2.5 h-2.5" />
                                <span>Activo</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  localStorage.setItem("facultad_default_folder_id", folder.id);
                                  localStorage.setItem("facultad_default_folder_name", folder.name);
                                  setFacultadFolderId(folder.id);
                                  setCurrentFolderId(folder.id);
                                  setBreadcrumbs([{ id: folder.id, name: folder.name }]);
                                  setSuccessMsg(`La carpeta "${folder.name}" ahora es tu carpeta predeterminada de Facultad.`);
                                  setIsSearchModalOpen(false);
                                  fetchFolderContents(folder.id, "");
                                }}
                                className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-primary hover:text-white dark:hover:text-blue-950 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-none text-zinc-700 dark:text-zinc-300"
                              >
                                Seleccionar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 text-xs shrink-0 pt-4 mt-auto">
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(false)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer font-semibold text-zinc-600 dark:text-zinc-300 bg-transparent"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL: Create Folder */}
      {showCreateFolderModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <h3 className="text-sm font-bold mb-4">
                Nueva Carpeta de Facultad
              </h3>
              <form onSubmit={handleCreateFolderSubmit}>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ej: Álgebra, Historia, Trabajos Prácticos"
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:border-primary outline-none mb-4"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateFolderModal(false);
                      setNewFolderName("");
                    }}
                    className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingFolder || !newFolderName.trim()}
                    className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 rounded-full font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingFolder && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Crear
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* MODAL: Create Document / Sheet / Slide */}
      {showCreateDocModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <h3 className="text-sm font-bold mb-4">
                Crear Nuevo Apunte o Planilla
              </h3>
              <form onSubmit={handleCreateDocSubmit}>
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">
                    Tipo de Archivo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewDocType("document")}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-[11px] font-semibold cursor-pointer ${
                        newDocType === "document"
                          ? "border-primary bg-primary-container text-primary dark:text-primary"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <FileText className="w-5 h-5 text-primary" />
                      Documento
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewDocType("spreadsheet")}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-[11px] font-semibold cursor-pointer ${
                        newDocType === "spreadsheet"
                          ? "border-primary bg-primary/10 text-primary dark:text-primary"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <FileSpreadsheet className="w-5 h-5 text-primary" />
                      Planilla
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewDocType("presentation")}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-[11px] font-semibold cursor-pointer ${
                        newDocType === "presentation"
                          ? "border-orange-500 bg-orange-500/5 text-orange-600 dark:text-orange-400"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <Presentation className="w-5 h-5 text-orange-500" />
                      Presentación
                    </button>
                  </div>
                </div>

                <div className="mb-4.5">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">
                    Nombre del Archivo
                  </label>
                  <input
                    type="text"
                    required
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Ej: Resumen Matemática, Lista de Lecturas"
                    className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:border-primary outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDocModal(false);
                      setNewDocName("");
                    }}
                    className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDoc || !newDocName.trim()}
                    className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 rounded-full font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isCreatingDoc && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Crear y Editar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* MODAL: Rename Target */}
      {showRenameModal &&
        renameTarget &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <h3 className="text-sm font-bold mb-4">
                Cambiar nombre del Archivo
              </h3>
              <form onSubmit={handleRenameSubmit}>
                <input
                  type="text"
                  required
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:border-primary outline-none mb-4"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    disabled={isRenaming}
                    onClick={() => {
                      if (!isRenaming) {
                        setShowRenameModal(false);
                        setRenameTarget(null);
                      }
                    }}
                    className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isRenaming ||
                      !renameValue.trim() ||
                      renameValue.trim() === renameTarget.name
                    }
                    className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white dark:text-blue-950 rounded-full font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isRenaming ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* MODAL: Confirm File/Folder Deletion (Mandatory Confirmation) */}
      {showDeleteModal &&
        deleteTarget &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div
              className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl ${
                darkMode
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-white border-zinc-200 text-zinc-800"
              }`}
            >
              <div className="flex items-center gap-3 text-red-500 mb-3.5">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-bold">¿Eliminar elemento?</h3>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
                ¿Estás seguro de que deseas eliminar{" "}
                <span className="font-bold text-zinc-800 dark:text-zinc-100">
                  "{deleteTarget.name}"
                </span>
                ? Esta acción se sincronizará con tu Google Drive y no se podrá
                deshacer.
              </p>

              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTarget(null);
                  }}
                  className="px-3.5 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Confirmar y Eliminar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* CUSTOM CONTEXT MENU */}
      {contextMenu &&
        createPortal(
          <div
            className={`fixed z-[99999] min-w-[210px] rounded-2xl border p-1.5 shadow-2xl backdrop-blur-md transition-all duration-150 ${
              darkMode
                ? "bg-zinc-950/95 border-zinc-800 text-zinc-100"
                : "bg-white/95 border-zinc-200 text-zinc-800"
            }`}
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.file ? (
              <div className="flex flex-col gap-0.5 text-xs font-semibold">
                <div className="px-2.5 py-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 truncate border-b border-zinc-100 dark:border-zinc-800/60 font-bold mb-1 max-w-[190px]">
                  {contextMenu.file.name}
                </div>

                <button
                  onClick={() => {
                    if (contextMenu.file) {
                      if (
                        contextMenu.file.mimeType ===
                        "application/vnd.google-apps.folder"
                      ) {
                        navigateToFolder(
                          contextMenu.file.id,
                          contextMenu.file.name,
                        );
                      } else {
                        setSelectedFile(contextMenu.file);
                        setViewerMode("preview");
                      }
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>Abrir</span>
                </button>

                {contextMenu.file.mimeType !==
                  "application/vnd.google-apps.folder" && (
                  <button
                    onClick={() => {
                      if (contextMenu.file) {
                        const fileUrl =
                          contextMenu.file.webViewLink ||
                          `https://drive.google.com/file/d/${contextMenu.file.id}/view`;
                        window.open(fileUrl, "_blank", "noopener,noreferrer");
                      }
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors text-primary"
                  >
                    <ExternalLink className="w-3.5 h-3.5 animate-pulse" />
                    <span>Ventana flotante</span>
                  </button>
                )}

                <hr className="my-1 border-zinc-100 dark:border-zinc-800/60" />

                <button
                  onClick={() => {
                    if (contextMenu.file) {
                      setClipboard({
                        file: contextMenu.file,
                        action: "copy",
                        sourceFolderId: currentFolderId,
                      });
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copiar</span>
                </button>

                <button
                  onClick={() => {
                    if (contextMenu.file) {
                      setClipboard({
                        file: contextMenu.file,
                        action: "cut",
                        sourceFolderId: currentFolderId,
                      });
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Scissors className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Cortar</span>
                </button>

                <button
                  onClick={() => {
                    handlePaste();
                    setContextMenu(null);
                  }}
                  disabled={!clipboard || isPasting}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Clipboard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Pegar</span>
                </button>

                <hr className="my-1 border-zinc-100 dark:border-zinc-800/60" />

                <button
                  onClick={() => {
                    if (contextMenu.file) {
                      setRenameTarget(contextMenu.file);
                      setRenameValue(contextMenu.file.name);
                      setShowRenameModal(true);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Renombrar</span>
                </button>

                <button
                  onClick={() => {
                    if (contextMenu.file) {
                      setDeleteTarget(contextMenu.file);
                      setShowDeleteModal(true);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-red-500/10 dark:hover:bg-red-500/10 hover:text-red-500 text-red-400/90 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setShowCreateDocModal(true);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Nuevo Apunte</span>
                </button>

                <button
                  onClick={() => {
                    setShowCreateFolderModal(true);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Folder className="w-3.5 h-3.5 text-primary" />
                  <span>Nueva Carpeta</span>
                </button>

                <hr className="my-1 border-zinc-100 dark:border-zinc-800/60" />

                <button
                  onClick={() => {
                    handlePaste();
                    setContextMenu(null);
                  }}
                  disabled={!clipboard || isPasting}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-40 disabled:pointer-events-none text-primary"
                >
                  {isPasting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Clipboard className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Pegar archivo{" "}
                    {clipboard
                      ? `("${clipboard.file.name.substring(0, 15)}...")`
                      : ""}
                  </span>
                </button>

                <button
                  onClick={() => {
                    handleRefresh();
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Actualizar Carpeta</span>
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}

      {/* FLOATING RESIZABLE WINDOWS LAYER */}
      {createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9990] overflow-visible">
          {floatingWindows.map((win) => {
            const isTextFile = isPlainTextEditableFormat(
              win.file.mimeType,
              win.file.name,
            );
            const isEditable =
              isIframeEditableFormat(win.file.mimeType) || isTextFile;

            return (
              <div
                key={win.id}
                className={`absolute pointer-events-auto flex flex-col border shadow-2xl transition-all duration-100 rounded-3xl overflow-hidden ${
                  darkMode
                    ? "bg-zinc-950/95 border-zinc-800 text-zinc-100 shadow-black/70"
                    : "bg-white/95 border-zinc-200 text-zinc-800 shadow-zinc-400/40"
                }`}
                style={{
                  zIndex: win.zIndex,
                  top: win.isMaximized ? "1rem" : `${win.y}px`,
                  left: win.isMaximized ? "1rem" : `${win.x}px`,
                  width: win.isMaximized
                    ? "calc(100vw - 2rem)"
                    : `${win.width}px`,
                  height: win.isMaximized
                    ? "calc(100vh - 2rem)"
                    : win.isMinimized
                      ? "46px"
                      : `${win.height}px`,
                }}
                onClick={() => {
                  const nextZ = getNextZIndex();
                  if (win.zIndex < nextZ - 1) {
                    setFloatingWindows((prev) =>
                      prev.map((w) =>
                        w.id === win.id ? { ...w, zIndex: nextZ } : w,
                      ),
                    );
                  }
                }}
              >
                {/* Window Header */}
                <div
                  className={`px-4 py-3 flex items-center justify-between cursor-move shrink-0 select-none ${
                    darkMode
                      ? "bg-zinc-900/90 border-b border-zinc-800"
                      : "bg-zinc-50 border-b border-zinc-150"
                  }`}
                  onMouseDown={(e) => handleWindowDragStart(e, win.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1 rounded-lg bg-primary/10 shrink-0">
                      {getFileIcon(win.file.mimeType)}
                    </div>
                    <span
                      className="text-xs font-bold truncate pr-3"
                      title={win.file.name}
                    >
                      {win.file.name}
                    </span>
                    {win.isMinimized && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-container text-primary font-bold shrink-0">
                        Minimizado
                      </span>
                    )}
                  </div>

                  {/* Window Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setFloatingWindows((prev) =>
                          prev.map((w) =>
                            w.id === win.id
                              ? { ...w, isMinimized: !w.isMinimized }
                              : w,
                          ),
                        );
                      }}
                      className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                      title={win.isMinimized ? "Expandir" : "Minimizar"}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setFloatingWindows((prev) =>
                          prev.map((w) =>
                            w.id === win.id
                              ? {
                                  ...w,
                                  isMaximized: !w.isMaximized,
                                  isMinimized: false,
                                }
                              : w,
                          ),
                        );
                      }}
                      className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                      title={win.isMaximized ? "Restaurar" : "Maximizar"}
                    >
                      {win.isMaximized ? (
                        <Minimize2 className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setFloatingWindows((prev) =>
                          prev.filter((w) => w.id !== win.id),
                        );
                      }}
                      className="p-1.5 rounded-md hover:bg-red-500/15 hover:text-red-500 text-zinc-400 cursor-pointer transition-colors"
                      title="Cerrar ventana"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Window Body */}
                {!win.isMinimized && (
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
                    {isEditable && (
                      <div
                        className={`px-4 py-2 border-b flex items-center justify-between shrink-0 text-[10px] font-bold ${
                          darkMode
                            ? "bg-zinc-950/80 border-zinc-800"
                            : "bg-zinc-100/50 border-zinc-200"
                        }`}
                      >
                        <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-white dark:bg-zinc-950 shadow-xs">
                          <button
                            onClick={() => {
                              setFloatingWindows((prev) =>
                                prev.map((w) =>
                                  w.id === win.id
                                    ? { ...w, viewerMode: "preview" }
                                    : w,
                                ),
                              );
                            }}
                            className={`px-3 py-0.5 rounded-full cursor-pointer text-[10px] font-bold transition-colors ${win.viewerMode === "preview" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"}`}
                          >
                            Vista Previa
                          </button>
                          <button
                            onClick={() => {
                              setFloatingWindows((prev) =>
                                prev.map((w) =>
                                  w.id === win.id
                                    ? { ...w, viewerMode: "edit" }
                                    : w,
                                ),
                              );
                            }}
                            className={`px-3 py-0.5 rounded-full cursor-pointer text-[10px] font-bold transition-colors ${win.viewerMode === "edit" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"}`}
                          >
                            Editar
                          </button>
                        </div>

                        {win.file.webViewLink && (
                          <a
                            href={win.file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 hover:text-primary transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Abrir en Google Drive</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Viewport Content */}
                    <div className="flex-1 min-h-0 bg-zinc-50 dark:bg-zinc-950/20 flex flex-col relative">
                      {/* Overlay to block iframe pointer interaction while dragging/resizing */}
                      {isDraggingOrResizing && (
                        <div className="absolute inset-0 z-[999] bg-transparent" />
                      )}
                      {win.viewerMode === "edit" && isTextFile ? (
                        <div className="flex-1 flex flex-col bg-zinc-900 text-zinc-100 font-mono text-sm p-4 relative">
                          {win.isFetchingTextContent ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                              <p className="text-[11px] text-zinc-400">
                                Descargando contenido...
                              </p>
                            </div>
                          ) : (
                            <>
                              <textarea
                                value={win.textContent}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFloatingWindows((prev) =>
                                    prev.map((w) =>
                                      w.id === win.id
                                        ? { ...w, textContent: val }
                                        : w,
                                    ),
                                  );
                                }}
                                className="flex-1 w-full bg-zinc-950 text-zinc-200 resize-none outline-none border border-zinc-800 rounded-xl p-3.5 font-mono text-xs overflow-y-auto leading-relaxed focus:border-zinc-700"
                                placeholder="Escribe el contenido de tu apunte universitario aquí..."
                              />
                              <div className="pt-2 flex items-center justify-end shrink-0">
                                <button
                                  onClick={() =>
                                    saveFloatingWindowTextContent(
                                      win.id,
                                      win.file,
                                      win.textContent,
                                    )
                                  }
                                  disabled={win.isSavingTextContent}
                                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white dark:text-blue-950 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                                >
                                  {win.isSavingTextContent ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Guardando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Guardar Apunte</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <iframe
                          src={getIframeUrl(win.file, win.viewerMode)}
                          className="w-full h-full border-none rounded-b-2xl"
                          allow="autoplay"
                          referrerPolicy="no-referrer"
                          title={win.file.name}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Resize Handles */}
                {!win.isMaximized && !win.isMinimized && (
                  <>
                    {/* Right Edge Resize Handle */}
                    <div
                      className="absolute top-0 right-0 w-1.5 h-[calc(100%-12px)] cursor-e-resize z-50 hover:bg-primary/10 transition-colors"
                      onMouseDown={(e) =>
                        handleWindowResizeStart(e, win.id, "e")
                      }
                      title="Arrastra para cambiar ancho"
                    />
                    {/* Bottom Edge Resize Handle */}
                    <div
                      className="absolute bottom-0 left-0 h-1.5 w-[calc(100%-12px)] cursor-s-resize z-50 hover:bg-primary/10 transition-colors"
                      onMouseDown={(e) =>
                        handleWindowResizeStart(e, win.id, "s")
                      }
                      title="Arrastra para cambiar alto"
                    />
                    {/* Bottom-Right Corner Resize Handle */}
                    <div
                      className="absolute bottom-0 right-0 w-4.5 h-4.5 cursor-se-resize z-50 flex items-end justify-end p-1 select-none"
                      onMouseDown={(e) =>
                        handleWindowResizeStart(e, win.id, "se")
                      }
                      title="Arrastra para cambiar tamaño"
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        className="text-zinc-400 dark:text-zinc-600 opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <line
                          x1="8"
                          y1="0"
                          x2="0"
                          y2="8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <line
                          x1="8"
                          y1="4"
                          x2="4"
                          y2="8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}

      {/* WINDOW MANAGER DOCK / TASKBAR */}
      {floatingWindows.length > 0 &&
        createPortal(
          <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9995] px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 transition-all max-w-[90vw] overflow-x-auto select-none pointer-events-auto ${
              darkMode
                ? "bg-zinc-950/85 border-zinc-800 text-zinc-200"
                : "bg-white/85 border-zinc-200 text-zinc-800"
            }`}
          >
            {/* Quick global controls */}
            <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-3 mr-1 shrink-0 text-zinc-500">
              <button
                onClick={minimizeAllFloatingWindows}
                className="px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer"
                title="Minimizar todas"
              >
                <Minus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Minimizar Todo</span>
              </button>
              <button
                onClick={cascadeFloatingWindows}
                className="px-2.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer"
                title="Organizar en cascada"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cascada</span>
              </button>
              <button
                onClick={closeAllFloatingWindows}
                className="px-2.5 py-1.5 rounded-full hover:bg-red-500/10 hover:text-red-500 text-zinc-400 transition-colors text-[10.5px] font-bold flex items-center gap-1.5 cursor-pointer"
                title="Cerrar todas las ventanas"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar Todo</span>
              </button>
            </div>

            {/* List of open windows */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] py-0.5 scrollbar-thin">
              {floatingWindows.map((win) => {
                const isWinActive =
                  win.zIndex ===
                    Math.max(...floatingWindows.map((w) => w.zIndex)) &&
                  !win.isMinimized;
                return (
                  <button
                    key={win.id}
                    onClick={() => {
                      const maxZ = getNextZIndex();
                      if (win.isMinimized) {
                        setFloatingWindows((prev) =>
                          prev.map((w) =>
                            w.id === win.id
                              ? { ...w, isMinimized: false, zIndex: maxZ }
                              : w,
                          ),
                        );
                      } else if (isWinActive) {
                        setFloatingWindows((prev) =>
                          prev.map((w) =>
                            w.id === win.id ? { ...w, isMinimized: true } : w,
                          ),
                        );
                      } else {
                        setFloatingWindows((prev) =>
                          prev.map((w) =>
                            w.id === win.id ? { ...w, zIndex: maxZ } : w,
                          ),
                        );
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer truncate max-w-[150px] shrink-0 ${
                      isWinActive
                        ? "bg-primary border-primary text-white dark:text-blue-950 shadow-lg shadow-primary/20"
                        : win.isMinimized
                          ? "bg-zinc-100/40 dark:bg-zinc-900 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                          : darkMode
                            ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                    }`}
                    title={win.file.name}
                  >
                    <span className="shrink-0">
                      {getFileIcon(win.file.mimeType)}
                    </span>
                    <span className="truncate max-w-[80px]">
                      {win.file.name}
                    </span>
                    {win.isMinimized && (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                    )}
                    {isWinActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}

      {/* FLOATING ACTION BUTTON (FAB): Gemini Professor Assistant */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
        {/* Chat Panel Overlay */}
        {isChatOpen && (
          <div
            className={`w-92 sm:w-96 h-[520px] max-h-[calc(100vh-8rem)] rounded-3xl border shadow-2xl overflow-hidden flex flex-col mb-4 transition-all duration-300 transform scale-100 origin-bottom-right ${
              darkMode
                ? "bg-zinc-950/95 border-zinc-800 text-zinc-100"
                : "bg-white/95 border-zinc-200 text-zinc-800"
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 border-b border-zinc-200/60 dark:border-zinc-800/60 p-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded-xl">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-none tracking-tight">
                    Profesor Gemini
                  </h3>
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                    Tutor Académico IA
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reading Status Banner */}
            <div
              className={`px-4 py-2 text-[10px] border-b flex flex-col gap-1.5 font-medium ${
                darkMode
                  ? "bg-zinc-900/40 border-zinc-800/50"
                  : "bg-zinc-50 border-zinc-200/50"
              }`}
            >
              {isReadingFileContent ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                  <span className="text-zinc-400">
                    Analizando apuntes con el Profesor...
                  </span>
                </div>
              ) : selectedFile || floatingWindows.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                    <span className="text-zinc-500 dark:text-zinc-400 font-bold">
                      Leyendo documentos abiertos (
                      {(selectedFile ? 1 : 0) + floatingWindows.length} en
                      total):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-[44px] overflow-y-auto pl-4 py-0.5 scrollbar-thin">
                    {selectedFile && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-semibold border border-primary/30 truncate max-w-[120px]"
                        title={`${selectedFile.name} (Principal)`}
                      >
                        📌 {selectedFile.name}
                      </span>
                    )}
                    {floatingWindows.map((win) => (
                      <span
                        key={win.id}
                        className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 truncate max-w-[120px]"
                        title={win.file.name}
                      >
                        🗔 {win.file.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <span className="text-zinc-400 italic">
                    Sin documentos abiertos (Abre un apunte para estudiar)
                  </span>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      msg.sender === "user"
                        ? "bg-primary text-white dark:text-blue-950"
                        : darkMode
                          ? "bg-zinc-900 text-zinc-300"
                          : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {msg.sender === "user" ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                        msg.sender === "user"
                          ? "bg-primary text-white dark:text-blue-950 rounded-tr-none"
                          : darkMode
                            ? "bg-zinc-900/60 border border-zinc-800 text-zinc-200 rounded-tl-none"
                            : "bg-zinc-100/80 text-zinc-800 rounded-tl-none"
                      }`}
                    >
                      {msg.sender === "bot" ? (
                        <div className="space-y-1.5 whitespace-pre-wrap">
                          {renderMarkdown(msg.text)}
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap font-medium">
                          {msg.text}
                        </span>
                      )}
                    </div>
                    {msg.fileName && (
                      <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-semibold self-end">
                        Sobre: {msg.fileName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {isChatSending && (
                <div className="flex gap-2.5 max-w-[85%] mr-auto items-center">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      darkMode ? "bg-zinc-900" : "bg-zinc-100"
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div
                    className={`px-4 py-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 ${
                      darkMode
                        ? "bg-zinc-900/40 text-zinc-400 border border-zinc-800/50"
                        : "bg-zinc-100/50 text-zinc-500"
                    }`}
                  >
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span>Profesor pensando...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestions Pills (When any file text is available) */}
            {((selectedFile && selectedFileContent) ||
              floatingWindows.some((w) => w.textContent)) &&
              !isChatSending && (
                <div
                  className={`px-3 py-2 border-t flex flex-wrap gap-1.5 overflow-x-auto ${
                    darkMode
                      ? "bg-zinc-900/10 border-zinc-800/40"
                      : "bg-zinc-50/50 border-zinc-200/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSendChatMessage} // Fallback to prompt setting or direct send
                    onClickCapture={() =>
                      triggerSendWithText(
                        "Explícame detalladamente este tema de forma didáctica.",
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-[9px] font-semibold transition-all cursor-pointer border ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs"
                    }`}
                  >
                    🎓 Explicar tema
                  </button>
                  <button
                    type="button"
                    onClickCapture={() =>
                      triggerSendWithText(
                        "Hazme un resumen estructurado con las ideas clave de estos apuntes.",
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-[9px] font-semibold transition-all cursor-pointer border ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs"
                    }`}
                  >
                    📝 Resumir
                  </button>
                  <button
                    type="button"
                    onClickCapture={() =>
                      triggerSendWithText(
                        "Genérame un cuestionario de práctica de 3 preguntas para ponerme a prueba.",
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-[9px] font-semibold transition-all cursor-pointer border ${
                      darkMode
                        ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs"
                    }`}
                  >
                    ❓ Cuestionario
                  </button>
                </div>
              )}

            {/* Input Form */}
            <form
              onSubmit={handleSendChatMessage}
              className="p-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInputValue}
                onChange={(e) => setChatInputValue(e.target.value)}
                placeholder={
                  selectedFile || floatingWindows.length > 0
                    ? "Pregunta sobre tus apuntes abiertos..."
                    : "Escribe tu consulta al profesor..."
                }
                disabled={isChatSending}
                className={`flex-1 px-3.5 py-2.5 rounded-2xl text-xs outline-none focus:border-primary border transition-all ${
                  darkMode
                    ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                    : "bg-zinc-50 border-zinc-200 text-zinc-800"
                }`}
              />
              <button
                type="submit"
                disabled={isChatSending || !chatInputValue.trim()}
                className="p-2.5 bg-primary hover:bg-primary disabled:opacity-40 disabled:hover:bg-primary text-white dark:text-blue-950 rounded-full transition-all cursor-pointer shadow-md shadow-primary/20 flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Button Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-13 h-13 rounded-full bg-primary hover:bg-primary-hover text-white dark:text-blue-950 shadow-xl shadow-primary/20 dark:shadow-indigo-950/40 flex items-center justify-center border border-white/10 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 relative"
          title="Profesor Gemini - Consultas y Tutorías"
        >
          {isChatOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <GraduationCap className="w-5 h-5 animate-pulse" />
          )}

          {/* Active File Read Badge / Indicator */}
          {selectedFile && !isChatOpen && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-zinc-900 text-[8px] font-bold text-white dark:text-blue-950 items-center justify-center">
                ✓
              </span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
