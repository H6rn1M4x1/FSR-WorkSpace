import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BookMarked, Pin, Loader2, RefreshCw, Network, CheckCircle2 } from "lucide-react";
import AnimatedFolder from "./AnimatedFolder";
import { googleSignIn, getAccessToken, getAccessTokenSync, initAuth } from "../lib/supabase";
import { saveItemToFirestore } from "../lib/firestoreSyncService";
import { PinnedStudyFolder, CompletedStudyFile, StudyPlanTree, Exam } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";
import { StudyPlanTreeModal } from "./StudyPlanTreeModal";
import { uiSounds } from "../lib/sounds";

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
  // Id del usuario activo, para persistir los fijados/progreso en Firestore (igual que el
  // resto de la app: sin esto, los cambios solo viven en el estado local de React y un
  // refetch desde el servidor — p.ej. el poll de seguridad cada 60s — los vuelve a pisar).
  userId: string;
  // Nombres de materias elegibles (en minúscula) para auto-fijado automático, con el nombre
  // "lindo" (tal como figura en materiasInfo) ya resuelto para usar como etiqueta.
  eligibleMaterias: Map<string, string>;
  pinnedFolders: PinnedStudyFolder[];
  setPinnedFolders: React.Dispatch<React.SetStateAction<PinnedStudyFolder[]>>;
  completedFiles: CompletedStudyFile[];
  // Las carpetas acá son solo visuales: fijarlas/desfijarlas y elegir sus archivos principales
  // se hace desde "Facultad" (que es donde además se navega el árbol real de Drive). Al tocar
  // una carpeta, este callback la abre ahí directamente en vez de duplicar esa UI acá. `fileId`
  // (opcional) además deja ese archivo puntual abierto — lo usa el botón "Abrir en Facultad" del
  // Árbol de Materias para un adjunto concreto, no solo la carpeta.
  onOpenInFacultad: (folderId: string, folderName: string, fileId?: string) => void;
  // Árbol de materias armado con IA a partir de un plan de estudio en PDF — un solo documento
  // por usuario (0 o 1 elementos), igual que el resto de las colecciones de la app.
  studyPlanTree: StudyPlanTree[];
  setStudyPlanTree: React.Dispatch<React.SetStateAction<StudyPlanTree[]>>;
  // Exámenes de práctica armados con IA — el modal del árbol los crea (botón "Crear Examen"), el
  // bloque "Exámenes con IA" (debajo de este) los lista.
  setExams: React.Dispatch<React.SetStateAction<Exam[]>>;
}

