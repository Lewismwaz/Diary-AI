import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { NewEntryForm } from "@/components/diary/new-entry-form";

import {
  getPrivacySettings,
} from "@/services/privacy-settings.service";

export default async function NewEntryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const privacySettings =
    await getPrivacySettings(
      session.user.id
    );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mt-0">
        <h1 className="text-3xl font-bold tracking-tight">
          New diary entry
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Write your thoughts or record
          them using your microphone.
          Voice recordings can be
          transcribed into editable diary
          text before you save.
        </p>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-950">
        <NewEntryForm
          allowVoiceTranscription={
            privacySettings
              .allowVoiceTranscription
          }
          allowAIProcessing={
            privacySettings
              .allowAIProcessing
          }
        />
      </section>
    </main>
  );
}