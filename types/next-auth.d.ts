
import {
  DefaultSession,
  DefaultUser,
} from "next-auth";

import {
  DefaultJWT,
} from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    firstName: string;
    lastName: string;
    sessionVersion: number;
  }

  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string;
    firstName?: string;
    lastName?: string;
    sessionVersion?: number;
    invalidated?: boolean;
  }
}
