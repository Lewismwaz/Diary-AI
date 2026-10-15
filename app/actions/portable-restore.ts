"use server";

import { cookies } from "next/headers";
import { signIn } from "@/auth";
import {
  getPortableRestoreSession,
  PORTABLE_RESTORE_COOKIE,
} from "@/lib/auth/portable-restore-session";
import {
  completePortableRestore,
  PortableRestoreFailure,
} from "@/services/portable-final-restore.service";

export type PortableRestoreState = { error: string };

export async function finishPortableRestore(
  _previous: PortableRestoreState,
  formData: FormData
): Promise<PortableRestoreState> {
  const passphrase = formData.get("passphrase");
  const password = formData.get("accountPassword");

  if (
    typeof passphrase !== "string" ||
    passphrase.length < 12 ||
    passphrase.length > 1024 ||
    typeof password !== "string" ||
    password.length < 1 ||
    password.length > 1024
  ) {
    return { error: "Enter your backup passphrase and account password." };
  }

  const jar = await cookies();
  const token = jar.get(PORTABLE_RESTORE_COOKIE)?.value;
  const session = token ? await getPortableRestoreSession(token) : null;

  if (!session) {
    return {
      error: "Recovery session expired or was completed. If your account was restored, sign in normally; otherwise restart recovery.",
    };
  }

  try {
    await completePortableRestore(session, passphrase, password);
  } catch (error) {
    if (error instanceof PortableRestoreFailure) {
      return { error: error.message };
    }
    console.error(
      "Portable restore failed:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return { error: "Restoration failed. Check Prisma Studio before retrying." };
  }

  // The database transaction has committed at this point. If sign-in fails,
  // the restored account still exists and the user can sign in normally.
  jar.delete(PORTABLE_RESTORE_COOKIE);
  await signIn("credentials", {
    email: session.recoveryEmail!,
    password,
    redirectTo: "/dashboard",
  });

  return { error: "" };
}
