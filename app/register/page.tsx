import {
  redirect,
} from "next/navigation";

import { auth } from "@/auth";

import RegisterForm from "@/components/auth/register-form";

import {
  AppBrand,
} from "@/components/branding/app-brand";

export default async function RegisterPage() {
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
        <div className="mb-4 text-center">
          <div className="mb-0 flex justify-center">
            <AppBrand
              size="lg"
              href="#"
              priority
            />
          </div>

          <h1 className="mt-0 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Create your account
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Start building your private digital journal.
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
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}