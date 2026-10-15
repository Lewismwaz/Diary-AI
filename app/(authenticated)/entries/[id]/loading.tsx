export default function EntryLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="animate-pulse">
          <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="h-8 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />

            <div className="mt-4 h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />

            <div className="mt-8 space-y-3">
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}