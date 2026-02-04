import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WaitlistForm } from "@/components/waitlist-form";
import { GlitchText } from "@/components/custom/glitch-text";
import { CircuitBackground } from "@/components/custom/circuit-background";
import { TierBadge } from "@/components/custom/tier-badge";
import { ScanlineOverlay } from "@/components/custom/scanline-overlay";
import type { Tier } from "@/types";

// ─── Hero Section ───────────────────────────────────────────────

function HeroSection() {
  return (
    <CircuitBackground
      animated
      gridSize={60}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
    >
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-0/50 via-transparent to-surface-0 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-secondary/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-surface-2/80 border border-border px-4 py-1.5 font-mono text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 bg-primary animate-glow-pulse" />
          Coming Soon &mdash; Join the Waitlist
        </div>

        {/* Heading */}
        <GlitchText
          as="h1"
          className="text-4xl sm:text-5xl md:text-7xl leading-tight text-foreground"
        >
          The <span className="text-primary text-glow-primary">Trustpilot</span>{" "}
          for Trading Signals
        </GlitchText>

        {/* Subhead */}
        <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed font-mono">
          Rate, rank, and review crypto signal groups.
          <br className="hidden sm:block" />
          Community-driven tier rankings. No paid placements. No BS.
        </p>

        {/* Waitlist Form */}
        <div id="waitlist" className="flex justify-center pt-4">
          <Suspense fallback={
            <div className="h-10 w-full max-w-md bg-surface-2 animate-pulse" />
          }>
            <WaitlistForm />
          </Suspense>
        </div>

        {/* Social proof */}
        <p className="text-xs text-muted-foreground font-mono">
          Free. Community-first. Launching soon.
        </p>
      </div>
    </CircuitBackground>
  );
}

// ─── Features Section ───────────────────────────────────────────

const features = [
  {
    icon: "S",
    iconColor: "text-tier-s",
    title: "Tier Rankings",
    description:
      "Every signal group gets a transparent S-F tier ranking based on our hybrid algorithm — reviews, consistency, and community votes.",
  },
  {
    icon: ">_",
    iconColor: "text-primary",
    title: "Honest Reviews",
    description:
      "5-category rating system covering signal quality, risk management, value, community support, and transparency.",
  },
  {
    icon: "#",
    iconColor: "text-tertiary",
    title: "Leaderboard",
    description:
      "Live leaderboard with instant search and filters. Find the best signal groups by platform, asset class, and pricing.",
  },
  {
    icon: "!",
    iconColor: "text-secondary",
    title: "Scam Protection",
    description:
      "Community-driven reporting and moderation. Bad actors get flagged, reviewed, and removed.",
  },
  {
    icon: "@",
    iconColor: "text-primary",
    title: "Multi-Platform",
    description:
      "Covering signal groups across Twitter/X, Discord, and Telegram. All platforms, one leaderboard.",
  },
  {
    icon: "%",
    iconColor: "text-tertiary",
    title: "100% Free",
    description:
      "No premium tiers. No paid rankings. No gatekeeping. SignalLeague is free and community-first.",
  },
];

