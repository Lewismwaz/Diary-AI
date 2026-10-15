import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { auth } from "@/auth";

import DeleteEntryDialog from "@/components/diary/delete-entry-dialog";
import AIInsights from "@/components/diary/ai-insights";

import {
  ListenButton,
} from "@/components/tts/listen-button";

import {
  diaryEntryIdSchema,
} from "@/domain/diary/diary-entry.schema";

import {
  diaryService,
} from "@/lib/diary-service";

import {
  getPrivacySettings,
} from "@/services/privacy-settings.service";

type EntryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EntryPage({
  params,
}: EntryPageProps) {
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

  const privacySettings =
    await getPrivacySettings(
      session.user.id
    );

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
        <article className="mt-0">
          <header>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {entry.entryDate.toLocaleDateString(
                undefined,
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {entry.title}
            </h1>

            <div className="mt-6 flex flex-wrap gap-3">
              <ListenButton
                ownerId={`entry:${entry.id}`}
                title={entry.title}
                text={entry.cleanedContent}
                date={entry.entryDate.toISOString()}
                source={entry.source}
              />

              <Link
                href={`/entries/${entry.id}/edit`}
                className="
                  inline-flex items-center
                  justify-center rounded-lg
                  bg-sky-600 px-4 py-2
                  text-sm font-semibold
                  text-white transition
                  hover:bg-sky-500
                "
              >
                Edit
              </Link>

              <DeleteEntryDialog
                entryId={entry.id}
              />
            </div>
          </header>

          <section
            className="
              mt-8 rounded-2xl
              border border-slate-200
              bg-white p-5
              shadow-sm
              dark:border-slate-800
              dark:bg-slate-950
              sm:p-7
            "
          >
            <p className="whitespace-pre-wrap leading-7 text-slate-700 dark:text-slate-200">
              {entry.cleanedContent}
            </p>
          </section>

          <section className="mt-6">
            <AIInsights
              entryId={entry.id}
              allowAIProcessing={
                privacySettings
                  .allowAIProcessing
              }
            />
          </section>

          {entry.originalTranscript && (
            <section
              className="
                mt-6 rounded-2xl
                border border-slate-200
                bg-white p-5
                shadow-sm
                dark:border-slate-800
                dark:bg-slate-950
                sm:p-7
              "
            >
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                Original transcript
              </h2>

              <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-600 dark:text-slate-400">
                {entry.originalTranscript}
              </p>
            </section>
          )}
        </article>
      </div>
    </main>
  );
}