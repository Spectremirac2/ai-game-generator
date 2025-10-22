import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/dashboard", "/settings"];

export default auth(async (req) => {
  const isLoggedIn = Boolean(req.auth?.user);
  const { pathname } = req.nextUrl;

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtectedRoute && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.url));
  }

  if (pathname.startsWith("/auth") && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/auth/:path*"],
};

