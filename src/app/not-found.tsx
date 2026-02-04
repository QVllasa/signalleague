import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { GlitchText } from "@/components/custom/glitch-text";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <GlitchText as="h1" className="text-6xl sm:text-8xl text-primary text-glow-primary">
            404
          </GlitchText>
          <p className="text-muted-foreground font-mono text-sm">
            Signal not found. This page doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
