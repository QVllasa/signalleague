import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-mono text-sm select-none pointer-events-none">
          &gt;
        </span>
        <input
          type={type}
          className={cn(
            "flex h-10 w-full bg-surface-2 border border-border",
            "pl-7 pr-3 py-2",
            "font-mono text-sm text-foreground placeholder:text-muted-foreground",
            "transition-all duration-200",
            "focus:outline-none focus:border-primary focus:[box-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary)_30%,transparent),inset_0_0_4px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "file:border-0 file:bg-transparent file:text-sm file:font-mono file:text-primary",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
