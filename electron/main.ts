import { app, BrowserWindow, dialog, shell } from "electron";
import EmbeddedPostgres from "embedded-postgres";
import { randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type RuntimeConfig = {
  postgresPassword: string;
  authSecret: string;
  recoveryOtpSecret: string;
  googleRestoreTokenEncryptionKey: string;
};

const APP_ID = "com.diaryai.desktop";
const DATABASE_NAME = "diary_ai";
const DATABASE_USER = "postgres";
// Keep this port stable: OAuth redirect URIs for a desktop build must be registered
// against a predictable localhost callback origin.
const APP_PORT = Number(process.env.DIARY_AI_DESKTOP_PORT ?? "3210");
if (!Number.isInteger(APP_PORT) || APP_PORT < 1024 || APP_PORT > 65535) {
  throw new Error("DIARY_AI_DESKTOP_PORT must be an integer between 1024 and 65535.");
}
const APP_HOST = "127.0.0.1";
const APP_URL = `http://localhost:${APP_PORT}`;

let postgres: InstanceType<typeof EmbeddedPostgres> | null = null;
let nextServer: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let shutdownStarted = false;
let databaseUrl = "";
let runtimeConfig: RuntimeConfig | null = null;

function getRuntimeDirectory(): string {
  return app.getPath("userData");
}

async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const configPath = path.join(getRuntimeDirectory(), "desktop-runtime.json");
  if (existsSync(configPath)) {
    try {
      const parsed = JSON.parse(await readFile(configPath, "utf8")) as Partial<RuntimeConfig>;
      if (
        typeof parsed.postgresPassword === "string" &&
        parsed.postgresPassword.length >= 32 &&
        typeof parsed.authSecret === "string" &&
        parsed.authSecret.length >= 32 &&
        typeof parsed.recoveryOtpSecret === "string" &&
        /^[a-fA-F0-9]{64}$/.test(parsed.recoveryOtpSecret) &&
        typeof parsed.googleRestoreTokenEncryptionKey === "string" &&
        /^[a-fA-F0-9]{64}$/.test(parsed.googleRestoreTokenEncryptionKey)
      ) {
        return parsed as RuntimeConfig;
      }
      throw new Error("desktop-runtime.json is missing required secret fields.");
    } catch (error) {
      throw new Error(
        `Cannot read ${configPath}. The file may be damaged. Do not delete it unless you have a verified backup.\n${String(error)}`,
      );
    }
  }

  const created: RuntimeConfig = {
    postgresPassword: randomBytes(36).toString("base64url"),
    authSecret: randomBytes(48).toString("base64url"),
    recoveryOtpSecret: randomBytes(32).toString("hex"),
    googleRestoreTokenEncryptionKey: randomBytes(32).toString("hex"),
  };
  await writeFile(configPath, `${JSON.stringify(created, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return created;
}

async function findAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, APP_HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a local PostgreSQL port."));
        return;
      }
      const { port } = address;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function assertAppPortAvailable(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once("error", () => {
      reject(
        new Error(
          `Diary AI needs localhost port ${APP_PORT}, but it is already in use. Close the other app using that port or set DIARY_AI_DESKTOP_PORT to another fixed port and register matching Google OAuth redirect URIs.`,
        ),
      );
    });
    server.listen(APP_PORT, APP_HOST, () => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
}

function buildDatabaseUrl(password: string, port: number): string {
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${DATABASE_USER}:${encodedPassword}@${APP_HOST}:${port}/${DATABASE_NAME}?schema=public`;
}

async function startEmbeddedDatabase(config: RuntimeConfig): Promise<void> {
  const databaseDirectory = path.join(getRuntimeDirectory(), "postgres-data");
  await mkdir(databaseDirectory, { recursive: true });
  const port = await findAvailablePort();

  postgres = new EmbeddedPostgres({
    databaseDir: databaseDirectory,
    user: DATABASE_USER,
    password: config.postgresPassword,
    port,
    persistent: true,
    postgresFlags: ["-h", APP_HOST],
    onLog: (message: string) => console.log(`[Diary AI PostgreSQL] ${message}`),
    onError: (message: unknown) => console.error("[Diary AI PostgreSQL]", message),
  });

  const initialized = existsSync(path.join(databaseDirectory, "PG_VERSION"));
  if (!initialized) {
    await postgres.initialise();
  }
  await postgres.start();
  databaseUrl = buildDatabaseUrl(config.postgresPassword, port);

  const client = postgres.getPgClient();
  await client.connect();
  let databaseExists = false;
  try {
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DATABASE_NAME]);
    databaseExists = (result.rowCount ?? 0) > 0;
  } finally {
    await client.end();
  }

  if (!databaseExists) {
    await postgres.createDatabase(DATABASE_NAME);
  }
}

