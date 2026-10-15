import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Electron launches the production server from .next/standalone/server.js.
  output: "standalone",
};

export default nextConfig;
