
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { loginSchema } from "@/domain/auth/auth.schema";
import { prisma } from "@/lib/prisma";

export const {
  auth,
  handlers,
  signIn,
  signOut,
  unstable_update,
} = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const validation =
          loginSchema.safeParse(credentials);

        if (!validation.success) {
          return null;
        }

        const { email, password } =
          validation.data;

        const user =
          await prisma.user.findUnique({
            where: { email },
          });

        if (!user) {
          return null;
        }

        const passwordsMatch =
          await bcrypt.compare(
            password,
            user.passwordHash
          );

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name:
            `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          sessionVersion:
            user.sessionVersion,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({
      token,
      user,
      trigger,
    }) {
      /*
       * Initial authentication:
       * save the session version that existed
       * when the user successfully signed in.
       */
      if (user?.id) {
        token.userId = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.sessionVersion =
          user.sessionVersion;
        token.invalidated = false;
      }

      /*
       * Reject JWTs that do not contain
       * the required session information.
       */
      if (
        typeof token.userId !== "string" ||
        typeof token.sessionVersion !==
          "number" ||
        token.invalidated === true
      ) {
        token.invalidated = true;
        return token;
      }

      /*
       * Check the current database version.
       *
       * A password reset will increment
       * User.sessionVersion, invalidating
       * tokens issued before that change.
       */
      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: token.userId,
          },
          select: {
            email: true,
            firstName: true,
            lastName: true,
            sessionVersion: true,
          },
        });

      if (
        !currentUser ||
        currentUser.sessionVersion !==
          token.sessionVersion
      ) {
        token.invalidated = true;
        return token;
      }

      /*
       * Preserve the existing profile
       * refresh functionality.
       */
      if (trigger === "update") {
        token.email = currentUser.email;
        token.firstName =
          currentUser.firstName;
        token.lastName =
          currentUser.lastName;
        token.name =
          `${currentUser.firstName} ${currentUser.lastName}`;
      }

      return token;
    },

    async session({
      session,
      token,
    }) {
      /*
       * Do not expose authenticated user
       * information from an invalidated JWT.
       */
      if (
        token.invalidated === true ||
        typeof token.userId !== "string" ||
        typeof token.sessionVersion !==
          "number"
      ) {
        return {
          ...session,
          user: undefined,
        };
      }

      if (!session.user) {
        return session;
      }

      if (
        typeof token.email === "string"
      ) {
        session.user.email = token.email;
      }

      if (
        typeof token.name === "string"
      ) {
        session.user.name = token.name;
      }

      session.user.id = token.userId;

      if (
        typeof token.firstName === "string"
      ) {
        session.user.firstName =
          token.firstName;
      }

      if (
        typeof token.lastName === "string"
      ) {
        session.user.lastName =
          token.lastName;
      }

      return session;
    },
  },
});
