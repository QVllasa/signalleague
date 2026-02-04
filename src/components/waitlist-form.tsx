"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { joinWaitlist } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WaitlistState = {
  error?: string;
  success?: boolean;
  position?: number | null;
  referralCode?: string;
} | null;

function waitlistAction(_prev: WaitlistState, formData: FormData) {
  return joinWaitlist(formData) as Promise<WaitlistState>;
}

export function WaitlistForm() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [state, action, isPending] = useActionState(waitlistAction, null);

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-4 py-2 text-primary font-mono text-sm">
          <span className="inline-block h-2 w-2 bg-primary animate-glow-pulse" />
          You&apos;re in
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Your waitlist position</p>
          <p className="text-5xl font-heading text-primary text-glow-primary">
            #{state.position}
          </p>
        </div>
        <div className="bg-surface-2 border border-border p-4 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Referral Code
          </p>
          <p className="text-lg font-heading text-primary tracking-widest">
            {state.referralCode}
          </p>
          <p className="text-xs text-muted-foreground">
            Share to move up the waitlist
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      {ref && <input type="hidden" name="ref" value={ref} />}
      <div className="flex-1">
        <Input
          name="email"
          type="email"
          placeholder="your@email.com"
          required
          disabled={isPending}
        />
      </div>
      <Button type="submit" variant="glitch" size="lg" disabled={isPending}>
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" style={{ borderRadius: "50%" }} />
            Joining...
          </span>
        ) : (
          "Join Waitlist"
        )}
      </Button>
      {state?.error && (
        <p className="text-destructive text-sm font-mono sm:col-span-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
