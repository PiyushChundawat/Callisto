import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const nextAuthResult = NextAuth(authConfig);
export const proxy = nextAuthResult.auth;

export const config = {
  matcher: ["/portfolio/:path*", "/watchlist/:path*", "/profile/:path*"],
};