"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

const providers = [
  {
    id: "twitter",
    label: "Twitter/X",
    color: "#1DA1F2",
    icon: "𝕏",
  },
  {
    id: "discord",
    label: "Discord",
    color: "#5865F2",
    icon: "D",
  },
  {
    id: "google",
    label: "Google",
    color: "#4285F4",
    icon: "G",
  },
];

export function SignInButtons() {
  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          onClick={() => signIn(provider.id, { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-3 h-11 border border-border bg-surface-2 font-mono text-sm text-foreground hover:border-primary/30 hover:text-primary transition-all duration-200"
        >
          <span
            className="font-heading text-base"
            style={{ color: provider.color }}
          >
            {provider.icon}
          </span>
          Continue with {provider.label}
        </button>
      ))}
    </div>
  );
}
