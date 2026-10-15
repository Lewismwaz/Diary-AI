import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { auth } from "@/auth";

import EditEntryForm from "@/components/diary/edit-entry-form";

import {
  diaryEntryIdSchema,
} from "@/domain/diary/diary-entry.schema";

import {
  diaryService,
} from "@/lib/diary-service";

type EditEntryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditEntryPage({
  params,
}: EditEntryPageProps) {
  const { id } = await params;

  const idValidation =
    diaryEntryIdSchema.safeParse(id);

  if (!idValidation.success) {
    notFound();
  }

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const entry =
    await diaryService.getEntry(
      session.user.id,
      idValidation.data
    );

  if (!entry) {
    notFound();
  }

  return (
    <main
      className="
        min-h-screen
        bg-slate-50
        text-slate-950
        dark:bg-slate-950
        dark:text-white
      "
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-12">
        <Link
          href={`/entries/${entry.id}`}
          className="
            text-sm font-medium
            text-sky-600
            transition
            hover:text-sky-700
            dark:text-sky-400
            dark:hover:text-sky-300
          "
        >
          ← Cancel
        </Link>

        <header className="mt-2">
          <h1 className="mt-0 text-3xl font-bold text-slate-950 dark:text-white">
            Edit entry
          </h1>

          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Make changes to your diary entry.
          </p>
        </header>

        <section
          className="
            mt-8 rounded-2xl
            border border-slate-200
            bg-white p-5
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-950
            sm:p-6
          "
        >
          <EditEntryForm
            entry={{
              id: entry.id,
              title: entry.title,
              cleanedContent:
                entry.cleanedContent,
            }}
          />
        </section>
      </div>
    </main>
  );
}