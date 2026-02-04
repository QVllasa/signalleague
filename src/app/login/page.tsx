import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SignInButtons } from "@/components/auth/sign-in-buttons";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to SignalLeague to write reviews, bookmark groups, and more.",
};

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="mx-auto max-w-sm w-full px-4 py-12">
          <div className="bg-surface-1 border border-border p-8 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-heading text-2xl tracking-wider text-foreground">
                Sign <span className="text-primary">In</span>
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                Connect with your social account
              </p>
            </div>

            <SignInButtons />

            <p className="text-xs text-muted-foreground text-center font-mono leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
