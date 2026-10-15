import {
  logout,
} from "@/app/actions/auth";

export default function SignOutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="
          inline-flex min-h-10
          items-center justify-center
          rounded-xl cursor-pointer
          border border-slate-300
          px-4 py-2 text-nowrap
          text-sm font-semibold
          text-slate-700
          transition
          hover:bg-slate-100
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-sky-500
          focus-visible:ring-offset-2
          dark:border-slate-700
          dark:text-slate-200
          dark:hover:bg-slate-900
          dark:focus-visible:ring-offset-slate-950
        "
      >
        Sign out
      </button>
    </form>
  );
}