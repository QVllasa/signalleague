import * as React from "react";
import { cn } from "@/lib/utils";

interface CircuitBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show animated pulse on grid intersections */
  animated?: boolean;
  /** Grid cell size in pixels */
  gridSize?: number;
}

function CircuitBackground({
  animated = false,
  gridSize = 40,
  className,
  children,
  ...props
}: CircuitBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      {/* Grid lines layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: [
            `linear-gradient(var(--color-border) 1px, transparent 1px)`,
            `linear-gradient(90deg, var(--color-border) 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />

      {/* Optional animated glow nodes at intersections */}
      {animated && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="circuit-node-glow">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Render a sparse set of glowing intersection nodes */}
          {Array.from({ length: 6 }, (_, i) => {
            const positions = [
              { x: "20%", y: "15%" },
              { x: "65%", y: "30%" },
              { x: "40%", y: "55%" },
              { x: "80%", y: "70%" },
              { x: "15%", y: "80%" },
              { x: "55%", y: "90%" },
            ];
            const pos = positions[i];
            return (
              <circle
                key={i}
                cx={pos.x}
                cy={pos.y}
                r="3"
                fill="url(#circuit-node-glow)"
                className="animate-glow-pulse"
                style={{
                  animationDelay: `${i * 0.4}s`,
                  animationDuration: `${2 + (i % 3) * 0.5}s`,
                }}
              />
            );
          })}
          {/* Connecting circuit traces */}
          <line
            x1="20%" y1="15%" x2="40%" y2="55%"
            stroke="var(--color-border)"
            strokeWidth="1"
            className="animate-glow-pulse"
            style={{ animationDelay: "0.2s" }}
          />
          <line
            x1="65%" y1="30%" x2="80%" y2="70%"
            stroke="var(--color-border)"
            strokeWidth="1"
            className="animate-glow-pulse"
            style={{ animationDelay: "0.8s" }}
          />
          <line
            x1="40%" y1="55%" x2="55%" y2="90%"
            stroke="var(--color-border)"
            strokeWidth="1"
            className="animate-glow-pulse"
            style={{ animationDelay: "1.4s" }}
          />
        </svg>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
CircuitBackground.displayName = "CircuitBackground";

export { CircuitBackground };
export type { CircuitBackgroundProps };
