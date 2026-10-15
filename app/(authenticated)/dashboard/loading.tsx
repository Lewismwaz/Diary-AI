export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-[1600px] px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="animate-pulse">
          <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-3 h-9 w-52 rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-4 h-4 w-80 max-w-full rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-10 space-y-4">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="
                    h-32 rounded-2xl
                    border border-slate-200
                    bg-white
                    dark:border-slate-800
                    dark:bg-slate-900/40
                  "
                />
              )
            )}
          </div>
        </div>
      </div>
    </main>
  );
}