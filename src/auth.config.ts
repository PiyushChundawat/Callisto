import { type NextAuthConfig } from "next-auth";

const protectedPrefixes = ["/portfolio", "/watchlist", "/profile"];

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  providers: [], // filled in by auth.ts, which runs on Node.js
  callbacks: {
    jwt: async function (params) {
      if (params.user) {
        params.token.userId = params.user.id;
      }
      return params.token;
    },
    session: async function (params) {
      params.session.user.id = params.token.userId as string;
      return params.session;
    },
    authorized: async function (params) {
      const isLoggedIn = params.auth?.user != null;
      const path = params.request.nextUrl.pathname;
      const isProtected = protectedPrefixes.some(function (prefix) {
        return path.startsWith(prefix);
      });

      if (isProtected && !isLoggedIn) {
        return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
};