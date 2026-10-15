import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "generated/**",

    // Generated Sherpa/Emscripten runtime assets.
    // These are third-party build artifacts, not application source code.
    "public/tts/sherpa/**",
  ]),
]);