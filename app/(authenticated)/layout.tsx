import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import AppHeader from "@/components/navigation/app-header";

import AppNavigation from "@/components/navigation/app-navigation";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session =
    await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <AppHeader
        firstName={
          session.user.firstName
        }
      />

      <div className="flex-1">
        {children}
      </div>

      <AppNavigation />
    </div>
  );
}