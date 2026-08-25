import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/lib/generated/prisma/client";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if (user.role) {
          token.role = user.role as UserRole;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as UserRole) ?? "COACH";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
