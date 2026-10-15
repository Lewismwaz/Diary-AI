type StatusMessageProps = {
  type: "error" | "success" | "info";
  message: string;
};

export default function StatusMessage({
  type,
  message,
}: StatusMessageProps) {
  const styles = {
    error:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",

    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",

    info:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  };

  return (
    <div
      role={
        type === "error"
          ? "alert"
          : "status"
      }
      className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}
    >
      {message}
    </div>
  );
}