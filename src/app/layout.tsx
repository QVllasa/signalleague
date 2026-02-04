import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron } from "next/font/google";
import "@/app/globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SignalLeague — The Trustpilot for Trading Signals",
    template: "%s | SignalLeague",
  },
  description:
    "Rate, rank and review trading signal groups. Community-driven tier rankings for Crypto signal communities on Twitter/X, Discord and Telegram.",
  keywords: [
    "trading signals",
    "signal groups",
    "crypto signals",
    "signal review",
    "trading community",
    "signal ranking",
    "crypto trading",
    "signal tier list",
  ],
  openGraph: {
    title: "SignalLeague — The Trustpilot for Trading Signals",
    description:
      "Rate, rank and review trading signal groups. Community-driven tier rankings for Crypto signal communities.",
    type: "website",
    locale: "en_US",
    siteName: "SignalLeague",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignalLeague — The Trustpilot for Trading Signals",
    description:
      "Rate, rank and review trading signal groups. Community-driven tier rankings for Crypto signal communities.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${orbitron.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background font-body text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
