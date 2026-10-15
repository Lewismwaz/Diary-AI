import {
  Suspense,
} from "react";

import {
  redirect,
} from "next/navigation";

import { auth } from "@/auth";

import LoginForm from "@/components/auth/login-form";

import {
  AppBrand,
} from "@/components/branding/app-brand";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main
      className="
        flex min-h-dvh
        items-center justify-center
        bg-slate-50
        px-4 py-10
        text-slate-950
        dark:bg-slate-950
        dark:text-white
      "
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-0 flex justify-center">
            <AppBrand
              size="lg"
              href="#"
              priority
            />
          </div>

          <h1 className="mt-0 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Welcome back
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Sign in to continue to your private diary.
          </p>
        </div>

        <div
          className="
            rounded-2xl
            border border-slate-200
            bg-white
            p-5 shadow-xl
            dark:border-slate-800
            dark:bg-slate-950
            dark:shadow-2xl
            sm:p-7
          "
        >
          <Suspense
            fallback={
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading...
              </p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}