import * as React from "react";
import { cn } from "@/lib/utils";

type GlitchTextElement = "h1" | "h2" | "h3" | "p";

interface GlitchTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: GlitchTextElement;
  enableHoverGlitch?: boolean;
}

const GlitchText = React.forwardRef<HTMLElement, GlitchTextProps>(
  ({ as: Tag = "h1", className, enableHoverGlitch = true, ...props }, ref) => {
    return (
      <Tag
        ref={ref as React.Ref<HTMLHeadingElement & HTMLParagraphElement>}
        className={cn(
          "font-heading uppercase tracking-wider",
          "chromatic",
          enableHoverGlitch && "hover:animate-glitch",
          "transition-all duration-200",
          className
        )}
        {...props}
      />
    );
  }
);
GlitchText.displayName = "GlitchText";

export { GlitchText };
export type { GlitchTextProps, GlitchTextElement };
