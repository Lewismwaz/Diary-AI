export type ThemePreference =
  | "light"
  | "dark"
  | "system";

export type ResolvedTheme =
  | "light"
  | "dark";

export const THEME_STORAGE_KEY =
  "diary-ai-theme";

export const DEFAULT_THEME:
  ThemePreference =
  "system";

export function isThemePreference(
  value: string | null
): value is ThemePreference {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system"
  );
}