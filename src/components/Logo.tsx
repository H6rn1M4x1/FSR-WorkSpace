import React from "react";
import { motion } from "motion/react";

interface LogoProps {
  darkMode: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  spin?: boolean;
}

// Marca "Cascada": 3 cuadrados redondeados iguales, superpuestos en diagonal.
const SQUARES = [
  { x: 44, y: 44, delay: 0 },
  { x: 90, y: 90, delay: 0.12 },
  { x: 136, y: 136, delay: 0.24 },
];
const SQUARE_SIZE = 76;
const SQUARE_RX = 16;

export default function Logo({ darkMode, size = "sm", className = "", spin = false }: LogoProps) {
  // Size dimensions for 1:1 aspect ratio (scaled down as requested)
  const sizeClasses = {
    xs: "w-4 h-4",
    sm: "w-7 h-7",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  // El color de acento (elegido por el usuario en Ajustes) es el que predomina en el logo.
  const fillColor = "var(--color-primary)";

  // Re-run animation when theme or spin changes
  const animationKey = `logo-${darkMode ? "dark" : "light"}-${spin ? "spin" : "normal"}`;

  return (
    <motion.div
      key={animationKey}
      className={`relative flex items-center justify-center select-none shrink-0 ${sizeClasses[size]} ${className}`}
      initial="initial"
      animate="animate"
      whileHover={spin ? undefined : "hover"}
      whileTap={spin ? undefined : "tap"}
      variants={{
        tap: { scale: 0.92, transition: { duration: 0.15 } },
      }}
    >
      <svg viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {SQUARES.map((sq, i) => (
          <motion.rect
            key={i}
            x={sq.x}
            y={sq.y}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            rx={SQUARE_RX}
            fill={fillColor}
            style={{ originX: `${sq.x + SQUARE_SIZE / 2}px`, originY: `${sq.y + SQUARE_SIZE / 2}px` }}
            variants={{
              initial: { scale: 0.4, opacity: 0 },
              animate: spin
                ? {
                    scale: [0.75, 1, 0.75],
                    opacity: [0.35, 1, 0.35],
                    transition: {
                      duration: 1.35,
                      repeat: Infinity,
                      delay: sq.delay,
                      ease: "easeInOut",
                    },
                  }
                : {
                    scale: 1,
                    opacity: 1,
                    transition: {
                      duration: 0.45,
                      delay: sq.delay,
                      ease: [0.34, 1.56, 0.64, 1], // easeOutBack - leve "rebote" al aparecer
                    },
                  },
              hover: {
                scale: [1, 1.12, 1],
                transition: {
                  duration: 0.5,
                  delay: sq.delay * 0.6,
                  ease: "easeInOut",
                },
              },
            }}
          />
        ))}
      </svg>
    </motion.div>
  );
}
