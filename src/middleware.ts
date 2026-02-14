import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const publicRoutes = ["/", "/groups", "/leaderboard", "/login", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // These sub-paths under /groups require auth even though /groups is public
  const needsAuth =
    pathname === "/groups/submit" || pathname.endsWith("/review");

  // Allow public routes (but exclude auth-required sub-paths)
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute && !needsAuth) {
    return NextResponse.next();
  }

  // Protect /dashboard, /admin, and auth-required routes
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    needsAuth;

  if (isProtectedRoute && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin role check — authenticated non-admins get redirected home
  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
