import type {
  Metadata,
} from "next";

import "./globals.css";

import {
  ThemeProvider,
} from "@/components/theme/theme-provider";

import {
  TTSProvider,
} from "@/components/tts/tts-provider";

import {
  TTSNarrationModal,
} from "@/components/tts/tts-narration-modal";

export const metadata: Metadata = {
  title: {
    default: "Diary AI",
    template:
      "%s | Diary AI",
  },

  description:
    "A private AI-powered diary for capturing, understanding, and reflecting on your life.",

  applicationName:
    "Diary AI",

  icons: {
    icon: [
      {
        url: "/images/favicons/favicon.ico",
      },
      {
        url: "/images/favicons/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/images/favicons/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/images/favicons/apple-touch-icon.png",
      },
    ],
  },

  manifest:
    "/images/favicons/site.webmanifest",
};

const themeScript = `
(function () {
  try {
    var stored =
      localStorage.getItem(
        "diary-ai-theme"
      );

    var preference =
      stored === "light" ||
      stored === "dark" ||
      stored === "system"
        ? stored
        : "system";

    var isDark =
      preference === "dark" ||
      (
        preference === "system" &&
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches
      );

    document.documentElement
      .classList.toggle(
        "dark",
        isDark
      );

    document.documentElement
      .style.colorScheme =
        isDark
          ? "dark"
          : "light";
  } catch {
    // Fall back to the light theme
    // if browser storage is unavailable.
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>

      <body>
        <ThemeProvider>
          <TTSProvider>
            {children}

            <TTSNarrationModal />
          </TTSProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}