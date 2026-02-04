"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitGroup } from "@/actions/groups";

type SubmitState = {
  error?: string;
  success?: boolean;
  slug?: string;
} | null;

function submitAction(_prev: SubmitState, formData: FormData) {
  return submitGroup(formData) as Promise<SubmitState>;
}

export default function SubmitGroupPage() {
  const router = useRouter();
  const [state, action, isPending] = useActionState(submitAction, null);

  useEffect(() => {
    if (state?.success && state.slug) {
      router.push(`/groups/${state.slug}`);
    }
  }, [state, router]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-0">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
          <div className="space-y-2 mb-8">
            <h1 className="font-heading text-2xl sm:text-3xl tracking-wider text-foreground">
              Submit a <span className="text-primary">Signal Group</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Add a crypto signal group to SignalLeague. Submissions are reviewed by our team before going live.
            </p>
          </div>

          <form action={action} className="space-y-6">
            {state?.error && (
              <div className="bg-destructive/10 border border-destructive/30 p-4 text-destructive text-sm font-mono">
                {state.error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Group Name *
              </label>
              <Input name="name" required placeholder="e.g. CryptoAlpha Signals" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Description *
              </label>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Describe what this signal group offers..."
                className="flex w-full bg-surface-2 border border-border px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:[box-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]"
              />
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Platform *
              </label>
              <select
                name="platform"
                required
                className="flex h-10 w-full bg-surface-2 border border-border px-3 py-2 font-mono text-sm text-foreground transition-all duration-200 focus:outline-none focus:border-primary"
              >
                <option value="">Select platform</option>
                <option value="twitter">Twitter/X</option>
                <option value="discord">Discord</option>
                <option value="telegram">Telegram</option>
              </select>
            </div>

            {/* Platform Handle */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Platform Handle *
              </label>
              <Input
                name="platformHandle"
                required
                placeholder="e.g. @CryptoAlpha"
              />
            </div>

            {/* Platform URL */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Platform URL *
              </label>
              <Input
                name="platformUrl"
                type="url"
                required
                placeholder="https://..."
              />
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Pricing Model *
              </label>
              <select
                name="pricingModel"
                required
                className="flex h-10 w-full bg-surface-2 border border-border px-3 py-2 font-mono text-sm text-foreground transition-all duration-200 focus:outline-none focus:border-primary"
              >
                <option value="">Select pricing</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="freemium">Freemium</option>
              </select>
            </div>

            {/* Price (optional) */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Price (USD)
              </label>
              <Input
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 49.99"
              />
            </div>

            {/* Estimated Members */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Estimated Members
              </label>
              <Input
                name="estimatedMembers"
                type="number"
                min="0"
                placeholder="e.g. 5000"
              />
            </div>

            <Button
              type="submit"
              variant="glitch"
              size="lg"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Submitting..." : "Submit Group for Review"}
            </Button>

            <p className="text-xs text-muted-foreground text-center font-mono">
              Submissions are reviewed within 24-48 hours.
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
