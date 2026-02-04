import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap",
    "font-heading text-sm uppercase tracking-wider",
    "chamfer-sm transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "hover:glow-primary hover:brightness-110",
          "active:brightness-90",
        ],
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:glow-secondary hover:brightness-110",
          "active:brightness-90",
        ],
        outline: [
          "border border-primary bg-transparent text-primary",
          "hover:bg-primary/10 hover:glow-primary",
          "active:bg-primary/20",
        ],
        ghost: [
          "bg-transparent text-foreground",
          "hover:bg-surface-3 hover:text-primary",
          "active:bg-surface-4",
        ],
        glitch: [
          "bg-primary text-primary-foreground",
          "hover:animate-glitch hover:glow-primary hover:brightness-110",
          "active:brightness-90",
        ],
        destructive: [
          "bg-destructive text-destructive-foreground",
          "hover:glow-destructive hover:brightness-110",
          "active:brightness-90",
        ],
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-5 text-sm",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
