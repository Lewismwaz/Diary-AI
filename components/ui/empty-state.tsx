import Image from "next/image";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
};

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        rounded-2xl border border-dashed
        border-slate-300 bg-white
        px-6 text-center shadow-sm
        dark:border-slate-700
        dark:bg-slate-950
        ${compact ? "py-8" : "py-12 sm:py-16"}
      `}
    >
      <div
        className="
          flex h-16 w-16
          items-center justify-center
          rounded-2xl
          bg-slate-50
          shadow-sm
          ring-1 ring-slate-200
          dark:bg-slate-900
          dark:ring-slate-800
        "
      >
        <Image
          src="/images/logo.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
        />
      </div>

      <h2
        className="
          mt-5 text-lg font-semibold
          text-slate-900
          dark:text-white
        "
      >
        {title}
      </h2>

      <p
        className="
          mx-auto mt-2 max-w-md
          text-sm leading-6
          text-slate-500
          dark:text-slate-400
        "
      >
        {description}
      </p>

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}