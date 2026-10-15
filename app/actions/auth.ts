"use server";

import {
  AuthError,
} from "next-auth";

import {
  signIn,
  signOut,
} from "@/auth";

export type LoginState = {
  error?: string;
};


export async function login(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  /*
   * Only permit known internal destinations.
   * Never accept arbitrary redirect URLs.
   */

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });

    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            error: "Invalid email or password.",
          };

        default:
          return {
            error:
              "Unable to sign in. Please try again.",
          };
      }
    }

    /*
     * Auth.js redirects by throwing internally.
     * Preserve that behavior.
     */
    throw error;
  }
}


export async function logout() {
  await signOut({
    redirectTo:
      "/login",
  });
}