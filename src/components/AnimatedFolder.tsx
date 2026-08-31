import React from "react";
import { motion } from "motion/react";

interface AnimatedFolderProps {
  className?: string;
  isHovered?: boolean;
  size?: number | string;
}

export const AnimatedFolder: React.FC<AnimatedFolderProps> = ({
  className = "",
  isHovered = false,
  size = 24,
}) => {
  // Conversión de size a número para cálculos proporcionales
  const numericSize = typeof size === "number" ? size : parseInt(size.toString(), 10) || 24;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: numericSize,
        height: numericSize,
        perspective: `${numericSize * 4}px`, // Perspectiva 3D proporcional para la rotación del flap
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full overflow-visible"
      >
        {/* 1. Solapa Trasera de la Carpeta (Folder Back Flap) */}
        <path
          d="M4 19V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l0.83 1.2a2 2 0 0 0 1.69.9H18a2 2 0 0 1 2 2v2"
          className="transition-colors duration-200"
          stroke="currentColor"
          fill="currentColor"
        />

        {/* 2. Hoja de Papel Trasera (Fondo) que sube en hover */}
        <motion.rect
          x="6"
          y="6"
          width="12"
          height="10"
          rx="1.5"
          fill="currentColor"
          className="text-zinc-200 dark:text-zinc-700 transition-colors duration-200 shadow-sm"
          animate={{
            y: isHovered ? -4.5 : 0,
            x: isHovered ? -0.5 : 0,
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
        />

        {/* 3. Hoja de Papel Delantera (Principal) que sube aún más */}
        <motion.rect
          x="8"
          y="8"
          width="10"
          height="8"
          rx="1.5"
          fill="currentColor"
          className="text-white dark:text-zinc-500 transition-colors duration-200"
          animate={{
            y: isHovered ? -6.5 : 0,
            x: isHovered ? 1 : 0,
            scale: isHovered ? 1.08 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 16,
          }}
        />

        {/* 4. Solapa Delantera de la Carpeta (Folder Front Flap) */}
        {/* Esta solapa rota hacia adelante (X-axis) simulando una apertura en 3D */}
        <motion.path
          d="M 2 19 V 8 a 1.5 1.5 0 0 1 1.5 -1.5 h 17 a 1.5 1.5 0 0 1 1.5 1.5 v 11 a 2 2 0 0 1 -2 2 H 4 a 2 2 0 0 1 -2 -2 Z"
          className="transition-colors duration-200"
          stroke="currentColor"
          fill="currentColor"
          animate={
            isHovered
              ? {
                  rotateX: -24,
                  skewX: -3,
                  y: 1.5,
                  scaleY: 0.94,
                }
              : {
                  rotateX: 0,
                  skewX: 0,
                  y: 0,
                  scaleY: 1,
                }
          }
          style={{
            transformOrigin: "bottom center",
          }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 14,
          }}
        />
      </svg>
    </div>
  );
};

export default AnimatedFolder;
