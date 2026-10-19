import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookMarked,
  Pin,
  PinOff,
  CirclePlus,
  CircleCheckBig,
  Loader2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import AnimatedFolder from "./AnimatedFolder";
import { googleSignIn, getAccessToken, initAuth } from "../lib/firebase";
import { PinnedStudyFolder, CompletedStudyFile } from "../types";
import { StudyProgressBarChart } from "./AcademicCharts";
import { AnimatedNumber } from "./AnimatedNumber";

interface DriveFolderLite {
  id: string;
  name: string;
}
interface DriveFileLite {
  id: string;
  name: string;
}

interface StudyMaterialBlockProps {
  darkMode: boolean;
  // Nombres de materias elegibles (en minúscula) para auto-fijado automático, con el nombre
  // "lindo" (tal como figura en materiasInfo) ya resuelto para usar como etiqueta.
  eligibleMaterias: Map<string, string>;
  allMateriaNames: Map<string, string>;
  pinnedFolders: PinnedStudyFolder[];
  setPinnedFolders: React.Dispatch<React.SetStateAction<PinnedStudyFolder[]>>;
  completedFiles: CompletedStudyFile[];
  setCompletedFiles: React.Dispatch<React.SetStateAction<CompletedStudyFile[]>>;
}

async function driveFetch(url: string, accessToken: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Drive API ${res.status}`);
  return res.json();
}

function PinnedFolderCard({
  folder,
  files,
  loadingFiles,
  driveConnected,
  completedFiles,
  progress,
  onUnpin,
  onToggleFile,
  darkMode,
}: {
  folder: PinnedStudyFolder;
  files: DriveFileLite[] | undefined;
  loadingFiles: boolean;
  driveConnected: boolean;
  completedFiles: CompletedStudyFile[];
  progress: number;
  onUnpin: () => void;
  onToggleFile: (fileId: string) => void;
  darkMode: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`rounded-2xl border p-4 transition-colors ${
        darkMode ? "bg-black/40 border-zinc-800/70" : "bg-slate-50 border-zinc-150"
      }`}
    >
      <div className="flex items-center gap-3">
        <AnimatedFolder size={34} isHovered={hovered} className="text-primary shrink-0" />
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="min-w-0 flex-1 text-left cursor-pointer"
        >
          <p className="text-xs font-extrabold truncate">{folder.materiaName}</p>
          <p className="text-[10px] text-zinc-500 font-medium">
            {files
              ? `${files.length} archivo${files.length === 1 ? "" : "s"}`
              : driveConnected
                ? "Cargando…"
                : "Conectá Drive para ver el avance"}
          </p>
        </button>
        <button
          type="button"
          onClick={onUnpin}
          title="Dejar de fijar carpeta"
          className="p-1.5 rounded-full text-primary hover:bg-primary/10 transition-all cursor-pointer shrink-0"
        >
          <Pin className="w-4 h-4 fill-current" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          title={expanded ? "Ocultar archivos" : "Ver archivos"}
          className="p-1.5 rounded-full text-zinc-400 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer shrink-0"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className={`mt-3 h-2 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-zinc-200"}`}>
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] mt-1 font-bold text-zinc-500">
        <AnimatedNumber value={progress} format={(n) => `${Math.round(n)}%`} /> estudiado
      </p>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5 pt-3 border-t border-zinc-800/10 dark:border-zinc-800/50">
              {loadingFiles && (
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cargando archivos…</span>
                </div>
              )}
              {!loadingFiles && !driveConnected && (
                <p className="text-[10px] text-zinc-500 italic py-2">
                  Conectá tu Google Drive para ver y marcar los archivos de esta carpeta.
                </p>
              )}
              {!loadingFiles && files && files.length === 0 && (
                <p className="text-[10px] text-zinc-500 italic py-2">Esta carpeta no tiene archivos.</p>
              )}
              {!loadingFiles &&
                files?.map((file) => {
                  const done = completedFiles.find((c) => c.fileId === file.id)?.completed;
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => onToggleFile(file.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-all ${
                        darkMode ? "hover:bg-zinc-800/70" : "hover:bg-white"
                      }`}
                      title={done ? "Marcar como no estudiado" : "Marcar como estudiado"}
                    >
                      <span className="text-[10px] font-semibold truncate text-zinc-600 dark:text-zinc-300">
                        {file.name}
                      </span>
                      {done ? (
                        <CircleCheckBig className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <CirclePlus className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StudyMaterialBlock({
  darkMode,
  eligibleMaterias,
  allMateriaNames,
  pinnedFolders,
  setPinnedFolders,
  completedFiles,
  setCompletedFiles,
}: StudyMaterialBlockProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [rootFolders, setRootFolders] = useState<DriveFolderLite[] | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [filesByFolder, setFilesByFolder] = useState<Record<string, DriveFileLite[]>>({});
  const [loadingFilesFor, setLoadingFilesFor] = useState<Set<string>>(new Set());
  const autoPinDoneRef = useRef(false);

  // Auto-conecta con la misma sesión de Drive que "Facultad" (DriveFolderVisualizer): si ya hay
  // un token guardado (localStorage/Firebase), lo toma directo en vez de pedir "Conectar" de nuevo.
  useEffect(() => {
    getAccessToken().then((token) => {
      if (token) setAccessToken(token);
    });
    const unsubscribe = initAuth(
      (_user, token) => {
        if (token) setAccessToken(token);
      },
      () => {
        getAccessToken().then((token) => {
          if (token) setAccessToken(token);
        });
      },
    );
    return () => unsubscribe();
  }, []);

  const connectDrive = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const result = await googleSignIn();
      if (result) setAccessToken(result.accessToken);
    } catch (err: any) {
      setConnectError(err?.message || "No se pudo conectar con Google Drive.");
    } finally {
      setConnecting(false);
    }
  };

  // Carga las subcarpetas de "1 - Facultad" una vez conectado.
  const loadRootFolders = async (token: string) => {
    setLoadingFolders(true);
    try {
      const rootQuery =
        "name = '1 - Facultad' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
      const rootData = await driveFetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(rootQuery)}&fields=files(id,name)&pageSize=10`,
        token,
      );
      const rootId = rootData.files?.[0]?.id;
      if (!rootId) {
        setRootFolders([]);
        return;
      }
      const childQuery = `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const childData = await driveFetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(childQuery)}&fields=files(id,name)&pageSize=100&orderBy=name`,
        token,
      );
      setRootFolders(childData.files || []);
    } catch {
      setRootFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  useEffect(() => {
    if (accessToken) loadRootFolders(accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Auto-fija, una sola vez por carga de carpetas, las carpetas homónimas a materias que ya se
  // pueden rendir o cursar.
  useEffect(() => {
    if (!rootFolders || autoPinDoneRef.current) return;
    autoPinDoneRef.current = true;
    const alreadyPinned = new Set(pinnedFolders.map((p) => p.folderId));
    const toAdd: PinnedStudyFolder[] = [];
    rootFolders.forEach((folder) => {
      if (alreadyPinned.has(folder.id)) return;
      const materiaName = eligibleMaterias.get(folder.name.trim().toLowerCase());
      if (!materiaName) return;
      toAdd.push({ id: folder.id, folderId: folder.id, folderName: folder.name, materiaName });
    });
    if (toAdd.length > 0) setPinnedFolders((prev) => [...prev, ...toAdd]);
  }, [rootFolders, eligibleMaterias, pinnedFolders, setPinnedFolders]);

  const togglePin = (folder: DriveFolderLite) => {
    const isPinned = pinnedFolders.some((p) => p.folderId === folder.id);
    if (isPinned) {
      setPinnedFolders((prev) => prev.filter((p) => p.folderId !== folder.id));
      return;
    }
    const materiaName = allMateriaNames.get(folder.name.trim().toLowerCase()) || folder.name;
    setPinnedFolders((prev) => [
      ...prev,
      { id: folder.id, folderId: folder.id, folderName: folder.name, materiaName },
    ]);
  };

  const loadFilesFor = async (folderId: string) => {
    if (!accessToken || filesByFolder[folderId] || loadingFilesFor.has(folderId)) return;
    setLoadingFilesFor((prev) => new Set(prev).add(folderId));
    try {
      const query = `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
      const data = await driveFetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=200&orderBy=name`,
        accessToken,
      );
      setFilesByFolder((prev) => ({ ...prev, [folderId]: data.files || [] }));
    } catch {
      setFilesByFolder((prev) => ({ ...prev, [folderId]: [] }));
    } finally {
      setLoadingFilesFor((prev) => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    pinnedFolders.forEach((f) => loadFilesFor(f.folderId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, pinnedFolders]);

  const toggleFileCompleted = (fileId: string) => {
    setCompletedFiles((prev) => {
      const existing = prev.find((c) => c.fileId === fileId);
      if (existing) {
        return prev.map((c) => (c.fileId === fileId ? { ...c, completed: !c.completed } : c));
      }
      return [...prev, { id: fileId, fileId, completed: true }];
    });
  };

  const progressFor = (folderId: string): number => {
    const files = filesByFolder[folderId];
    if (!files || files.length === 0) return 0;
    const done = files.filter((f) => completedFiles.find((c) => c.fileId === f.id)?.completed).length;
    return (done / files.length) * 100;
  };

  const barRows = pinnedFolders.map((f) => ({ materia: f.materiaName, donePercent: progressFor(f.folderId) }));

  return (
    <div
      className={`p-6 rounded-3xl border scroll-reveal ${
        darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100 shadow-lg" : "bg-white border-zinc-200 text-zinc-800 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-md">Material de Estudio</h3>
        </div>

        {!accessToken ? (
          <button
            type="button"
            onClick={connectDrive}
            disabled={connecting}
            className="px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white dark:text-blue-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-primary/20"
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pin className="w-3.5 h-3.5" />}
            <span>Conectar con Drive</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadRootFolders(accessToken)}
              title="Actualizar carpetas de Facultad"
              className="p-1.5 rounded-full text-zinc-400 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFolders ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setBrowserOpen((o) => !o)}
              className="px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              {browserOpen ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              <span>{browserOpen ? "Ocultar carpetas" : "Fijar carpetas"}</span>
            </button>
          </div>
        )}
      </div>

      {connectError && (
        <p className="text-[10px] text-red-500 font-semibold mb-3">{connectError}</p>
      )}

      {accessToken && (
        <AnimatePresence initial={false}>
          {browserOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div
                className={`mb-5 p-3 rounded-2xl border max-h-56 overflow-y-auto space-y-1 ${
                  darkMode ? "bg-black/40 border-zinc-800/70" : "bg-slate-50 border-zinc-150"
                }`}
              >
                {loadingFolders && (
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 py-2 px-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cargando carpetas de "1 - Facultad"…</span>
                  </div>
                )}
                {!loadingFolders && rootFolders?.length === 0 && (
                  <p className="text-[10px] text-zinc-500 italic px-1 py-2">
                    No se encontraron subcarpetas dentro de "1 - Facultad".
                  </p>
                )}
                {!loadingFolders &&
                  rootFolders?.map((folder) => {
                    const isPinned = pinnedFolders.some((p) => p.folderId === folder.id);
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => togglePin(folder)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-all ${
                          darkMode ? "hover:bg-zinc-800/70" : "hover:bg-white"
                        }`}
                      >
                        <span className="text-xs font-semibold truncate">{folder.name}</span>
                        {isPinned ? (
                          <Pin className="w-4 h-4 text-primary fill-current shrink-0" />
                        ) : (
                          <PinOff className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-3">
          {pinnedFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-2">
              <AnimatedFolder size={36} className="text-zinc-400" />
              <p className="text-xs text-zinc-500 italic max-w-xs">
                {accessToken
                  ? 'Fijá carpetas desde "1 - Facultad" para hacer seguimiento de tu avance de estudio acá.'
                  : "Conectá tu Google Drive para fijar las carpetas de las materias que estás cursando."}
              </p>
            </div>
          ) : (
            pinnedFolders.map((folder) => (
              <PinnedFolderCard
                key={folder.folderId}
                folder={folder}
                files={filesByFolder[folder.folderId]}
                loadingFiles={loadingFilesFor.has(folder.folderId)}
                driveConnected={!!accessToken}
                completedFiles={completedFiles}
                progress={progressFor(folder.folderId)}
                onUnpin={() => setPinnedFolders((prev) => prev.filter((p) => p.folderId !== folder.folderId))}
                onToggleFile={toggleFileCompleted}
                darkMode={darkMode}
              />
            ))
          )}
        </div>

        <div className="lg:col-span-1 flex flex-col">
          <StudyProgressBarChart rows={barRows} darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}

export default StudyMaterialBlock;
