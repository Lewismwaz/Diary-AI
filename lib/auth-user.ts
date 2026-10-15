import { auth } from "@/auth";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth();

  return session?.user?.id ?? null;
}

export async function requireAuthenticatedUserId(): Promise<string> {
  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    throw new Error(
      "Authentication required."
    );
  }

  return userId;
}