import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">

      <div className="max-w-md text-center">

        <p className="text-sm font-medium text-sky-400">
          404
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          Entry not found
        </h1>

        <p className="mt-4 text-slate-400">
          This diary entry does not exist,
          has been deleted,
          or you do not have access to it.
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-500"
        >
          Back to journal
        </Link>

      </div>

    </main>
  );
}