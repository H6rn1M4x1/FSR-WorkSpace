import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Layers,
  ChevronRight,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Minus,
  Maximize,
  Paperclip,
  Highlighter,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { StudyPlanTree, StudyPlanTreeNode, StudyPlanTreeAttachment, StudyPlanTreeHighlight } from "../types";
import { layoutStudyPlanTree } from "../lib/studyPlanTree";
import { uiSounds } from "../lib/sounds";
import { DriveFilePickerView } from "./DriveFilePickerView";
import { useDriveFilePicker, DriveItemLite } from "../hooks/useDriveFilePicker";
import { PdfHighlightViewer } from "./PdfHighlightViewer";

// Solo los adjuntos en PDF pueden tener una porción resaltada — el visor de resaltado está
// construido sobre pdf.js, no sirve para otros formatos (imágenes, Office, etc.).
function isPdfFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

type TreeNodeData = { label: string; kind: "group" | "materia"; index: number; hasAttachment: boolean };

// Nodo custom: "group" (encabezado del documento, más grande/sólido) vs "materia" (hoja, tarjeta
// con el acento de la app). El leve delay de entrada escalonado por índice da la sensación de que
// el árbol "crece" en vez de aparecer todo de golpe. El clip (Paperclip) marca los nodos que
// tienen un archivo de referencia adjuntado por el usuario.
function TreeNode({ data }: NodeProps<Node<TreeNodeData>>) {
  const isGroup = data.kind === "group";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(data.index * 0.025, 1.2), ease: "easeOut" }}
      className={`relative px-3.5 py-2.5 rounded-2xl border-2 shadow-md flex items-center gap-2 max-w-[200px] ${
        isGroup
          ? "bg-primary text-white dark:text-black border-primary font-extrabold text-xs"
          : "bg-white dark:bg-zinc-900 border-primary/40 text-zinc-800 dark:text-zinc-100 font-bold text-[11px] hover:border-primary hover:shadow-lg transition-all"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !border-0 !w-2 !h-2" />
      {isGroup ? <Layers className="w-3.5 h-3.5 shrink-0" /> : <BookOpen className="w-3 h-3 text-primary shrink-0" />}
      <span className="truncate">{data.label}</span>
      {data.hasAttachment && (
        <span
          className={`absolute -top-1.5 -right-1.5 p-1 rounded-full shadow ${
            isGroup ? "bg-white text-primary" : "bg-primary text-white dark:text-black"
          }`}
          title="Tiene un archivo adjunto"
        >
          <Paperclip className="w-2.5 h-2.5" />
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary !border-0 !w-2 !h-2" />
    </motion.div>
  );
}

const nodeTypes = { treeNode: TreeNode };

// Devuelve el nodo + todos sus descendientes (recursivo) — para "enfocar" una sola unidad del
// menú sin perder su jerarquía interna.
function getSubtree(nodes: StudyPlanTreeNode[], rootId: string): StudyPlanTreeNode[] {
  const byParent = new Map<string | null, StudyPlanTreeNode[]>();
  nodes.forEach((n) => {
    if (!byParent.has(n.parentId)) byParent.set(n.parentId, []);
    byParent.get(n.parentId)!.push(n);
  });
  const result: StudyPlanTreeNode[] = [];
  const visit = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    result.push(node);
    (byParent.get(id) || []).forEach((child) => visit(child.id));
  };
  visit(rootId);
  return result;
}

// Ancestro de nivel superior (parentId: null) de un nodo cualquiera — clickear un subtema desde
// cualquier profundidad necesita saber a qué unidad "pertenece" para enfocar esa unidad primero.
function findTopAncestorId(nodes: StudyPlanTreeNode[], nodeId: string): string | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let current = byId.get(nodeId);
  if (!current) return null;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    current = parent;
  }
  return current.id;
}

// Controles de zoom propios (redondeados, con el estilo del resto de la app) en vez de los
// cuadrados default de ReactFlow, que no combinaban con el resto de la página.
function ZoomControls({ instanceRef, darkMode }: { instanceRef: React.RefObject<ReactFlowInstance | null>; darkMode: boolean }) {
  const btnClass = `p-2 rounded-full transition-all cursor-pointer ${
    darkMode ? "text-zinc-300 hover:bg-zinc-700" : "text-zinc-600 hover:bg-zinc-100"
  }`;
  return (
    <div
      className={`absolute bottom-3 left-3 z-10 flex flex-col gap-0.5 p-1 rounded-full shadow-md ${
        darkMode ? "bg-zinc-800" : "bg-white"
      }`}
    >
      <button type="button" title="Acercar" onClick={() => instanceRef.current?.zoomIn({ duration: 200 })} className={btnClass}>
        <Plus className="w-3.5 h-3.5" />
      </button>
      <button type="button" title="Alejar" onClick={() => instanceRef.current?.zoomOut({ duration: 200 })} className={btnClass}>
        <Minus className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        title="Encuadrar todo"
        onClick={() => instanceRef.current?.fitView({ duration: 400, padding: 0.3 })}
        className={btnClass}
      >
        <Maximize className="w-3 h-3" />
      </button>
    </div>
  );
}

function FlowDiagram({
  nodes: planNodes,
  darkMode,
  jumpTarget,
  focusedTopId,
  attachments,
  onNodeContextMenu,
  onNodeClick,
}: {
  nodes: StudyPlanTreeNode[];
  darkMode: boolean;
  jumpTarget: { id: string; nonce: number } | null;
  // Solo para decidir CUÁNDO reencuadrar (ver el efecto de abajo) — no se usa para filtrar nodos,
  // eso ya lo hizo el padre al armar `planNodes`.
  focusedTopId: string | null;
  attachments: Record<string, StudyPlanTreeAttachment>;
  onNodeContextMenu: (event: React.MouseEvent, nodeId: string) => void;
  onNodeClick: (nodeId: string) => void;
}) {
  const instanceRef = useRef<ReactFlowInstance | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    const laidOut = layoutStudyPlanTree(planNodes);
    const flowNodes: Node<TreeNodeData>[] = laidOut.map((n, i) => ({
      id: n.id,
      type: "treeNode",
      position: { x: n.x, y: n.y },
      data: { label: n.label, kind: n.kind, index: i, hasAttachment: !!attachments[n.id] },
    }));
    const flowEdges: Edge[] = laidOut
      .filter((n) => n.parentId)
      .map((n) => ({
        id: `${n.parentId}-${n.id}`,
        source: n.parentId as string,
        target: n.id,
        animated: true,
        style: { stroke: "var(--color-primary)", strokeWidth: 1.5 },
      }));
    return { flowNodes, flowEdges };
  }, [planNodes, attachments]);

  // El fitView declarativo de ReactFlow solo corre una vez al montar — este efecto reencuadra
  // cada vez que cambia la unidad enfocada (clic en "Todas las unidades" o en una unidad del
  // menú). A propósito depende de `focusedTopId` y NO de `planNodes`/`attachments`: esos objetos
  // llegan nuevos en cada resync de Firestore (poll de 60s / listener en tiempo real) aunque el
  // contenido sea el mismo, y reencuadrar en esos casos le pisaba al usuario el zoom/paneo manual
  // que había hecho poco antes — por eso "a veces, al minuto, el zoom se vuelve para atrás".
  useEffect(() => {
    instanceRef.current?.fitView({ duration: 500, padding: 0.3 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedTopId]);

  // Clic en un subtema del menú: centra y hace zoom específicamente sobre ESE nodo (más cerca
  // que un fitView del subárbol entero). Se dispara después del efecto de arriba en el mismo
  // commit, así que su animación termina "ganando" sobre el reencuadre general.
  useEffect(() => {
    if (!jumpTarget || !instanceRef.current) return;
    instanceRef.current.fitView({ nodes: [{ id: jumpTarget.id }], duration: 650, padding: 0.6, maxZoom: 1.4 });
  }, [jumpTarget]);

  return (
    <>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        colorMode={darkMode ? "dark" : "light"}
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}
        onInit={(instance) => {
          instanceRef.current = instance;
        }}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          onNodeContextMenu(event, node.id);
        }}
        onNodeClick={(_event, node) => onNodeClick(node.id)}
      >
        <Background gap={18} size={1.5} className={darkMode ? "!bg-zinc-950" : "!bg-slate-50"} />
      </ReactFlow>
      <ZoomControls instanceRef={instanceRef} darkMode={darkMode} />
    </>
  );
}

function TreeMenuItem({
  node,
  depth,
  childrenByParent,
  expandedIds,
  onToggleExpand,
  onSelect,
  isTopLevel,
  selectedId,
  darkMode,
}: {
  node: StudyPlanTreeNode;
  depth: number;
  childrenByParent: Map<string, StudyPlanTreeNode[]>;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (node: StudyPlanTreeNode, isTopLevel: boolean) => void;
  isTopLevel: boolean;
  selectedId: string | null;
  darkMode: boolean;
}) {
  const children = childrenByParent.get(node.id) || [];
  const hasChildren = children.length > 0;
  const expanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-lg transition-colors ${isSelected ? "bg-primary/15" : ""}`}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.id)}
            className={`p-1 rounded-md shrink-0 cursor-pointer ${darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200"}`}
            title={expanded ? "Contraer" : "Expandir"}
          >
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="w-3 h-3" />
            </motion.div>
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node, isTopLevel)}
          className={`flex-1 min-w-0 flex items-center gap-1.5 py-1.5 pr-2 text-left text-[11px] truncate transition-colors cursor-pointer ${
            node.kind === "group" ? "font-bold" : "font-semibold"
          } ${
            isSelected
              ? "text-primary"
              : darkMode
                ? "text-zinc-300 hover:text-white"
                : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {node.kind === "group" ? (
            <Layers className="w-3 h-3 shrink-0 opacity-70" />
          ) : (
            <BookOpen className="w-3 h-3 shrink-0 opacity-50" />
          )}
          <span className="truncate">{node.label}</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {hasChildren && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <TreeMenuItem
                key={child.id}
                node={child}
                depth={depth + 1}
                childrenByParent={childrenByParent}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                isTopLevel={false}
                selectedId={selectedId}
                darkMode={darkMode}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Menú contextual (clic derecho) de un nodo del diagrama — adjuntar/ver/quitar su archivo de
// referencia. Se cierra solo con cualquier clic o Escape.
function NodeContextMenu({
  x,
  y,
  hasAttachment,
  canHighlight,
  onAttach,
  onViewAttachment,
  onHighlight,
  onRemoveAttachment,
  onClose,
  darkMode,
}: {
  x: number;
  y: number;
  hasAttachment: boolean;
  // Solo se puede resaltar una porción si el adjunto actual es un PDF (ver `isPdfFile`).
  canHighlight: boolean;
  onAttach: () => void;
  onViewAttachment: () => void;
  onHighlight: () => void;
  onRemoveAttachment: () => void;
  onClose: () => void;
  darkMode: boolean;
}) {
  useEffect(() => {
    const dismiss = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // El click derecho que ABRE este menú sigue burbujeando hasta window después de este efecto
    // montar — si el listener se engancha ya mismo, ese mismo evento lo cierra al instante. Se
    // engancha recién en el siguiente tick, una vez que el evento que lo abrió ya terminó.
    const timer = setTimeout(() => {
      window.addEventListener("click", dismiss);
      window.addEventListener("contextmenu", dismiss);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", dismiss);
      window.removeEventListener("contextmenu", dismiss);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const itemClass = `w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold transition-colors cursor-pointer ${
    darkMode ? "text-zinc-200 hover:bg-zinc-700" : "text-zinc-700 hover:bg-zinc-100"
  }`;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ position: "fixed", left: x, top: y, zIndex: 80 }}
      className={`min-w-[190px] rounded-xl border shadow-xl py-1.5 overflow-hidden ${
        darkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-zinc-200"
      }`}
    >
      {hasAttachment && (
        <button type="button" onClick={onViewAttachment} className={itemClass}>
          <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
          Ver archivo adjunto
        </button>
      )}
      {canHighlight && (
        <button type="button" onClick={onHighlight} className={itemClass}>
          <Highlighter className="w-3.5 h-3.5 text-primary shrink-0" />
          Resaltar una parte
        </button>
      )}
      <button type="button" onClick={onAttach} className={itemClass}>
        <Paperclip className="w-3.5 h-3.5 shrink-0" />
        {hasAttachment ? "Cambiar archivo adjunto" : "Adjuntar archivo"}
      </button>
      {hasAttachment && (
        <button type="button" onClick={onRemoveAttachment} className={`${itemClass} text-red-500`}>
          <X className="w-3.5 h-3.5 shrink-0" />
          Quitar archivo adjunto
        </button>
      )}
    </div>
  );
}

type RightPanelContent = {
  kind: "original" | "attachment";
  fileId: string;
  fileName: string;
  nodeLabel?: string;
  highlight?: StudyPlanTreeHighlight;
};

// Qué hacer con el visor de resaltado abierto (clic derecho → "Adjuntar archivo" sobre un PDF
// recién elegido, o clic derecho → "Resaltar una parte" sobre uno ya adjuntado).
type HighlightTarget = { node: StudyPlanTreeNode; fileId: string; fileName: string };

export function StudyPlanTreeView({
  studyPlanTree,
  darkMode,
  accessToken,
  folderId,
  folderName,
  onSaveAttachment,
}: {
  studyPlanTree: StudyPlanTree;
  darkMode: boolean;
  accessToken: string | null;
  folderId: string;
  folderName: string;
  onSaveAttachment: (nodeId: string, file: StudyPlanTreeAttachment | null) => void;
}) {
  const planNodes = studyPlanTree.nodes;
  const attachments = studyPlanTree.attachments || {};

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusedTopId, setFocusedTopId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [jumpTarget, setJumpTarget] = useState<{ id: string; nonce: number } | null>(null);
  // Abierto por defecto mostrando el programa original — el usuario lo puede colapsar con el
  // botón de arriba a la derecha o el de cerrar del propio panel.
  const [rightPanel, setRightPanel] = useState<RightPanelContent | null>(() => ({
    kind: "original",
    fileId: studyPlanTree.sourceFileId,
    fileName: studyPlanTree.sourceFileName,
  }));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [attachPickerNode, setAttachPickerNode] = useState<StudyPlanTreeNode | null>(null);
  const [highlightTarget, setHighlightTarget] = useState<HighlightTarget | null>(null);
  // Si el panel arranca abierto no hay ninguna animación de ancho que esperar (arranca ya en su
  // tamaño final) — solo las aperturas POSTERIORES (reabrir tras cerrar, primer adjunto de un
  // tema) pasan por una animación real de 0 a 320px, y ESA es la que hay que esperar a que
  // termine antes de montar el iframe: si arranca mientras el contenedor todavía mide 0px, el
  // visor de Drive a veces queda renderizado en negro hasta forzar un remount (cerrar y reabrir
  // el modal entero) — por eso "se quedó en negro, tuve que salir y volver a entrar".
  const rightPanelWasOpenRef = useRef(true);
  const [rightPanelReady, setRightPanelReady] = useState(true);

  const attachPicker = useDriveFilePicker(accessToken, folderId, folderName);

  const topNodes = useMemo(() => planNodes.filter((n) => !n.parentId), [planNodes]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, StudyPlanTreeNode[]>();
    planNodes.forEach((n) => {
      if (!n.parentId) return;
      if (!map.has(n.parentId)) map.set(n.parentId, []);
      map.get(n.parentId)!.push(n);
    });
    return map;
  }, [planNodes]);

  const visibleNodes = useMemo(() => {
    if (!focusedTopId) return planNodes;
    return getSubtree(planNodes, focusedTopId);
  }, [planNodes, focusedTopId]);

  const selectedId = jumpTarget?.id ?? focusedTopId;

  useEffect(() => {
    if (!rightPanel) {
      rightPanelWasOpenRef.current = false;
      setRightPanelReady(false);
    } else if (rightPanelWasOpenRef.current) {
      // Ya estaba abierto (se cambió de adjunto/original a otro contenido): el contenedor ya
      // tiene su ancho final, no hay ninguna animación que esperar.
      setRightPanelReady(true);
    }
    // Si se está recién abriendo desde cerrado, rightPanelReady queda en false hasta que
    // onAnimationComplete (abajo, en el motion.div) avise que la animación de ancho terminó.
  }, [rightPanel]);

  const toggleExpanded = (id: string) => {
    uiSounds.navigate();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectNode = (node: StudyPlanTreeNode, isTopLevel: boolean) => {
    uiSounds.click();
    if (isTopLevel) {
      // Clic en una unidad: si ya está enfocada, vuelve a mostrar todas; si no, la enfoca sola
      // y de paso abre su propio submenú para que se vea el detalle que acaba de aparecer.
      const nowFocused = focusedTopId === node.id ? null : node.id;
      setFocusedTopId(nowFocused);
      setJumpTarget(null);
      if (nowFocused) setExpandedIds((prev) => new Set(prev).add(node.id));
    } else {
      const topId = findTopAncestorId(planNodes, node.id);
      setFocusedTopId(topId);
      setJumpTarget({ id: node.id, nonce: Date.now() });
    }
    // Si el tema seleccionado (unidad o subtema) tiene un archivo adjunto, mostrarlo directo a la
    // derecha — seleccionarlo desde el menú es la forma principal de navegar, no solo clickearlo
    // en el diagrama.
    const att = attachments[node.id];
    if (att) {
      setRightPanel({
        kind: "attachment",
        fileId: att.fileId,
        fileName: att.fileName,
        nodeLabel: node.label,
        highlight: att.highlight,
      });
    }
  };

  const showAll = () => {
    uiSounds.click();
    setFocusedTopId(null);
    setJumpTarget(null);
  };

  const showAttachmentFor = (nodeId: string) => {
    const att = attachments[nodeId];
    if (!att) return;
    const node = planNodes.find((n) => n.id === nodeId);
    uiSounds.click();
    setRightPanel({
      kind: "attachment",
      fileId: att.fileId,
      fileName: att.fileName,
      nodeLabel: node?.label,
      highlight: att.highlight,
    });
  };

  const toggleOriginal = () => {
    uiSounds.click();
    setRightPanel((prev) =>
      prev?.kind === "original"
        ? null
        : { kind: "original", fileId: studyPlanTree.sourceFileId, fileName: studyPlanTree.sourceFileName },
    );
  };

  const handleDiagramNodeClick = (nodeId: string) => {
    if (attachments[nodeId]) showAttachmentFor(nodeId);
  };

  const handleDiagramNodeContextMenu = (event: React.MouseEvent, nodeId: string) => {
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId });
  };

  const contextNode = contextMenu ? planNodes.find((n) => n.id === contextMenu.nodeId) || null : null;

  const handleAttachPick = (file: DriveItemLite) => {
    if (!attachPickerNode) return;
    const node = attachPickerNode;
    setAttachPickerNode(null);
    if (isPdfFile(file.name)) {
      // Antes de guardar el adjunto, dejar elegir qué parte del PDF vincular a este tema (o
      // saltear y adjuntar el archivo completo) — ver `handleHighlightSave`/`handleHighlightSkip`.
      uiSounds.click();
      setHighlightTarget({ node, fileId: file.id, fileName: file.name });
      return;
    }
    onSaveAttachment(node.id, { fileId: file.id, fileName: file.name });
    uiSounds.success();
    setRightPanel({ kind: "attachment", fileId: file.id, fileName: file.name, nodeLabel: node.label });
  };

  // Confirmar un resaltado nuevo (texto seleccionado o recuadro dibujado): guarda el adjunto YA
  // con esa porción vinculada, y lo muestra a la derecha.
  const handleHighlightSave = (highlight: StudyPlanTreeHighlight) => {
    if (!highlightTarget) return;
    const { node, fileId, fileName } = highlightTarget;
    onSaveAttachment(node.id, { fileId, fileName, highlight });
    setRightPanel({ kind: "attachment", fileId, fileName, nodeLabel: node.label, highlight });
    setHighlightTarget(null);
  };

  // "Guardar sin resaltar": adjunta (o deja) el archivo completo, sin ninguna porción marcada —
  // sirve tanto para el primer adjunto (saltear el resaltado) como para quitarle el resaltado a
  // uno que ya tenía.
  const handleHighlightSkip = () => {
    if (!highlightTarget) return;
    const { node, fileId, fileName } = highlightTarget;
    onSaveAttachment(node.id, { fileId, fileName });
    uiSounds.success();
    setRightPanel({ kind: "attachment", fileId, fileName, nodeLabel: node.label });
    setHighlightTarget(null);
  };

  // Cancelar el visor de resaltado sin tocar nada (ni guardar el adjunto nuevo, ni modificar el
  // resaltado de uno existente).
  const handleHighlightCancel = () => setHighlightTarget(null);

  return (
    <div className="w-full h-full flex rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      {/* Sidebar de unidades/submenús */}
      <motion.div
        animate={{ width: sidebarOpen ? 260 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className={`h-full shrink-0 overflow-hidden border-r ${
          darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-slate-50 border-zinc-150"
        }`}
      >
        <div className="w-[260px] h-full overflow-y-auto p-2">
          <button
            type="button"
            onClick={showAll}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-bold mb-1.5 transition-colors cursor-pointer ${
              !selectedId
                ? "bg-primary text-white dark:text-black"
                : darkMode
                  ? "text-zinc-300 hover:bg-zinc-800"
                  : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            Todas las unidades
          </button>
          {topNodes.map((topNode) => (
            <TreeMenuItem
              key={topNode.id}
              node={topNode}
              depth={0}
              childrenByParent={childrenByParent}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpanded}
              onSelect={handleSelectNode}
              isTopLevel
              selectedId={selectedId}
              darkMode={darkMode}
            />
          ))}
        </div>
      </motion.div>

      {/* Diagrama */}
      <div className="flex-1 min-w-0 relative">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
          className={`absolute top-3 left-3 z-10 p-2 rounded-full shadow-md transition-all cursor-pointer ${
            darkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={toggleOriginal}
          title={rightPanel?.kind === "original" ? "Ocultar programa original" : "Ver programa original"}
          className={`absolute top-3 right-3 z-10 p-2 rounded-full shadow-md transition-all cursor-pointer ${
            rightPanel?.kind === "original"
              ? "bg-primary text-white dark:text-black"
              : darkMode
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : "bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {rightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
        <ReactFlowProvider>
          <FlowDiagram
            nodes={visibleNodes}
            darkMode={darkMode}
            jumpTarget={jumpTarget}
            focusedTopId={focusedTopId}
            attachments={attachments}
            onNodeContextMenu={handleDiagramNodeContextMenu}
            onNodeClick={handleDiagramNodeClick}
          />
        </ReactFlowProvider>
      </div>

      {/* Panel derecho: programa original o archivo adjunto del nodo seleccionado */}
      <motion.div
        animate={{ width: rightPanel ? 320 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        onAnimationComplete={() => {
          // Este callback dispara tanto al terminar de ABRIR como de CERRAR (cualquier animación
          // de ancho que asiente) — sin el `if` de afuera, una cerrada marcaría "ya estaba
          // abierto" y la PRÓXIMA apertura montaría el iframe de nuevo sin esperar su animación.
          if (rightPanel) {
            rightPanelWasOpenRef.current = true;
            setRightPanelReady(true);
          }
        }}
        className={`h-full shrink-0 overflow-hidden border-l ${
          darkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-slate-50 border-zinc-150"
        }`}
      >
        <div className="w-[320px] h-full flex flex-col">
          {rightPanel && (
            <>
              <div
                className={`flex items-center justify-between gap-2 px-3 py-2.5 border-b shrink-0 ${
                  darkMode ? "border-zinc-800" : "border-zinc-150"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-primary uppercase tracking-wide truncate">
                    {rightPanel.kind === "original" ? "Programa original" : `Adjunto · ${rightPanel.nodeLabel}`}
                  </p>
                  <p className="text-[11px] font-semibold truncate">{rightPanel.fileName}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      window.open(`https://drive.google.com/file/d/${rightPanel.fileId}/view`, "_blank", "noopener,noreferrer")
                    }
                    title="Abrir en Google Drive"
                    className={`p-1.5 rounded-full cursor-pointer ${
                      darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanel(null)}
                    title="Cerrar"
                    className={`p-1.5 rounded-full cursor-pointer ${
                      darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {rightPanelReady ? (
                rightPanel.kind === "attachment" && isPdfFile(rightPanel.fileName) ? (
                  <PdfHighlightViewer
                    key={rightPanel.fileId}
                    fileId={rightPanel.fileId}
                    accessToken={accessToken}
                    darkMode={darkMode}
                    mode="view"
                    highlight={rightPanel.highlight}
                  />
                ) : (
                  <iframe
                    key={rightPanel.fileId}
                    src={`https://drive.google.com/file/d/${rightPanel.fileId}/preview`}
                    className="flex-1 w-full border-0"
                    allow="autoplay"
                    title={rightPanel.fileName}
                  />
                )
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {contextMenu && contextNode && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          hasAttachment={!!attachments[contextNode.id]}
          canHighlight={!!attachments[contextNode.id] && isPdfFile(attachments[contextNode.id].fileName)}
          onAttach={() => {
            setAttachPickerNode(contextNode);
            setContextMenu(null);
          }}
          onViewAttachment={() => {
            showAttachmentFor(contextNode.id);
            setContextMenu(null);
          }}
          onHighlight={() => {
            const att = attachments[contextNode.id];
            if (att) setHighlightTarget({ node: contextNode, fileId: att.fileId, fileName: att.fileName });
            setContextMenu(null);
          }}
          onRemoveAttachment={() => {
            onSaveAttachment(contextNode.id, null);
            setRightPanel((prev) => (prev?.kind === "attachment" && prev.nodeLabel === contextNode.label ? null : prev));
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
          darkMode={darkMode}
        />
      )}

      {/* Picker para adjuntar un archivo a un nodo — overlay propio encima de todo lo demás. */}
      {attachPickerNode && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setAttachPickerNode(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl h-[70vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
            }`}
          >
            <div
              className={`flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0 ${
                darkMode ? "border-zinc-800" : "border-zinc-150"
              }`}
            >
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm truncate">Adjuntar archivo</h3>
                <p className="text-[10px] text-zinc-500 font-semibold truncate">{attachPickerNode.label}</p>
              </div>
              <button
                type="button"
                onClick={() => setAttachPickerNode(null)}
                className={`p-2 rounded-full cursor-pointer shrink-0 ${
                  darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-400"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <DriveFilePickerView
                darkMode={darkMode}
                breadcrumbs={attachPicker.breadcrumbs}
                items={attachPicker.items}
                loadingItems={attachPicker.loadingItems}
                error={attachPicker.error}
                onNavigate={attachPicker.navigateTo}
                onPickFile={handleAttachPick}
                emptyMessage="Esta carpeta no tiene subcarpetas ni archivos."
              />
            </div>
          </div>
        </div>
      )}

      {/* Visor para elegir qué porción del PDF vincular al tema — overlay propio por encima de
          todo, igual que el picker de arriba (de hecho reemplaza a ese modal en el flujo de
          adjuntar: se abre apenas se elige un PDF, en vez de guardar directo). */}
      {highlightTarget && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-3xl h-[82vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-800"
            }`}
          >
            <div
              className={`flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0 ${
                darkMode ? "border-zinc-800" : "border-zinc-150"
              }`}
            >
              <div className="min-w-0">
                <h3 className="font-extrabold text-sm truncate">Resaltar una parte (opcional)</h3>
                <p className="text-[10px] text-zinc-500 font-semibold truncate">
                  {highlightTarget.node.label} · {highlightTarget.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={handleHighlightCancel}
                className={`p-2 rounded-full cursor-pointer shrink-0 ${
                  darkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-400"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <PdfHighlightViewer
                key={highlightTarget.fileId}
                fileId={highlightTarget.fileId}
                accessToken={accessToken}
                darkMode={darkMode}
                mode="select"
                onSave={handleHighlightSave}
                onSkip={handleHighlightSkip}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyPlanTreeView;