// Normaliza un nombre de materia/carpeta para comparar: sin acentos/diacríticos, sin mayúsculas,
// sin espacios de más al principio/final ni duplicados en el medio. Así "Análisis Matemático ",
// "analisis   matematico" y "ANÁLISIS MATEMÁTICO" calzan entre sí aunque el nombre de la carpeta
// en Drive no esté escrito exactamente igual que el campo "materia" de la app.
export function normalizeMateriaName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Una carpeta real en Drive suele llevar texto de más después del nombre de la materia (cátedra,
// año, turno: "Análisis Matemático - Cátedra Pérez"), así que además del match exacto se acepta que
// el nombre de la carpeta EMPIECE con el nombre de la materia seguido de un separador. Se exige que
// el separador no sea una letra/número para no confundir, p.ej., "Análisis I" con "Análisis II".
const NAME_SEPARATOR_RE = /^[\s\-_–—.,:;()[\]|/]/;

function matchEligibleMateria(folderName: string, eligibleMaterias: Map<string, string>): string | undefined {
  const normalized = normalizeMateriaName(folderName);
  const exact = eligibleMaterias.get(normalized);
  if (exact) return exact;
  for (const [key, label] of eligibleMaterias) {
    if (normalized.length > key.length && normalized.startsWith(key) && NAME_SEPARATOR_RE.test(normalized.slice(key.length))) {
      return label;
    }
  }
  return undefined;
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

interface ScanResult {
  matches: PinnedStudyFolder[];
  // Nombres de TODAS las carpetas que se revisaron (para poder mostrar, si no se encontró nada,
  // qué hay realmente en Drive y así detectar a simple vista un desfasaje de nombres contra las
  // materias de la app — p.ej. "Análisis Matemático I" en Drive vs "Análisis Matemático" en la app).
  visitedFolderNames: string[];
  rootFound: boolean;
  // Si alguna subcarpeta no se pudo leer (error puntual de red/permisos) — el escaneo sigue
  // igual, pero conviene avisar que el resultado puede estar incompleto.
  hadErrors: boolean;
}

async function scanForEligibleSubjectFolders(
  token: string,
  eligibleMaterias: Map<string, string>,
  alreadyPinnedIds: Set<string>,
): Promise<ScanResult> {
  const rootId = await findFacultadRootId(token);
  if (!rootId) return { matches: [], visitedFolderNames: [], rootFound: false, hadErrors: false };

  const found: PinnedStudyFolder[] = [];
  const matchedIds = new Set<string>();
  const visitedFolderNames: string[] = [];
  let hadErrors = false;
  let queue: string[] = [rootId];
  let visitedCount = 0;

  for (let depth = 0; depth < MAX_SCAN_DEPTH && queue.length > 0 && visitedCount < MAX_SCAN_FOLDERS; depth++) {
    const levelResults = await Promise.all(
      queue.map((id) =>
        listChildFolders(id, token).catch(() => {
          hadErrors = true;
          return [] as DriveFolderLite[];
        }),
      ),
    );
    visitedCount += queue.length;

    const nextQueue: string[] = [];
    levelResults.forEach((children) => {
      children.forEach((child) => {
        visitedFolderNames.push(child.name);
        const materiaName = matchEligibleMateria(child.name, eligibleMaterias);
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

  return { matches: found, visitedFolderNames, rootFound: true, hadErrors };
}

function PinnedFolderCard({
  folder,
  files,
  driveConnected,
  progress,
  onOpen,
  darkMode,
  hasTree,
  onTreeClick,
}: {
  folder: PinnedStudyFolder;
  files: DriveFileLite[] | undefined;
  driveConnected: boolean;
  progress: number;
  onOpen: () => void;
  darkMode: boolean;
  // Botón "Ver/Crear Árbol" — unificado adentro de esta misma tarjeta (al extremo derecho de la
  // fila de arriba) en vez de una celda de grilla aparte al lado.
  hasTree: boolean;
  onTreeClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`w-full rounded-2xl border p-4 transition-colors ${
        darkMode ? "bg-black/40 border-zinc-800/70 hover:bg-zinc-900/60" : "bg-slate-50 border-zinc-150 hover:bg-slate-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpen}
          title="Abrir en Facultad"
          className="flex items-center gap-4 min-w-0 flex-1 text-left cursor-pointer"
        >
          {/* AnimatedFolder dibuja sus "papeles" con overflow-visible para que la apertura 3D se
              vea completa; al hover, suben y se agrandan lo suficiente como para acercarse al
              texto de al lado en una fila tan angosta. Este wrapper recorta ese excedente a la
              caja del ícono sin tocar el componente (que en otros usos sí se beneficia del
              overflow), y el gap de al lado se agranda un poco para dejarle aire de sobra. */}
          <div className="relative shrink-0 overflow-hidden rounded-md" style={{ width: 34, height: 34 }}>
            <AnimatedFolder size={34} isHovered={hovered} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold truncate">{folder.materiaName}</p>
            <p className="text-[10px] text-zinc-500 font-medium">
              {files
                ? `${files.length} archivo${files.length === 1 ? "" : "s"}`
                : driveConnected
                  ? "Cargando…"
                  : "Conectá Drive para ver el avance"}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTreeClick();
          }}
          title={hasTree ? "Ver el árbol de materias" : "Crear el árbol de materias con IA"}
          className={`shrink-0 h-9 px-3 flex items-center justify-center gap-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer hover:brightness-110 active:brightness-95 ${
            hasTree
              ? "bg-primary text-white dark:text-black"
              : darkMode
                ? "bg-zinc-700 text-zinc-100"
                : "bg-zinc-300 text-zinc-800"
          }`}
        >
          {hasTree ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Network className="w-3.5 h-3.5 shrink-0" />}
          <span className="hidden sm:inline truncate">{hasTree ? "Ver Árbol" : "Crear Árbol"}</span>
        </button>
      </div>

      <button type="button" onClick={onOpen} className="block w-full text-left cursor-pointer mt-3">
        <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-zinc-200"}`}>
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
      </button>
    </div>
  );
}

export function StudyMaterialBlock({
  darkMode,
  userId,
  eligibleMaterias,
  pinnedFolders,
  setPinnedFolders,
  completedFiles,
  onOpenInFacultad,
  studyPlanTree,
  setStudyPlanTree,
  setExams,
}: StudyMaterialBlockProps) {
  // Arranca con el token ya leído de forma SÍNCRONA (localStorage/caché en memoria de
  // firebase.ts) en vez de null — así, si ya hay sesión de Drive conectada en otra parte de la
  // app (p.ej. "Facultad"), este bloque aparece conectado desde el primer render, sin el delay
  // de esperar un round-trip async (ni una ventana donde se ve "Conectar con Drive" de más).
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessTokenSync());
  // Qué fila (carpeta fijada) tiene abierto su modal de árbol — null = ninguna. Hay un árbol
  // guardado por folderId (no uno solo global), así que el modal necesita saber de qué fila vino.
  const [treeModalFolder, setTreeModalFolder] = useState<PinnedStudyFolder | null>(null);
  const treeFor = (folderId: string) => studyPlanTree.find((t) => t.folderId === folderId);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [autoPinning, setAutoPinning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanMeta, setScanMeta] = useState<{ rootFound: boolean; visitedCount: number; hadErrors: boolean } | null>(null);
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

  // Recorre TODO el árbol de "1 - Facultad" (no solo las categorías de primer nivel) buscando
  // carpetas de materias que ya se pueden rendir o cursar, y las fija automáticamente — el
  // usuario no tiene que ir a buscarlas él mismo, salvo que quiera fijar alguna más a mano.
  const runAutoScan = async (token: string) => {
    setAutoPinning(true);
    setScanError(null);
    try {
      const alreadyPinned = new Set(pinnedFolders.map((p) => p.folderId));
      const { matches, visitedFolderNames, rootFound, hadErrors } = await scanForEligibleSubjectFolders(
        token,
        eligibleMaterias,
        alreadyPinned,
      );
      setScanMeta({ rootFound, visitedCount: visitedFolderNames.length, hadErrors });
      if (matches.length > 0) {
        // Guarda cada carpeta encontrada en Firestore ANTES de reflejarla en el estado local.
        // Si esto se omite, el fijado solo vive en memoria: en cuanto el poll de seguridad de
        // App.tsx (cada 60s) vuelve a traer "pinned_study_folders" del servidor, lo pisa con lo
        // que de verdad hay guardado (nada) y la carpeta recién encontrada desaparece sola.
        await Promise.all(matches.map((m) => saveItemToFirestore(userId, "pinned_study_folders", m)));
        setPinnedFolders((prev) => {
          const existingIds = new Set(prev.map((p) => p.folderId));
          return [...prev, ...matches.filter((m) => !existingIds.has(m.folderId))];
        });
      }
    } catch (err: any) {
      // A diferencia de antes, el error ya no se traga en silencio: si el escaneo automático
      // falla de verdad (token vencido, permisos, guardado en Firestore, etc.) se muestra para
      // poder diagnosticarlo, en vez de que parezca que "se buscó bien y no había nada".
      setScanError(err?.message || "No se pudo buscar materias en Drive.");
    } finally {
      setAutoPinning(false);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    if (!autoPinDoneRef.current) {
      autoPinDoneRef.current = true;
      runAutoScan(accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

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

  // El % de avance se calcula sobre los ítems "principales" de la carpeta: archivos o carpetas/
  // unidades anidadas marcadas a mano desde Facultad — no sobre el total de material, que puede
  // incluir cosas que no son para estudiar. Las marcas nuevas ya guardan a qué carpeta fijada
  // pertenecen (pinnedFolderId); las de antes de poder marcar carpetas (solo archivos) no lo
  // tienen, así que para esas se sigue infiriendo por pertenencia directa a esta carpeta, como
  // antes de esta vuelta.
  const progressFor = (folderId: string): number => {
    const direct = completedFiles.filter((c) => c.pinnedFolderId === folderId);
    const files = filesByFolder[folderId];
    const legacyIds = new Set((files || []).map((f) => f.id));
    const legacy = completedFiles.filter((c) => !c.pinnedFolderId && legacyIds.has(c.fileId));
    const principal = [...direct, ...legacy];
    if (principal.length === 0) return 0;
    const done = principal.filter((c) => c.completed).length;
    return (done / principal.length) * 100;
  };

  const emptyStateMessage = (() => {
    if (!accessToken) return 'Conectá tu Google Drive para ver el avance de las materias que estás cursando.';
    if (autoPinning) return "Buscando materias en tus carpetas de Drive…";
    if (scanError) return `No se pudo buscar en Drive: ${scanError}`;
    if (scanMeta && !scanMeta.rootFound) {
      return 'No se encontró la carpeta "1 - Facultad" en tu Drive. Fijá alguna a mano desde "Facultad" si el nombre es distinto.';
    }
    if (scanMeta && scanMeta.visitedCount > 0) {
      const warning = scanMeta.hadErrors
        ? " (ojo: algunas subcarpetas no se pudieron leer, puede que falten resultados)"
        : "";
      return `Se revisaron ${scanMeta.visitedCount} carpetas dentro de "1 - Facultad" y ninguna coincide con una materia que se pueda rendir o cursar.${warning} Fijá alguna a mano desde "Facultad" si hace falta.`;
    }
    return 'No se encontró ninguna carpeta con el nombre de una materia que se pueda rendir o cursar. Fijá alguna a mano desde "Facultad" si hace falta.';
  })();

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
          <button
            type="button"
            onClick={() => runAutoScan(accessToken)}
            disabled={autoPinning}
            title="Volver a buscar materias en Drive"
            className="p-1.5 rounded-full text-zinc-400 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoPinning ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {connectError && (
        <p className="text-[10px] text-red-500 font-semibold mb-3">{connectError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {autoPinning && (
          <div className="lg:col-span-2 flex items-center gap-2 text-[10px] text-zinc-500 font-medium px-1 pb-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>Buscando materias que se pueden rendir o cursar en tus carpetas de Drive…</span>
          </div>
        )}
        {pinnedFolders.length === 0 ? (
          <div className="lg:col-span-2 flex flex-col items-center justify-center text-center py-10 gap-2">
            <AnimatedFolder size={36} className="text-zinc-400" />
            <p className={`text-xs italic max-w-sm ${scanError ? "text-red-500 font-semibold" : "text-zinc-500"}`}>
              {emptyStateMessage}
            </p>
          </div>
        ) : (
          pinnedFolders.map((folder) => (
            <PinnedFolderCard
              key={folder.folderId}
              folder={folder}
              files={filesByFolder[folder.folderId]}
              driveConnected={!!accessToken}
              progress={progressFor(folder.folderId)}
              onOpen={() => onOpenInFacultad(folder.folderId, folder.folderName)}
              darkMode={darkMode}
              hasTree={!!treeFor(folder.folderId)}
              onTreeClick={() => {
                uiSounds.click();
                setTreeModalFolder(folder);
              }}
            />
          ))
        )}
      </div>

      {treeModalFolder && (
        <StudyPlanTreeModal
          open
          onClose={() => setTreeModalFolder(null)}
          darkMode={darkMode}
          userId={userId}
          accessToken={accessToken}
          folderId={treeModalFolder.folderId}
          folderName={treeModalFolder.folderName}
          studyPlanTree={treeFor(treeModalFolder.folderId)}
          setStudyPlanTree={setStudyPlanTree}
          onOpenInFacultad={(folderId, folderNameArg, fileId) => {
            // Navegar a Facultad con el árbol todavía abierto arriba se ve roto (como si no
            // hubiera pasado nada) — se cierra el modal de una vez, antes de la navegación.
            setTreeModalFolder(null);
            onOpenInFacultad(folderId, folderNameArg, fileId);
          }}
          setExams={setExams}
        />
      )}
    </div>
  );
}

export default StudyMaterialBlock;