function FeaturesSection() {
  return (
    <section className="relative border-t border-border bg-surface-0 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl tracking-wider text-foreground">
            How <span className="text-primary">SignalLeague</span> Works
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground font-mono text-sm">
            A community-driven platform that brings transparency and
            accountability to the crypto signal industry.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-surface-1 border border-border p-6 transition-all duration-300 hover:border-primary/30 hover:[box-shadow:0_0_20px_color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
            >
              <div
                className={`font-heading text-2xl ${feature.iconColor} mb-4 transition-transform duration-200 group-hover:scale-110 inline-block`}
              >
                {feature.icon}
              </div>
              <h3 className="font-heading text-sm tracking-wider text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Tier System Section ────────────────────────────────────────

const tiers: { tier: Tier; label: string; desc: string }[] = [
  { tier: "S", label: "Elite", desc: "Top-performing groups with exceptional track records" },
  { tier: "A", label: "Excellent", desc: "Consistently strong performance and community" },
  { tier: "B", label: "Good", desc: "Solid groups with room for improvement" },
  { tier: "C", label: "Average", desc: "Mixed results, proceed with caution" },
  { tier: "D", label: "Below Avg", desc: "Significant issues reported by reviewers" },
  { tier: "F", label: "Poor", desc: "Avoid — major red flags and negative reviews" },
];

function TierSection() {
  return (
    <section className="relative border-t border-border bg-surface-1 py-24 overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[300px] h-[300px] bg-tier-s/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[300px] h-[300px] bg-tier-f/5 blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl tracking-wider text-foreground">
            <span className="text-primary">Tier</span> Ranking System
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground font-mono text-sm">
            Every signal group earns a tier from S to F. Rankings are calculated using a
            hybrid algorithm — no paid placements, ever.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {tiers.map(({ tier, label, desc }) => (
            <div
              key={tier}
              className="group flex flex-col items-center text-center p-4 bg-surface-2 border border-border transition-all duration-300 hover:border-primary/20"
            >
              <TierBadge tier={tier} size="lg" />
              <h3 className="font-heading text-xs tracking-wider text-foreground mt-3 mb-1">
                {label}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* Algorithm breakdown */}
        <div className="mt-16 bg-surface-2 border border-border p-8">
          <h3 className="font-heading text-sm tracking-wider text-foreground mb-6 text-center">
            Algorithm Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            {[
              { label: "Reviews", pct: "40%", color: "text-primary" },
              { label: "Volume", pct: "20%", color: "text-tertiary" },
              { label: "Consistency", pct: "15%", color: "text-secondary" },
              { label: "Activity", pct: "15%", color: "text-tier-s" },
              { label: "Community", pct: "10%", color: "text-tier-b" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className={`font-heading text-2xl ${item.color}`}>
                  {item.pct}
                </p>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works Section ───────────────────────────────────────

const steps = [
  {
    step: "01",
    title: "Browse Groups",
    description: "Explore crypto signal groups ranked by community reviews and our hybrid algorithm.",
  },
  {
    step: "02",
    title: "Read Reviews",
    description: "See detailed 5-category ratings from real members — signal quality, risk management, value, and more.",
  },
  {
    step: "03",
    title: "Write a Review",
    description: "Share your experience with a signal group. Rate across 5 categories, add pros and cons.",
  },
  {
    step: "04",
    title: "Shape Rankings",
    description: "Your reviews directly influence tier rankings. Help the community separate signal from noise.",
  },
];

function HowItWorksSection() {
  return (
    <section className="relative border-t border-border bg-surface-0 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="font-heading text-3xl sm:text-4xl tracking-wider text-foreground">
            Get Started in{" "}
            <span className="text-tertiary">4 Steps</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item) => (
            <div
              key={item.step}
              className="relative bg-surface-1 border border-border p-6 group hover:border-tertiary/30 transition-all duration-300"
            >
              <span className="font-heading text-4xl text-surface-3 group-hover:text-tertiary/20 transition-colors">
                {item.step}
              </span>
              <h3 className="font-heading text-sm tracking-wider text-foreground mt-4 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="relative border-t border-border bg-surface-1 py-24 overflow-hidden">
      <div className="absolute inset-0 circuit-bg opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 blur-[150px] pointer-events-none" />

      <div className="relative mx-auto max-w-3xl px-4 text-center space-y-8">
        <h2 className="font-heading text-3xl sm:text-4xl tracking-wider text-foreground">
          Ready to Find{" "}
          <span className="text-primary text-glow-primary">Real</span> Signals?
        </h2>
        <p className="text-muted-foreground font-mono text-sm max-w-xl mx-auto">
          Join the waitlist to get early access. Be part of the community
          that holds signal groups accountable.
        </p>

        <div className="flex justify-center">
          <Suspense fallback={
            <div className="h-10 w-full max-w-md bg-surface-2 animate-pulse" />
          }>
            <WaitlistForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <ScanlineOverlay opacity={0.03} />
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <TierSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
