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
import { googleSignIn, getAccessToken, getAccessTokenSync, initAuth } from "../lib/supabase";
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

async function findFacultadRootId(token: string): Promise<string | null> {
  const rootQuery = "name = '1 - Facultad' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const rootData = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(rootQuery)}&fields=files(id,name)&pageSize=10`,
    token,
  );
  return rootData.files?.[0]?.id || null;
}

async function listChildFolders(parentId: string, token: string): Promise<DriveFolderLite[]> {
  const query = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const data = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&pageSize=200&orderBy=name`,
    token,
  );
  return data.files || [];
}

// Recorre TODO el árbol de carpetas dentro de "1 - Facultad" (no solo las de primer nivel, donde
// viven las categorías como "3 - Cursando" o "5 - Años de Cursado") buscando, a cualquier
// profundidad, carpetas homónimas a materias que ya se pueden rendir o cursar — así el usuario no
// tiene que ir a buscarlas él mismo. Recorre nivel por nivel (en paralelo dentro de cada nivel) y
// deja de bajar por una rama apenas encuentra una materia ahí (no hace falta mirar adentro de la
// carpeta de la materia para esto). Acotado por profundidad y cantidad total de carpetas visitadas
// como salvaguarda ante árboles de carpetas inusualmente grandes.
const MAX_SCAN_DEPTH = 8;
const MAX_SCAN_FOLDERS = 400;

async function scanForEligibleSubjectFolders(
  token: string,
  eligibleMaterias: Map<string, string>,
  alreadyPinnedIds: Set<string>,
): Promise<PinnedStudyFolder[]> {
  const rootId = await findFacultadRootId(token);
  if (!rootId) return [];

  const found: PinnedStudyFolder[] = [];
  const matchedIds = new Set<string>();
  let queue: string[] = [rootId];
  let visitedCount = 0;

  for (let depth = 0; depth < MAX_SCAN_DEPTH && queue.length > 0 && visitedCount < MAX_SCAN_FOLDERS; depth++) {
    const levelResults = await Promise.all(
      queue.map((id) => listChildFolders(id, token).catch(() => [] as DriveFolderLite[])),
    );
    visitedCount += queue.length;

    const nextQueue: string[] = [];
    levelResults.forEach((children) => {
      children.forEach((child) => {
        const materiaName = eligibleMaterias.get(child.name.trim().toLowerCase());
        if (materiaName && !alreadyPinnedIds.has(child.id) && !matchedIds.has(child.id)) {
          matchedIds.add(child.id);
          found.push({ id: child.id, folderId: child.id, folderName: child.name, materiaName });
        } else {
          nextQueue.push(child.id);
        }
      });
    });

    queue = nextQueue.slice(0, Math.max(0, MAX_SCAN_FOLDERS - visitedCount));
  }

  return found;
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
  // Arranca con el token ya leído de forma SÍNCRONA (localStorage/caché en memoria de
  // firebase.ts) en vez de null — así, si ya hay sesión de Drive conectada en otra parte de la
  // app (p.ej. "Facultad"), este bloque aparece conectado desde el primer render, sin el delay
  // de esperar un round-trip async (ni una ventana donde se ve "Conectar con Drive" de más).
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessTokenSync());
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [rootFolders, setRootFolders] = useState<DriveFolderLite[] | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [autoPinning, setAutoPinning] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [filesByFolder, setFilesByFolder] = useState<Record<string, DriveFileLite[]>>({});
  const [loadingFilesFor, setLoadingFilesFor] = useState<Set<string>>(new Set());
  const autoPinDoneRef = useRef(false);

  // Respaldo: si el token todavía no estaba disponible al montar (o cambia mientras el bloque
  // sigue montado, p.ej. el usuario conecta desde el selector de carpetas más abajo), lo capta
  // igual vía el mecanismo async/estado de Firebase que ya usa "Facultad".
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
      // googleSignIn() es un login por redirect (Supabase OAuth), no un popup con resultado
      // inmediato: el navegador navega a Google y vuelve a esta misma página. El token real se
      // toma recién al volver, vía initAuth()/getAccessToken() (igual que en "Facultad").
      await googleSignIn();
    } catch (err: any) {
      setConnectError(err?.message || "No se pudo conectar con Google Drive.");
      setConnecting(false);
    }
  };

  // Carga las subcarpetas de primer nivel de "1 - Facultad" (categorías como "3 - Cursando"),
  // usadas solo para el selector manual de "Fijar carpetas" más abajo.
  const loadRootFolders = async (token: string) => {
    setLoadingFolders(true);
    try {
      const rootId = await findFacultadRootId(token);
      if (!rootId) {
        setRootFolders([]);
        return;
      }
      setRootFolders(await listChildFolders(rootId, token));
    } catch {
      setRootFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  // Recorre TODO el árbol de "1 - Facultad" (no solo las categorías de primer nivel) buscando
  // carpetas de materias que ya se pueden rendir o cursar, y las fija automáticamente — el
  // usuario no tiene que ir a buscarlas él mismo, salvo que quiera fijar alguna más a mano.
  const runAutoScan = async (token: string) => {
    setAutoPinning(true);
    try {
      const alreadyPinned = new Set(pinnedFolders.map((p) => p.folderId));
      const matches = await scanForEligibleSubjectFolders(token, eligibleMaterias, alreadyPinned);
      if (matches.length > 0) {
        setPinnedFolders((prev) => {
          const existingIds = new Set(prev.map((p) => p.folderId));
          return [...prev, ...matches.filter((m) => !existingIds.has(m.folderId))];
        });
      }
    } catch {
      // Silencioso: si falla el escaneo automático, el usuario siempre puede fijar a mano.
    } finally {
      setAutoPinning(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    loadRootFolders(accessToken);
    if (!autoPinDoneRef.current) {
      autoPinDoneRef.current = true;
      runAutoScan(accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

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
              onClick={() => {
                loadRootFolders(accessToken);
                runAutoScan(accessToken);
              }}
              disabled={autoPinning}
              title="Volver a buscar materias en Drive"
              className="p-1.5 rounded-full text-zinc-400 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFolders || autoPinning ? "animate-spin" : ""}`} />
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
          {autoPinning && (
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium px-1 pb-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Buscando materias que se pueden rendir o cursar en tus carpetas de Drive…</span>
            </div>
          )}
          {pinnedFolders.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-2">
              <AnimatedFolder size={36} className="text-zinc-400" />
              <p className="text-xs text-zinc-500 italic max-w-xs">
                {!accessToken
                  ? "Conectá tu Google Drive para fijar las carpetas de las materias que estás cursando."
                  : autoPinning
                    ? "Buscando materias en tus carpetas de Drive…"
                    : 'No se encontró ninguna carpeta con el nombre de una materia que se pueda rendir o cursar. Fijá alguna a mano desde "1 - Facultad" si hace falta.'}
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
