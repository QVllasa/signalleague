import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

const adminNav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface-0/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-heading text-sm tracking-wider text-primary">
              SIGNAL
            </span>
            <span className="font-heading text-sm tracking-wider text-secondary">
              LEAGUE
            </span>
            <span className="ml-2 px-2 py-0.5 bg-destructive/10 border border-destructive/30 text-destructive text-[10px] font-heading tracking-wider">
              ADMIN
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-primary font-mono transition-colors"
          >
            Back to Site
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <nav className="lg:w-48 flex lg:flex-col gap-1 overflow-x-auto">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 font-mono text-xs text-muted-foreground hover:text-primary hover:bg-surface-1 transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
