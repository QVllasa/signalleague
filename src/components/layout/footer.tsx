import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg tracking-wider text-primary">
                SIGNAL
              </span>
              <span className="font-heading text-lg tracking-wider text-secondary">
                LEAGUE
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Community-driven tier rankings for crypto signal groups. Transparent. Accountable. Unbiased.
            </p>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="font-heading text-xs tracking-widest text-foreground">
              Platform
            </h3>
            <nav className="flex flex-col gap-2">
              <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Leaderboard
              </Link>
              <Link href="/groups" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Browse Groups
              </Link>
              <Link href="/groups/submit" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Submit a Group
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-heading text-xs tracking-widest text-foreground">
              Resources
            </h3>
            <nav className="flex flex-col gap-2">
              <Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                How It Works
              </Link>
              <Link href="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                FAQ
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-heading text-xs tracking-widest text-foreground">
              Legal
            </h3>
            <nav className="flex flex-col gap-2">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SignalLeague. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/signalleague"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Twitter/X
            </a>
            <a
              href="https://discord.gg/signalleague"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Discord
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