function runNodeScript(scriptPath: string, args: string[], env: NodeJS.ProcessEnv, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!existsSync(scriptPath)) {
      reject(new Error(`Required packaged script was not found: ${scriptPath}`));
      return;
    }

    // Electron's own executable supplies the Node runtime, so users do not need
    // a separately installed Node.js. ELECTRON_RUN_AS_NODE is set only on child processes.
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > 20_000) stdout = stdout.slice(-20_000);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${path.basename(scriptPath)} ${args.join(" ")} failed (exit=${String(code)}, signal=${String(signal)}).\n${stderr}\n${stdout}`,
          ),
        );
      }
    });
  });
}

async function applyDatabaseMigrations(env: NodeJS.ProcessEnv): Promise<void> {
  const appDirectory = app.getAppPath();
  const prismaCli = path.join(appDirectory, "node_modules", "prisma", "build", "index.js");
  await runNodeScript(prismaCli, ["migrate", "deploy"], env, appDirectory);
}

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;
  while (Date.now() - startedAt < timeoutMs) {
    if (nextServer?.exitCode !== null && nextServer?.exitCode !== undefined) {
      throw new Error(`Next.js production server exited early (code ${nextServer.exitCode}).`);
    }
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(2_000) });
      if (response.status > 0) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Next.js did not become ready at ${url}. Last error: ${String(lastError)}`);
}

async function startNextProductionServer(config: RuntimeConfig): Promise<void> {
  const appDirectory = app.getAppPath();
  const standaloneDirectory = path.join(appDirectory, ".next", "standalone");
  const serverScript = path.join(standaloneDirectory, "server.js");
  if (!existsSync(serverScript)) {
    throw new Error(`Next.js standalone server is missing: ${serverScript}. Run npm run desktop:dist to build the desktop files.`);
  }

  await assertAppPortAvailable();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    DIARY_AI_DESKTOP: "true",
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: process.env.AUTH_SECRET || config.authSecret,
    RECOVERY_OTP_SECRET: process.env.RECOVERY_OTP_SECRET || config.recoveryOtpSecret,
    GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY || config.googleRestoreTokenEncryptionKey,
    AUTH_URL: APP_URL,
    NEXTAUTH_URL: APP_URL,
    AUTH_TRUST_HOST: "true",
    HOSTNAME: APP_HOST,
    PORT: String(APP_PORT),
    NEXT_TELEMETRY_DISABLED: "1",
  };

  nextServer = spawn(process.execPath, [serverScript], {
    cwd: standaloneDirectory,
    env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  nextServer.stdout?.on("data", (chunk: Buffer) => console.log(`[Diary AI] ${chunk.toString().trimEnd()}`));
  nextServer.stderr?.on("data", (chunk: Buffer) => console.error(`[Diary AI] ${chunk.toString().trimEnd()}`));
  nextServer.once("error", (error) => console.error("Could not start Next.js server:", error));

  await waitForServer(`${APP_URL}/login`);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 920,
    minHeight: 640,
    show: false,
    title: "Diary AI",
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  void mainWindow.loadURL(`${APP_URL}/login`);
}

async function stopChildProcess(child: ChildProcess | null): Promise<void> {
  if (!child || child.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 5_000);
    timer.unref();
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill();
  });
}

async function shutdown(): Promise<void> {
  await stopChildProcess(nextServer);
  nextServer = null;
  if (postgres) {
    try {
      await postgres.stop();
    } catch (error) {
      console.error("Could not stop embedded PostgreSQL cleanly:", error);
    }
    postgres = null;
  }
}

app.setAppUserModelId(APP_ID);
app.setName("Diary AI");

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await mkdir(getRuntimeDirectory(), { recursive: true });
      const userEnvPath = path.join(getRuntimeDirectory(), ".env");
      if (existsSync(userEnvPath) && typeof process.loadEnvFile === "function") {
        process.loadEnvFile(userEnvPath);
      }
      runtimeConfig = await loadRuntimeConfig();
      await startEmbeddedDatabase(runtimeConfig);

      const appEnv: NodeJS.ProcessEnv = {
        ...process.env,
        DATABASE_URL: databaseUrl,
        AUTH_SECRET: process.env.AUTH_SECRET || runtimeConfig.authSecret,
        RECOVERY_OTP_SECRET: process.env.RECOVERY_OTP_SECRET || runtimeConfig.recoveryOtpSecret,
        GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY || runtimeConfig.googleRestoreTokenEncryptionKey,
      };
      await applyDatabaseMigrations(appEnv);
      await startNextProductionServer(runtimeConfig);
      createWindow();
    } catch (error) {
      console.error("Diary AI desktop startup failed:", error);
      await shutdown();
      dialog.showErrorBox(
        "Diary AI could not start",
        `${error instanceof Error ? error.message : String(error)}\n\nYour local database files have not been deleted. If the problem persists, keep a copy of the Diary AI user-data folder before troubleshooting.`,
      );
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && nextServer) createWindow();
  });

  app.on("before-quit", (event) => {
    if (shutdownStarted) return;
    event.preventDefault();
    shutdownStarted = true;
    isQuitting = true;
    void shutdown().finally(() => app.quit());
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && !isQuitting) app.quit();
  });
}