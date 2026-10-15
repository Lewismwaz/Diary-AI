import { cp, mkdir, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const standaloneServer = path.join(standalone, "server.js");
const staticSource = path.join(root, ".next", "static");
const staticDestination = path.join(standalone, ".next", "static");
const publicSource = path.join(root, "public");
const publicDestination = path.join(standalone, "public");

try {
  await access(standaloneServer);
} catch {
  throw new Error("Missing .next/standalone/server.js. Ensure next.config.ts has output: 'standalone' and run the production build first.");
}

await mkdir(path.dirname(staticDestination), { recursive: true });
try {
  await access(staticSource);
  await cp(staticSource, staticDestination, { recursive: true, force: true });
} catch {
  console.warn("No .next/static directory was found; continuing without copied static assets.");
}

try {
  await access(publicSource);
  await cp(publicSource, publicDestination, { recursive: true, force: true });
} catch {
  console.warn("No public directory was found; continuing without copied public assets.");
}

console.log("Prepared Next.js standalone output for the Electron package.");
