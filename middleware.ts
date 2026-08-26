import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { getLoginLandingPath, isAthleteRole, isCoachPortalRole } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  const canonicalHost = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (
    canonicalHost &&
    req.nextUrl.hostname !== canonicalHost &&
    !req.nextUrl.hostname.endsWith(".railway.internal")
  ) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = canonicalHost;
    return NextResponse.redirect(url);
  }

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isOnboardingPage = pathname === "/onboarding";
  // Must not match coach "/athletes*" — only the athlete portal "/athlete" and "/athlete/..."
  const isAthleteArea =
    pathname === "/athlete" || pathname.startsWith("/athlete/");
  const isCoachArea =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/athletes") ||
    pathname.startsWith("/pickup-players") ||
    pathname.startsWith("/training") ||
    pathname.startsWith("/courses") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/teams") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/trainer") ||
    isOnboardingPage;

  const isProtected = isCoachArea || isAthleteArea;

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    const landing = getLoginLandingPath({
      role,
      onboardingCompletedAt: isAthleteRole(role) ? new Date() : null,
    });
    // Coaches without onboarding still need /onboarding — JWT lacks that flag.
    // Send coaches to /dashboard; layout will bounce incomplete onboarding.
    const dest = isAthleteRole(role)
      ? "/athlete"
      : role === "TRAINER" || role === "PLATFORM_ADMIN"
        ? "/trainer"
        : isCoachPortalRole(role)
          ? "/dashboard"
          : landing;
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
  }

  if (isLoggedIn && isAthleteArea && isCoachPortalRole(role) && !isAthleteRole(role)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  if (isLoggedIn && isCoachArea && isAthleteRole(role)) {
    return NextResponse.redirect(new URL("/athlete", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/athletes/:path*",
    "/pickup-players/:path*",
    "/training/:path*",
    "/courses/:path*",
    "/calendar/:path*",
    "/reports/:path*",
    "/videos/:path*",
    "/settings/:path*",
    "/teams/:path*",
    "/library/:path*",
    "/trainer/:path*",
    "/onboarding",
    "/login",
    "/signup",
  ],
};
