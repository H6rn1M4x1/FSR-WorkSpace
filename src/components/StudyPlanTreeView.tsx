import React, { useMemo } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "motion/react";
import { BookOpen, Layers } from "lucide-react";
import { StudyPlanTreeNode } from "../types";
import { layoutStudyPlanTree } from "../lib/studyPlanTree";

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

export function StudyPlanTreeView({
  planNodes,
  darkMode,
}: {
  planNodes: StudyPlanTreeNode[];
  darkMode: boolean;
}) {
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

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
      <ReactFlowProvider>
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
        >
          <Background gap={18} size={1.5} className={darkMode ? "!bg-zinc-950" : "!bg-slate-50"} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export default StudyPlanTreeView;
