import * as React from "react";
import { cn } from "@/lib/utils";

interface ScanlineOverlayProps {
  className?: string;
  opacity?: number;
}

function ScanlineOverlay({
  className,
  opacity = 0.04,
}: ScanlineOverlayProps) {
  return (
    <div
      className={cn("fixed inset-0 z-50 pointer-events-none", className)}
      aria-hidden="true"
    >
      {/* Static horizontal scanlines */}
      <div
        className="absolute inset-0"
        style={{
          opacity,
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />
      {/* Animated moving scanline */}
      <div
        className="absolute inset-x-0 h-[2px] animate-scanline"
        style={{
          opacity: opacity * 2,
          background:
            "linear-gradient(90deg, transparent, var(--color-primary), transparent)",
        }}
      />
    </div>
  );
}
ScanlineOverlay.displayName = "ScanlineOverlay";

export { ScanlineOverlay };
export type { ScanlineOverlayProps };
