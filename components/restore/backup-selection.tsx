"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

type DriveBackup = {
  id: string;
  name: string;
  createdAt: string | null;
  modifiedAt: string | null;
  size: string | null;
};

type BackupListResponse = {
  backups?: DriveBackup[];
  hasMore?: boolean;
  error?: string;
};

type VerifyResponse = {
  success?: boolean;
  nextStep?: string;
  message?: string;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function formatSize(value: string | null) {
  if (!value) return "Unknown size";

  const bytes = Number(value);

  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Unknown size";
  }

  if (bytes < 1024) return `${bytes} B`;

  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function BackupSelection() {
  const router = useRouter();

  const [backups, setBackups] = useState<DriveBackup[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const [showPassphrase, setShowPassphrase] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [sessionExpired, setSessionExpired] =
    useState(false);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError("");
    setSessionExpired(false);

    try {
      const response = await fetch(
        "/api/restore/backups",
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        }
      );

      const result =
        (await response.json()) as BackupListResponse;

      if (response.status === 401) {
        setSessionExpired(true);
        setBackups([]);
        setError(
          "Your Google verification session has expired. Please verify your Google account again."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to load your Google Drive backups."
        );
      }

      const available = result.backups ?? [];

      setBackups(available);
      setHasMore(Boolean(result.hasMore));

      setSelectedId((current) =>
        available.some((backup) => backup.id === current)
          ? current
          : (available[0]?.id ?? "")
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchInitialBackups() {
      try {
        const response = await fetch("/api/restore/backups", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        const result =
          (await response.json()) as BackupListResponse;

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setSessionExpired(true);
          setBackups([]);
          setError(
            "Your Google verification session has expired. Please verify your Google account again."
          );
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Unable to load your Google Drive backups."
          );
        }

        const available = result.backups ?? [];

        setBackups(available);
        setHasMore(Boolean(result.hasMore));

        setSelectedId(
          available[0]?.id ?? ""
        );
      } catch (caught) {
        if (controller.signal.aborted) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "An unexpected error occurred."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchInitialBackups();

    return () => {
      controller.abort();
    };
  }, []);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !selectedId ||
      passphrase.length < 12 ||
      verifying
    ) {
      return;
    }

    setVerifying(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/restore/verify-backup",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: selectedId,
            passphrase,
          }),
        }
      );

      const result =
        (await response.json()) as VerifyResponse;

      if (!response.ok) {
        if (response.status === 401) {
          setSessionExpired(true);
        }

        throw new Error(
          result.error ?? "Backup verification failed."
        );
      }

      if (
        result.success !== true ||
        result.nextStep !== "email-verification"
      ) {
        throw new Error(
          "The server returned an unexpected verification result."
        );
      }

      // Do not retain the passphrase after verification.
      setPassphrase("");
      setVerified(true);
      setNotice(
        result.message ??
          "Backup verified successfully."
      );

      // Navigate to the dedicated success stage.
      router.replace("/restore?step=backup-success");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "An unexpected error occurred."
      );
    } finally {
      setVerifying(false);
    }
  }

  if (verified) {
    return (
      <section className="space-y-5">
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <h2 className="text-lg font-semibold">
            Backup verified successfully
          </h2>

          <p className="mt-2 text-sm">
            {notice}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="font-semibold">
            Next: Verify your recovery email
          </h3>

          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your encrypted backup has been validated.
            Email verification is the next security
            requirement before account recovery.
          </p>

          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            We have not created an account or restored
            any journal entries yet.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          Select your Google Drive backup
        </h2>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Choose a version 2 backup and enter the
          encryption passphrase used when creating it.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {sessionExpired ? (
        <a
          href="/api/restore/google"
          className="inline-flex rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          Verify Google Account Again
        </a>
      ) : (
        <>
          {loading ? (
            <div
              role="status"
              className="rounded-lg border border-zinc-200 p-5 text-sm dark:border-zinc-800"
            >
              Searching Google Drive for backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
              <p className="font-medium">
                No version 2 backups found
              </p>

              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Confirm that you selected the Google
                account used to create your latest backup.
              </p>

              <button
                type="button"
                onClick={() => void loadBackups()}
                className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Search Again
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleVerify}
              className="space-y-5"
            >
              <fieldset
                disabled={verifying}
                className="space-y-3"
              >
                <legend className="mb-3 text-sm font-medium">
                  Available backups
                </legend>

                {backups.map((backup) => {
                  const selected =
                    selectedId === backup.id;

                  return (
                    <label
                      key={backup.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        selected
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                          : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="selectedBackup"
                        value={backup.id}
                        checked={selected}
                        onChange={() => {
                          setSelectedId(backup.id);
                          setPassphrase("");
                          setError("");
                        }}
                        className="mt-1 accent-blue-600"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block break-all text-sm font-semibold">
                          {backup.name}
                        </span>

                        <span className="mt-2 block text-xs text-zinc-600 dark:text-zinc-400">
                          Created:{" "}
                          {formatDate(backup.createdAt)}
                        </span>

                        <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">
                          Size: {formatSize(backup.size)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {hasMore && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Additional backups may exist. The
                  current API returned only the first
                  set of results.
                </p>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="backup-passphrase"
                  className="block text-sm font-medium"
                >
                  Backup encryption passphrase
                </label>

                <div className="flex gap-2">
                  <input
                    id="backup-passphrase"
                    type={
                      showPassphrase
                        ? "text"
                        : "password"
                    }
                    value={passphrase}
                    onChange={(event) =>
                      setPassphrase(event.target.value)
                    }
                    minLength={12}
                    maxLength={1024}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    placeholder="Enter backup passphrase"
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassphrase((value) => !value)
                    }
                    className="rounded-lg border border-zinc-300 px-4 text-sm dark:border-zinc-700"
                    aria-label={
                      showPassphrase
                        ? "Hide passphrase"
                        : "Show passphrase"
                    }
                  >
                    {showPassphrase ? "Hide" : "Show"}
                  </button>
                </div>

                <p className="text-xs text-zinc-500">
                  This is your backup encryption
                  passphrase, not your Diary AI account
                  password.
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  verifying ||
                  !selectedId ||
                  passphrase.length < 12
                }
                className="w-full cursor-pointer rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying
                  ? "Verifying encrypted backup..."
                  : "Verify Backup & Continue"}
              </button>

              <p className="text-center text-xs text-zinc-500">
                Verification does not overwrite your
                existing diary.
              </p>
            </form>
          )}
        </>
      )}
    </section>
  );
}
