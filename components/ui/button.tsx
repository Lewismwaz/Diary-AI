import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger";

type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: ButtonVariant;
  };

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  const variants: Record<
    ButtonVariant,
    string
  > = {
    primary:
      "bg-sky-600 cursor-pointer text-white hover:bg-sky-500",

    secondary:
      "border cursor-pointer border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white",

    danger:
      "border cursor-pointer border-red-300 bg-transparent text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}