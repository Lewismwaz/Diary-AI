export default function EditEntryLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="animate-pulse">
          <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-8 h-9 w-40 rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-8 space-y-6">
            <div className="h-12 rounded-lg bg-slate-200 dark:bg-slate-900" />

            <div className="h-80 rounded-lg bg-slate-200 dark:bg-slate-900" />

            <div className="h-11 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </main>
  );
}