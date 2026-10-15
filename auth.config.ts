import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  providers: [],
} satisfies NextAuthConfig;