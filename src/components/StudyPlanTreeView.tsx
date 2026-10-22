import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Layers, ChevronRight, LayoutGrid, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { StudyPlanTreeNode } from "../types";
import { layoutStudyPlanTree } from "../lib/studyPlanTree";
import { uiSounds } from "../lib/sounds";

type TreeNodeData = { label: string; kind: "group" | "materia"; index: number };

// Nodo custom: "group" (encabezado del documento, más grande/sólido) vs "materia" (hoja, tarjeta
// con el acento de la app). El leve delay de entrada escalonado por índice da la sensación de que
// el árbol "crece" en vez de aparecer todo de golpe.
function TreeNode({ data }: NodeProps<Node<TreeNodeData>>) {
  const isGroup = data.kind === "group";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(data.index * 0.025, 1.2), ease: "easeOut" }}
      className={`px-3.5 py-2.5 rounded-2xl border-2 shadow-md flex items-center gap-2 max-w-[200px] ${
        isGroup
          ? "bg-primary text-white dark:text-black border-primary font-extrabold text-xs"
          : "bg-white dark:bg-zinc-900 border-primary/40 text-zinc-800 dark:text-zinc-100 font-bold text-[11px] hover:border-primary hover:shadow-lg transition-all"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !border-0 !w-2 !h-2" />
      {isGroup ? <Layers className="w-3.5 h-3.5 shrink-0" /> : <BookOpen className="w-3 h-3 text-primary shrink-0" />}
      <span className="truncate">{data.label}</span>
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

function FlowDiagram({
  nodes: planNodes,
  darkMode,
  jumpTarget,
}: {
  nodes: StudyPlanTreeNode[];
  darkMode: boolean;
  jumpTarget: { id: string; nonce: number } | null;
}) {
  const instanceRef = useRef<ReactFlowInstance | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    const laidOut = layoutStudyPlanTree(planNodes);
    const flowNodes: Node<TreeNodeData>[] = laidOut.map((n, i) => ({
      id: n.id,
      type: "treeNode",
      position: { x: n.x, y: n.y },
      data: { label: n.label, kind: n.kind, index: i },
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
  }, [planNodes]);

  // El fitView declarativo de ReactFlow solo corre una vez al montar — este efecto reencuadra
  // cada vez que cambia el subconjunto de nodos visible (al enfocar/desenfocar una unidad).
  useEffect(() => {
    instanceRef.current?.fitView({ duration: 500, padding: 0.3 });
  }, [planNodes]);

  // Clic en un subtema del menú: centra y hace zoom específicamente sobre ESE nodo (más cerca
  // que un fitView del subárbol entero). Se dispara después del efecto de arriba en el mismo
  // commit, así que su animación termina "ganando" sobre el reencuadre general.
  useEffect(() => {
    if (!jumpTarget || !instanceRef.current) return;
    instanceRef.current.fitView({ nodes: [{ id: jumpTarget.id }], duration: 650, padding: 0.6, maxZoom: 1.4 });
  }, [jumpTarget]);

  return (
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
    >
      <Background gap={18} size={1.5} className={darkMode ? "!bg-zinc-950" : "!bg-slate-50"} />
      <Controls showInteractive={false} />
    </ReactFlow>
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

export function StudyPlanTreeView({ planNodes, darkMode }: { planNodes: StudyPlanTreeNode[]; darkMode: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusedTopId, setFocusedTopId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [jumpTarget, setJumpTarget] = useState<{ id: string; nonce: number } | null>(null);

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
  };

  const showAll = () => {
    uiSounds.click();
    setFocusedTopId(null);
    setJumpTarget(null);
  };

  return (
    <div className="w-full h-full flex rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
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
        <ReactFlowProvider>
          <FlowDiagram nodes={visibleNodes} darkMode={darkMode} jumpTarget={jumpTarget} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

export default StudyPlanTreeView;
