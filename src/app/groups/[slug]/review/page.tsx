"use client";

import { useActionState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/custom/star-rating";
import { submitReview } from "@/actions/reviews";
import { REVIEW_CATEGORIES } from "@/types";

type ReviewState = {
  error?: string;
  success?: boolean;
} | null;

function reviewAction(_prev: ReviewState, formData: FormData) {
  return submitReview(formData) as Promise<ReviewState>;
}

export default function WriteReviewPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const [state, action, isPending] = useActionState(reviewAction, null);
  const [ratings, setRatings] = useState({
    overallRating: 0,
    signalQuality: 0,
    riskManagement: 0,
    valueForMoney: 0,
    communitySupport: 0,
    transparency: 0,
  });

  useEffect(() => {
    if (state?.success) {
      router.push(`/groups/${slug}`);
    }
  }, [state, router, slug]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-0">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
          <div className="space-y-2 mb-8">
            <h1 className="font-heading text-2xl sm:text-3xl tracking-wider text-foreground">
              Write a <span className="text-primary">Review</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Share your honest experience. Rate across 5 categories.
            </p>
          </div>

          <form action={action} className="space-y-8">
            {/* Hidden group ID — will be set via API call in a real scenario */}
            <input type="hidden" name="groupId" value="" />

            {state?.error && (
              <div className="bg-destructive/10 border border-destructive/30 p-4 text-destructive text-sm font-mono">
                {state.error}
              </div>
            )}

            {/* Overall Rating */}
            <div className="bg-surface-1 border border-border p-6 space-y-3">
              <label className="font-heading text-sm tracking-wider text-foreground">
                Overall Rating *
              </label>
              <StarRating
                value={ratings.overallRating}
                onChange={(v) => setRatings((r) => ({ ...r, overallRating: v }))}
                size="lg"
              />
              <input type="hidden" name="overallRating" value={ratings.overallRating} />
            </div>

            {/* Category Ratings */}
            <div className="bg-surface-1 border border-border p-6 space-y-6">
              <h2 className="font-heading text-sm tracking-wider text-foreground">
                Category Ratings *
              </h2>
              {(
                Object.entries(REVIEW_CATEGORIES) as [
                  keyof typeof ratings,
                  { label: string; description: string },
                ][]
              ).map(([key, cat]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-foreground font-mono">
                        {cat.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {cat.description}
                      </p>
                    </div>
                    <StarRating
                      value={ratings[key]}
                      onChange={(v) =>
                        setRatings((r) => ({ ...r, [key]: v }))
                      }
                      size="sm"
                    />
                  </div>
                  <input type="hidden" name={key} value={ratings[key]} />
                </div>
              ))}
            </div>

            {/* Membership Duration */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                How long have you been a member?
              </label>
              <select
                name="membershipDuration"
                className="flex h-10 w-full bg-surface-2 border border-border px-3 py-2 font-mono text-sm text-foreground transition-all duration-200 focus:outline-none focus:border-primary"
              >
                <option value="">Select duration</option>
                <option value="less_than_1_month">Less than 1 month</option>
                <option value="1_to_3_months">1-3 months</option>
                <option value="3_to_6_months">3-6 months</option>
                <option value="6_to_12_months">6-12 months</option>
                <option value="over_1_year">Over 1 year</option>
              </select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Review Title
              </label>
              <Input name="title" placeholder="Summarize your experience" />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <label className="font-heading text-xs tracking-wider text-foreground">
                Your Review *
              </label>
              <textarea
                name="body"
                required
                rows={5}
                placeholder="Describe your experience in detail..."
                className="flex w-full bg-surface-2 border border-border px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:border-primary focus:[box-shadow:0_0_8px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]"
              />
            </div>

            {/* Pros & Cons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-heading text-xs tracking-wider text-primary">
                  + Pros
                </label>
                <Input
                  name="pros"
                  placeholder="Comma-separated pros"
                />
                <p className="text-xs text-muted-foreground">
                  Separate with commas
                </p>
              </div>
              <div className="space-y-2">
                <label className="font-heading text-xs tracking-wider text-destructive">
                  - Cons
                </label>
                <Input
                  name="cons"
                  placeholder="Comma-separated cons"
                />
                <p className="text-xs text-muted-foreground">
                  Separate with commas
                </p>
              </div>
            </div>

            <Button
              type="submit"
              variant="glitch"
              size="lg"
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
