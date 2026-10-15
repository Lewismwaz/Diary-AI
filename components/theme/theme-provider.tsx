"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

import {
  DEFAULT_THEME,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;

  setTheme: (
    theme: ThemePreference
  ) => void;
};

const ThemeContext =
  createContext<
    ThemeContextValue | undefined
  >(undefined);

const THEME_CHANGE_EVENT =
  "diary-ai-theme-change";

function getStoredTheme():
  ThemePreference {
  if (
    typeof window ===
    "undefined"
  ) {
    return DEFAULT_THEME;
  }

  try {
    const stored =
      window.localStorage.getItem(
        THEME_STORAGE_KEY
      );

    return isThemePreference(
      stored
    )
      ? stored
      : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function subscribeToTheme(
  callback: () => void
) {
  function handleStorage(
    event: StorageEvent
  ) {
    if (
      event.key ===
      THEME_STORAGE_KEY
    ) {
      callback();
    }
  }

  window.addEventListener(
    "storage",
    handleStorage
  );

  window.addEventListener(
    THEME_CHANGE_EVENT,
    callback
  );

  return () => {
    window.removeEventListener(
      "storage",
      handleStorage
    );

    window.removeEventListener(
      THEME_CHANGE_EVENT,
      callback
    );
  };
}

function getSystemTheme():
  ResolvedTheme {
  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

function subscribeToSystemTheme(
  callback: () => void
) {
  const media =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

  media.addEventListener(
    "change",
    callback
  );

  return () => {
    media.removeEventListener(
      "change",
      callback
    );
  };
}

function applyTheme(
  resolvedTheme: ResolvedTheme
) {
  const root =
    document.documentElement;

  root.classList.toggle(
    "dark",
    resolvedTheme === "dark"
  );

  root.style.colorScheme =
    resolvedTheme;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * The server snapshot is always
   * DEFAULT_THEME.
   *
   * React therefore hydrates using the
   * same value rendered by the server,
   * then reads localStorage afterward.
   */
  const theme =
    useSyncExternalStore(
      subscribeToTheme,
      getStoredTheme,
      () => DEFAULT_THEME
    );

  /*
   * Same principle for the operating
   * system color scheme.
   */
  const systemTheme =
    useSyncExternalStore<ResolvedTheme>(
      subscribeToSystemTheme,
      getSystemTheme,
      () => "light"
    );

  const resolvedTheme:
    ResolvedTheme =
    theme === "system"
      ? systemTheme
      : theme;

  const setTheme =
    useCallback(
      (
        preference:
          ThemePreference
      ) => {
        try {
          window.localStorage.setItem(
            THEME_STORAGE_KEY,
            preference
          );
        } catch {
          /*
           * Storage may be unavailable
           * in a restricted browser.
           */
        }

        /*
         * The browser's "storage" event
         * does not fire in the same tab
         * that changed localStorage.
         *
         * Notify this tab explicitly.
         */
        window.dispatchEvent(
          new Event(
            THEME_CHANGE_EVENT
          )
        );
      },
      []
    );

  /*
   * React state -> external DOM.
   *
   * No React setState occurs here.
   */
  useEffect(() => {
    applyTheme(
      resolvedTheme
    );
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used within ThemeProvider."
    );
  }

  return context;
}