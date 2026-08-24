import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isOnboardingPage = pathname === "/onboarding";
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/athletes") ||
    pathname.startsWith("/pickup-players") ||
    pathname.startsWith("/training") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/settings") ||
    isOnboardingPage;

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/athletes/:path*",
    "/pickup-players/:path*",
    "/training/:path*",
    "/calendar/:path*",
    "/reports/:path*",
    "/videos/:path*",
    "/settings/:path*",
    "/onboarding",
    "/login",
    "/signup",
  ],
};
