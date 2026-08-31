import React from "react";
import { motion } from "motion/react";

interface LogoProps {
  darkMode: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  spin?: boolean;
}

export default function Logo({ darkMode, size = "sm", className = "", spin = false }: LogoProps) {
  // Size dimensions for 1:1 aspect ratio (scaled down as requested)
  const sizeClasses = {
    xs: "w-4 h-4",
    sm: "w-7 h-7",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  const starColor = "var(--color-primary)";

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
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Modern 4-pointed Star (Destello) based on user's shared image, scaled to fill space */}
        <motion.path
          d="M 50,8 Q 50,50 92,50 Q 50,50 50,92 Q 50,50 8,50 Q 50,50 50,8 Z"
          fill={starColor}
          stroke={starColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          variants={{
            initial: {
              scale: 1,
              rotate: 0,
              opacity: spin ? 1 : 0,
            },
            animate: spin
              ? {
                  scale: 1,
                  rotate: [0, 180, 360],
                  opacity: 1,
                  transition: {
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }
              : {
                  scale: 1,
                  rotate: [0, 180, 360],
                  opacity: [0, 1, 0, 1],
                  transition: {
                    duration: 1.6,
                    times: [0, 0.35, 0.7, 1],
                    ease: "easeInOut",
                  },
                },
            hover: {
              scale: 1,
              rotate: [0, 180, 360],
              opacity: [1, 0, 1],
              transition: {
                duration: 1.0,
                times: [0, 0.5, 1],
                ease: "easeInOut",
              },
            },
            tap: {
              scale: 0.95,
              opacity: 0.8,
              transition: { duration: 0.15 },
            },
          }}
          style={{ originX: "50px", originY: "50px" }}
        />
      </svg>
    </motion.div>
  );
}
