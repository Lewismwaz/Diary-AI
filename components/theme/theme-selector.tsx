"use client";

import {
  useTheme,
} from "@/components/theme/theme-provider";

import type {
  ThemePreference,
} from "@/lib/theme";

const options: {
  value: ThemePreference;
  label: string;
}[] = [
  {
    value: "light",
    label: "Light",
  },
  {
    value: "dark",
    label: "Dark",
  },
  {
    value: "system",
    label: "System",
  },
];

export function ThemeSelector() {
  const {
    theme,
    setTheme,
  } = useTheme();

  return (
    <div
      className="
        inline-flex
        rounded-xl
        border border-slate-200
        bg-slate-100
        p-1
        dark:border-slate-800
        dark:bg-slate-900
      "
      aria-label="Theme"
    >
      {options.map(
        (option) => {
          const selected =
            theme ===
            option.value;

          return (
            <button
              key={
                option.value
              }
              type="button"
              onClick={() =>
                setTheme(
                  option.value
                )
              }
              aria-pressed={
                selected
              }
              className={`
                min-h-9
                rounded-lg
                px-3
                text-xs cursor-pointer
                font-semibold
                transition
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-sky-500
                ${
                  selected
                    ? `
                      bg-white
                      text-slate-950
                      shadow-sm
                      dark:bg-slate-700
                      dark:text-white
                    `
                    : `
                      text-slate-500
                      hover:text-slate-900
                      dark:text-slate-400
                      dark:hover:text-white
                    `
                }
              `}
            >
              {
                option.label
              }
            </button>
          );
        }
      )}
    </div>
  );
}