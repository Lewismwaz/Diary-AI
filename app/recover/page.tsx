import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { AppBrand } from "@/components/branding/app-brand";
import RecoveryStart from "@/components/auth/recovery-start";

type RecoverPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function RecoverPage({
  searchParams,
}: RecoverPageProps) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const {
    status,
  } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-0 flex justify-center">
          <AppBrand
              size="lg"
              href="#"
              priority
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <RecoveryStart
            status={status}
          />
        </div>
      </div>
    </main>
  );
}