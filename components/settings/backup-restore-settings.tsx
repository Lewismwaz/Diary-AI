"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

import StatusMessage from "@/components/ui/status-message";

type GoogleConnection =
  | {
      connected: false;
    }
  | {
      connected: true;
      googleEmail: string;
      backupGeneration: number;
      lastBackupAt: Date | null;
      connectedAt: Date;
    };

type BackupRestoreSettingsProps = {
  googleConnection:
    GoogleConnection;
};

type BackupPreview = {
  valid: true;
  version: number;
  exportedAt: string;

  account: {
    firstName: string;
    lastName: string;
    email: string;
  };

  entryCount: number;
  textEntryCount: number;
  voiceEntryCount: number;
  analysisCount: number;
};

type GoogleDriveBackupPreview = {
  valid: true;
  filename: string;
  generation: number;
  version: number;
  exportedAt: string;

  account: {
    firstName: string;
    lastName: string;
    email: string;
  };

  entryCount: number;
  textEntryCount: number;
  voiceEntryCount: number;
  analysisCount: number;
};

type GoogleDriveVerifyResponse = {
  data?: GoogleDriveBackupPreview;
  error?: string;
};

type RestorePlan = {
  mode: "REPLACE";
  destructive: true;

  backup: {
    filename: string;
    generation: number;
    version: number;
    exportedAt: string;
    entryCount: number;
    textEntryCount: number;
    voiceEntryCount: number;
    analysisCount: number;
  };

  current: {
    entryCount: number;
    analysisCount: number;
  };

  account: {
    backupEmail: string;
    currentEmail: string;
    emailMatches: boolean;

    backupFirstName: string;
    backupLastName: string;

    currentFirstName: string;
    currentLastName: string;
  };

  willRestore: string[];
  willPreserve: string[];
};

type RestorePlanResponse = {
  data?: RestorePlan;
  error?: string;
};

type RestoreResponse = {
  data?: {
    restored: true;
    filename: string;
    generation: number;
    entryCount: number;
    analysisCount: number;
  };

  error?: string;
};

type ApiError = {
  error?: string;
};

type VerifyResponse = {
  data?: BackupPreview;
  error?: string;
};

function getErrorMessage(
  value: unknown,
  fallback: string
): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (
      value as ApiError
    ).error === "string"
  ) {
    return (
      value as ApiError
    ).error as string;
  }

  return fallback;
}

export function BackupRestoreSettings({
  googleConnection,
}: BackupRestoreSettingsProps) {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    showDisconnectConfirmation,
    setShowDisconnectConfirmation,
  ] = useState(false);

  const [
    disconnectConfirmation,
    setDisconnectConfirmation,
  ] = useState("");

  const [
    isDisconnectingGoogle,
    setIsDisconnectingGoogle,
  ] = useState(false);

  const [
    disconnectError,
    setDisconnectError,
  ] = useState("");

  const [
    driveVerifyPassphrase,
    setDriveVerifyPassphrase,
  ] = useState("");

  const [
    isVerifyingDriveBackup,
    setIsVerifyingDriveBackup,
  ] = useState(false);

  const [
    driveVerifyError,
    setDriveVerifyError,
  ] = useState("");

  const [
    drivePreview,
    setDrivePreview,
  ] =
    useState<GoogleDriveBackupPreview | null>(
      null
    );

  const [
    backupPassphrase,
    setBackupPassphrase,
  ] = useState("");

  const [
    backupPassphraseConfirmation,
    setBackupPassphraseConfirmation,
  ] = useState("");

  const [
    driveRestorePassphrase,
    setDriveRestorePassphrase,
  ] = useState("");

  const [
    isPreparingRestore,
    setIsPreparingRestore,
  ] = useState(false);

  const [
    restorePlanError,
    setRestorePlanError,
  ] = useState("");

  const [
    restorePlan,
    setRestorePlan,
  ] =
    useState<RestorePlan | null>(
      null
    );

  const [
    restoreConfirmation,
    setRestoreConfirmation,
  ] = useState("");

  const [
    isRestoring,
    setIsRestoring,
  ] = useState(false);

  const [
    restoreMutationError,
    setRestoreMutationError,
  ] = useState("");

  const [
    restoreSuccess,
    setRestoreSuccess,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null
  );

  const [
    restorePassphrase,
    setRestorePassphrase,
  ] = useState("");

  const [
    isCreatingBackup,
    setIsCreatingBackup,
  ] = useState(false);

  const [
    isCreatingDriveBackup,
    setIsCreatingDriveBackup,
  ] = useState(false);

  const [
    isVerifying,
    setIsVerifying,
  ] = useState(false);

  const [
    backupMessage,
    setBackupMessage,
  ] = useState("");

  const [
    backupError,
    setBackupError,
  ] = useState("");

  const [
    restoreError,
    setRestoreError,
  ] = useState("");

  const [
    preview,
    setPreview,
  ] = useState<BackupPreview | null>(
    null
  );

  async function handleCreateBackup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBackupError("");
    setBackupMessage("");

    if (
      backupPassphrase.length <
      12
    ) {
      setBackupError(
        "Backup passphrase must contain at least 12 characters."
      );

      return;
    }

    if (
      backupPassphrase !==
      backupPassphraseConfirmation
    ) {
      setBackupError(
        "Backup passphrases do not match."
      );

      return;
    }

    setIsCreatingBackup(
      true
    );

    try {
      const response =
        await fetch(
          "/api/backup/encrypted-export",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                passphrase:
                  backupPassphrase,
              }),
          }
        );

      if (!response.ok) {
        let body:
          unknown = null;

        try {
          body =
            await response.json();
        } catch {
          // Ignore invalid JSON here.
        }

        throw new Error(
          getErrorMessage(
            body,
            "Unable to create encrypted backup."
          )
        );
      }

      const blob =
        await response.blob();

      const disposition =
        response.headers.get(
          "Content-Disposition"
        );

      const filenameMatch =
        disposition?.match(
          /filename="([^"]+)"/
        );

      const filename =
        filenameMatch?.[1] ??
        "diary-ai-backup.diarybackup";

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        url;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url
      );

      setBackupPassphrase("");
      setBackupPassphraseConfirmation(
        ""
      );

      setBackupMessage(
        "Encrypted backup created successfully."
      );
    } catch (error) {
      setBackupError(
        error instanceof Error
          ? error.message
          : "Unable to create encrypted backup."
      );
    } finally {
      setIsCreatingBackup(
        false
      );
    }
  }

  async function handleDisconnectGoogleDrive() {
    setDisconnectError("");

    if (
      disconnectConfirmation !==
      "DISCONNECT GOOGLE DRIVE"
    ) {
      setDisconnectError(
        'Type "DISCONNECT GOOGLE DRIVE" exactly to confirm.'
      );

      return;
    }

    setIsDisconnectingGoogle(
      true
    );

    try {
      const response =
        await fetch(
          "/api/google-drive/disconnect",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                confirmation:
                  disconnectConfirmation,
              }),
          }
        );

      let body: {
        data?: {
          disconnected: boolean;
        };

        error?: string;
      };

      try {
        body =
          (await response.json()) as typeof body;
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (
        !response.ok ||
        !body.data?.disconnected
      ) {
        throw new Error(
          body.error ??
            "Unable to disconnect Google Drive."
        );
      }

      /*
       * Clear sensitive/stale Google Drive state.
       */
      setShowDisconnectConfirmation(
        false
      );

      setDisconnectConfirmation(
        ""
      );

      setDriveVerifyPassphrase(
        ""
      );

      setDrivePreview(
        null
      );

      setDriveVerifyError(
        ""
      );

      setDriveRestorePassphrase(
        ""
      );

      setRestorePlan(
        null
      );

      setRestorePlanError(
        ""
      );

      setRestoreConfirmation(
        ""
      );

      setRestoreMutationError(
        ""
      );

      setRestoreSuccess(
        ""
      );

      /*
       * Settings is a Server Component above this
       * client component, so refresh it to obtain
       * the new disconnected connection status.
       */
      router.refresh();
    } catch (error) {
      setDisconnectError(
        error instanceof Error
          ? error.message
          : "Unable to disconnect Google Drive."
      );
    } finally {
      setIsDisconnectingGoogle(
        false
      );
    }
  }

  async function handleCreateDriveBackup() {
    setBackupError("");
    setBackupMessage("");

    if (
      backupPassphrase.length <
      12
    ) {
      setBackupError(
        "Backup passphrase must contain at least 12 characters."
      );

      return;
    }

    if (
      backupPassphrase !==
      backupPassphraseConfirmation
    ) {
      setBackupError(
        "Backup passphrases do not match."
      );

      return;
    }

    if (
      !googleConnection.connected
    ) {
      setBackupError(
        "Connect Google Drive before creating a Drive backup."
      );

      return;
    }

    setIsCreatingDriveBackup(
      true
    );

    try {
      const response =
        await fetch(
          "/api/backup/google-drive",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                passphrase:
                  backupPassphrase,
              }),
          }
        );

      let body:
        | {
            data?: {
              filename: string;
              sizeBytes: number;
              generation: number;
              lastBackupAt: string;
            };

            error?: string;
          }
        | null = null;

      try {
        body =
          await response.json();
      } catch {
        // Handled below.
      }

      if (
        !response.ok ||
        !body?.data
      ) {
        throw new Error(
          body?.error ??
            "Unable to create Google Drive backup."
        );
      }

      setBackupPassphrase("");
      setBackupPassphraseConfirmation(
        ""
      );

      setBackupMessage(
        "Encrypted backup saved to Google Drive successfully."
      );

      router.refresh();
    } catch (error) {
      setBackupError(
        error instanceof Error
          ? error.message
          : "Unable to create Google Drive backup."
      );
    } finally {
      setIsCreatingDriveBackup(
        false
      );
    }
  }

  async function handleVerifyLatestDriveBackup(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  setDriveVerifyError("");
  setDrivePreview(null);

  if (
    driveVerifyPassphrase.length <
    12
  ) {
    setDriveVerifyError(
      "Enter the backup passphrase."
    );

    return;
  }

  if (
    !googleConnection.connected
  ) {
    setDriveVerifyError(
      "Google Drive is not connected."
    );

    return;
  }

  setIsVerifyingDriveBackup(
    true
  );

  try {
    const response =
      await fetch(
        "/api/backup/google-drive/verify",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              passphrase:
                driveVerifyPassphrase,
            }),
        }
      );

    let body:
      GoogleDriveVerifyResponse;

    try {
      body =
        (await response.json()) as GoogleDriveVerifyResponse;
    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }

    if (
      !response.ok ||
      !body.data
    ) {
      throw new Error(
        body.error ??
          "Unable to verify the latest Google Drive backup."
      );
    }

    setDrivePreview(
      body.data
    );

    setDriveVerifyPassphrase(
      ""
    );
  } catch (error) {
    setDriveVerifyError(
      error instanceof Error
        ? error.message
        : "Unable to verify the latest Google Drive backup."
    );
  } finally {
    setIsVerifyingDriveBackup(
      false
    );
  }
}

async function handlePrepareRestore(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  setRestorePlanError("");
  setRestorePlan(null);

  setRestoreConfirmation("");
  setRestoreMutationError("");
  setRestoreSuccess("");

  if (
    driveRestorePassphrase.length <
    12
  ) {
    setRestorePlanError(
      "Enter the backup passphrase."
    );

    return;
  }

  if (
    !googleConnection.connected
  ) {
    setRestorePlanError(
      "Google Drive is not connected."
    );

    return;
  }

  setIsPreparingRestore(
    true
  );

  try {
    const response =
      await fetch(
        "/api/backup/google-drive/restore-plan",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              passphrase:
                driveRestorePassphrase,
            }),
        }
      );

    let body:
      RestorePlanResponse;

    try {
      body =
        (await response.json()) as RestorePlanResponse;
    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }

    if (
      !response.ok ||
      !body.data
    ) {
      throw new Error(
        body.error ??
          "Unable to prepare the restore plan."
      );
    }

    setRestorePlan(
      body.data
    );

    /*
     * Do NOT clear the passphrase yet.
     *
     * In Phase 4B the actual restore request
     * will need to independently authenticate
     * and decrypt the backup again.
     */
  } catch (error) {
    setRestorePlanError(
      error instanceof Error
        ? error.message
        : "Unable to prepare the restore plan."
    );
  } finally {
    setIsPreparingRestore(
      false
    );
  }
}

async function handleRestoreJournal() {
  setRestoreMutationError("");
  setRestoreSuccess("");

  if (!restorePlan) {
    setRestoreMutationError(
      "Prepare and review the restore before continuing."
    );

    return;
  }

  if (
    restoreConfirmation !==
    "RESTORE JOURNAL"
  ) {
    setRestoreMutationError(
      'Type "RESTORE JOURNAL" exactly to confirm.'
    );

    return;
  }

  if (
    driveRestorePassphrase.length <
    12
  ) {
    setRestoreMutationError(
      "Enter the backup passphrase."
    );

    return;
  }

  if (
    !googleConnection.connected
  ) {
    setRestoreMutationError(
      "Google Drive is not connected."
    );

    return;
  }

  setIsRestoring(
    true
  );

  try {
    const response =
      await fetch(
        "/api/backup/google-drive/restore",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              passphrase:
                driveRestorePassphrase,

              confirmation:
                restoreConfirmation,
            }),
        }
      );

    let body:
      RestoreResponse;

    try {
      body =
        (await response.json()) as RestoreResponse;
    } catch {
      throw new Error(
        "The server returned an invalid response."
      );
    }

    if (
      !response.ok ||
      !body.data?.restored
    ) {
      throw new Error(
        body.error ??
          "Unable to restore the journal."
      );
    }

    setRestoreSuccess(
      `Journal restored successfully. ${body.data.entryCount} entries and ${body.data.analysisCount} AI analyses were restored.`
    );

    /*
     * The destructive operation succeeded.
     * The previous preview is now stale because
     * the live database has changed.
     */
    setRestorePlan(
      null
    );

    setRestoreConfirmation(
      ""
    );

    setDriveRestorePassphrase(
      ""
    );

    /*
     * Refresh Server Components so Settings,
     * profile metadata and privacy preferences
     * reflect the restored database state.
     */
    router.refresh();
  } catch (error) {
    setRestoreMutationError(
      error instanceof Error
        ? error.message
        : "Unable to restore the journal."
    );
  } finally {
    setIsRestoring(
      false
    );
  }
}

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0] ??
      null;

    setSelectedFile(
      file
    );

    setPreview(
      null
    );

    setRestoreError(
      ""
    );

    setRestorePassphrase(
      ""
    );
  }

  async function handleVerifyBackup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setRestoreError("");
    setPreview(null);

    if (!selectedFile) {
      setRestoreError(
        "Select a Diary AI backup file."
      );

      return;
    }

    if (
      restorePassphrase.length <
      12
    ) {
      setRestoreError(
        "Enter the backup passphrase."
      );

      return;
    }

    setIsVerifying(
      true
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "backup",
        selectedFile
      );

      formData.append(
        "passphrase",
        restorePassphrase
      );

      const response =
        await fetch(
          "/api/backup/verify",
          {
            method: "POST",
            body: formData,
          }
        );

      let body:
        VerifyResponse;

      try {
        body =
          (await response.json()) as VerifyResponse;
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (
        !response.ok ||
        !body.data
      ) {
        throw new Error(
          body.error ??
            "Unable to verify backup."
        );
      }

      setPreview(
        body.data
      );

      setRestorePassphrase(
        ""
      );
    } catch (error) {
      setRestoreError(
        error instanceof Error
          ? error.message
          : "Unable to verify backup."
      );
    } finally {
      setIsVerifying(
        false
      );
    }
  }

  function resetRestoreSelection() {
    setSelectedFile(
      null
    );

    setRestorePassphrase(
      ""
    );

    setRestoreError(
      ""
    );

    setPreview(
      null
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  function closeDisconnectModal() {
    if (isDisconnectingGoogle) {
      return;
    }

    setShowDisconnectConfirmation(false);
    setDisconnectConfirmation("");
    setDisconnectError("");
  }

  return (
    <section
      id="backup"
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">
          Backup & Restore
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Create encrypted copies of
          your journal and verify
          backups before restoring
          them.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="p-5 sm:p-6">
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Create Encrypted Backup
            </h2>

            <div className="mt-5 border-b border-slate-200 pb-5 dark:border-slate-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950 dark:text-white">
                    Google Drive
                  </h3>

                  {googleConnection.connected ? (
                    <div className="mt-1 space-y-1">
                      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Connected as{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {googleConnection.googleEmail}
                        </span>
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Backup generation{" "}
                        {googleConnection.backupGeneration}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Last Google Drive backup:{" "}
                        {googleConnection.lastBackupAt
                          ? new Date(
                              googleConnection.lastBackupAt
                            ).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Connect Google Drive to store encrypted
                      Diary AI backups and enable account recovery.
                    </p>
                  )}
                </div>

                {googleConnection.connected ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisconnectConfirmation(true);
                      setDisconnectConfirmation("");
                      setDisconnectError("");
                    }}
                    className="
                      inline-flex min-h-11 shrink-0 items-center justify-center
                      rounded-xl border text-nowrap
                      border-red-300 bg-red-50
                      px-4 py-2.5
                      text-sm font-semibold text-red-700
                      shadow-sm cursor-pointer
                      transition-colors duration-200

                      hover:border-red-400 hover:bg-red-100 hover:text-red-800

                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-red-500
                      focus-visible:ring-offset-2

                      dark:border-red-800
                      dark:bg-red-950/40
                      dark:text-red-300

                      dark:hover:border-red-700
                      dark:hover:bg-red-950/70
                      dark:hover:text-red-200

                      dark:focus-visible:ring-offset-slate-900
                    "
                  >
                    Disconnect Google Drive
                  </button>
                ) : (
                  <a
                    href="/api/google-drive/connect"
                    className="
                      inline-flex min-h-11 shrink-0 items-center justify-center
                      rounded-xl bg-sky-600
                      px-4 py-2.5
                      text-sm font-semibold text-white
                      transition

                      hover:bg-sky-700

                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-sky-500
                      focus-visible:ring-offset-2

                      dark:focus-visible:ring-offset-slate-900
                    "
                  >
                    Connect Google Drive
                  </a>
                )}
              </div>
            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Protect your journal
              with a separate backup
              passphrase. Diary AI
              does not store this
              passphrase.
            </p>
          </div>

          {(backupError ||
            backupMessage) && (
            <div className="mt-4 max-w-2xl">
              {backupError && (
                <StatusMessage
                  type="error"
                  message={
                    backupError
                  }
                />
              )}

              {backupMessage && (
                <StatusMessage
                  type="success"
                  message={
                    backupMessage
                  }
                />
              )}
            </div>
          )}

          <form
            onSubmit={
              handleCreateBackup
            }
            className="mt-5 max-w-2xl space-y-4"
          >
            <div>
              <label
                htmlFor="backup-passphrase"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Backup passphrase
              </label>

              <input
                id="backup-passphrase"
                type="password"
                autoComplete="new-password"
                value={
                  backupPassphrase
                }
                onChange={(
                  event
                ) =>
                  setBackupPassphrase(
                    event.target.value
                  )
                }
                placeholder="At least 12 characters"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                You will need this
                passphrase to decrypt
                and restore the
                backup.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm-backup-passphrase"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Confirm backup
                passphrase
              </label>

              <input
                id="confirm-backup-passphrase"
                type="password"
                autoComplete="new-password"
                value={
                  backupPassphraseConfirmation
                }
                onChange={(
                  event
                ) =>
                  setBackupPassphraseConfirmation(
                    event.target.value
                  )
                }
                placeholder="Repeat passphrase"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {googleConnection.connected && (
                <button
                  type="button"
                  onClick={
                    handleCreateDriveBackup
                  }
                  disabled={
                    isCreatingDriveBackup ||
                    isCreatingBackup
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
                >
                  {isCreatingDriveBackup
                    ? "Backing up..."
                    : "Back up to Google Drive"}
                </button>
              )}

              <button
                type="submit"
                disabled={
                  isCreatingBackup ||
                  isCreatingDriveBackup
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
              >
                {isCreatingBackup
                  ? "Creating download..."
                  : "Download backup"}
              </button>
            </div>
          </form>
        </div>

                {googleConnection.connected && (
                  <div className="border-t border-slate-200 p-5 dark:border-slate-800 sm:p-6">
                    <div>
                      <h3 className="font-semibold text-slate-950 dark:text-white">
                        Verify latest Google Drive backup
                      </h3>

                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Diary AI will securely
                        download your latest
                        tracked backup from
                        Google Drive and verify
                        it using your backup
                        passphrase. Nothing will
                        be restored.
                      </p>
                    </div>

                    <form
                      onSubmit={
                        handleVerifyLatestDriveBackup
                      }
                      className="mt-5 max-w-2xl space-y-4"
                    >
                      <div>
                        <label
                          htmlFor="drive-verify-passphrase"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                        >
                          Backup passphrase
                        </label>

                        <input
                          id="drive-verify-passphrase"
                          type="password"
                          autoComplete="off"
                          value={
                            driveVerifyPassphrase
                          }
                          onChange={(
                            event
                          ) =>
                            setDriveVerifyPassphrase(
                              event.target.value
                            )
                          }
                          placeholder="Enter backup passphrase"
                          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                        />
                      </div>

                      {driveVerifyError && (
                        <StatusMessage
                          type="error"
                          message={
                            driveVerifyError
                          }
                        />
                      )}

                      <button
                        type="submit"
                        disabled={
                          isVerifyingDriveBackup
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
                      >
                        {isVerifyingDriveBackup
                          ? "Verifying..."
                          : "Verify latest Drive backup"}
                      </button>
                    </form>

                    {drivePreview && (
                      <div className="mt-6 max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
                        <div>
                          <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                            Google Drive backup
                            verified successfully
                          </p>

                          <p className="mt-1 text-sm leading-6 text-emerald-700 dark:text-emerald-400">
                            Diary AI downloaded,
                            decrypted and
                            validated the latest
                            tracked backup.
                          </p>
                        </div>

                        <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              Backup file
                            </dt>

                            <dd className="mt-0.5 break-all font-semibold text-slate-950 dark:text-white">
                              {
                                drivePreview.filename
                              }
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              Backup generation
                            </dt>

                            <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                              {
                                drivePreview.generation
                              }
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              Account
                            </dt>

                            <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                              {
                                drivePreview.account.firstName
                              }{" "}
                              {
                                drivePreview.account.lastName
                              }
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              Email
                            </dt>

                            <dd className="mt-0.5 break-all font-semibold text-slate-950 dark:text-white">
                              {
                                drivePreview.account.email
                              }
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              Exported
                            </dt>

                            <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                              {new Date(
                                drivePreview.exportedAt
                              ).toLocaleString()}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              Backup version
                            </dt>

                            <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                              {
                                drivePreview.version
                              }
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              Journal entries
                            </dt>

                            <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                              {
                                drivePreview.entryCount
                              }
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              Entry sources
                            </dt>

                            <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                              {
                                drivePreview.textEntryCount
                              }{" "}
                              text ·{" "}
                              {
                                drivePreview.voiceEntryCount
                              }{" "}
                              voice
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">
                              AI analyses
                            </dt>

                            <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                              {
                                drivePreview.analysisCount
                              }
                            </dd>
                          </div>
                        </dl>

                        <p className="mt-4 border-t border-emerald-200 pt-3 text-xs leading-5 text-slate-500 dark:border-emerald-900/70 dark:text-slate-400">
                          Verification is
                          read-only. Your current
                          journal and account have
                          not been changed.
                        </p>
                      </div>
                    )}
                  </div>
                )}

        <div className="border-t border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div>
            <h3 className="font-semibold text-slate-950 dark:text-white">
              Verify backup
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Select an encrypted
              Diary AI backup and
              enter its passphrase.
              Nothing will be restored
              yet.
            </p>
          </div>

          <form
            onSubmit={
              handleVerifyBackup
            }
            className="mt-5 max-w-2xl space-y-4"
          >
            <div>
              <label
                htmlFor="backup-file"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Backup file
              </label>

              <input
                ref={
                  fileInputRef
                }
                id="backup-file"
                type="file"
                accept=".diarybackup,application/octet-stream"
                onChange={
                  handleFileChange
                }
                className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
              />

              {selectedFile && (
                <p className="mt-2 break-all text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Selected:{" "}
                  {
                    selectedFile.name
                  }
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="restore-passphrase"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Backup passphrase
              </label>

              <input
                id="restore-passphrase"
                type="password"
                autoComplete="off"
                value={
                  restorePassphrase
                }
                onChange={(
                  event
                ) =>
                  setRestorePassphrase(
                    event.target
                      .value
                  )
                }
                placeholder="Enter backup passphrase"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            {restoreError && (
              <StatusMessage
                type="error"
                message={
                  restoreError
                }
              />
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  isVerifying
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
              >
                {isVerifying
                  ? "Verifying..."
                  : "Verify backup"}
              </button>

              {selectedFile && (
                <button
                  type="button"
                  onClick={
                    resetRestoreSelection
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
                      

          {preview && (
            <div className="mt-6 max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Backup verified
                  successfully
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-700 dark:text-emerald-400">
                  The backup was
                  decrypted and passed
                  Diary AI validation.
                </p>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Account
                  </dt>

                  <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                    {
                      preview
                        .account
                        .firstName
                    }{" "}
                    {
                      preview
                        .account
                        .lastName
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Email
                  </dt>

                  <dd className="mt-0.5 break-all font-semibold text-slate-950 dark:text-white">
                    {
                      preview
                        .account
                        .email
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Exported
                  </dt>

                  <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                    {new Date(
                      preview
                        .exportedAt
                    ).toLocaleString()}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Backup version
                  </dt>

                  <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                    {
                      preview.version
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Journal entries
                  </dt>

                  <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                    {
                      preview
                        .entryCount
                    }
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Entry sources
                  </dt>

                  <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                    {
                      preview
                        .textEntryCount
                    }{" "}
                    text ·{" "}
                    {
                      preview
                        .voiceEntryCount
                    }{" "}
                    voice
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    AI analyses
                  </dt>

                  <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                    {
                      preview
                        .analysisCount
                    }
                  </dd>
                </div>
              </dl>

              <p className="mt-4 border-t border-emerald-200 pt-3 text-xs leading-5 text-slate-500 dark:border-emerald-900/70 dark:text-slate-400">
                Verification does not
                change your current
                journal or account.
              </p>
            </div>
          )}
        </div>

        {googleConnection.connected && (
          <div className="border-t border-slate-200 p-5 dark:border-slate-800 sm:p-6">
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Restore from Google Drive
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Preview exactly what would
                happen if you restored your
                latest Google Drive backup.
                Preparing a restore does not
                change your journal.
              </p>
            </div>

            <form
              onSubmit={
                handlePrepareRestore
              }
              className="mt-5 max-w-2xl space-y-4"
            >
              <div>
                <label
                  htmlFor="drive-restore-passphrase"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  Backup passphrase
                </label>

                <input
                  id="drive-restore-passphrase"
                  type="password"
                  autoComplete="off"
                  value={
                    driveRestorePassphrase
                  }
                  onChange={(
                    event
                  ) => {
                    setDriveRestorePassphrase(
                      event.target.value
                    );

                    setRestorePlan(
                      null
                    );

                    setRestorePlanError(
                      ""
                    );

                    setRestoreConfirmation(
                      ""
                    );

                    setRestoreMutationError(
                      ""
                    );

                    setRestoreSuccess(
                      ""
                    );
                  }}
                  placeholder="Enter backup passphrase"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {restorePlanError && (
                <StatusMessage
                  type="error"
                  message={
                    restorePlanError
                  }
                />
              )}

              <button
                type="submit"
                disabled={
                  isPreparingRestore
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900"
              >
                {isPreparingRestore
                  ? "Preparing..."
                  : "Prepare restore"}
              </button>
            </form>

            {restoreSuccess && (
              <div className="mt-5 max-w-3xl">
                <StatusMessage
                  type="success"
                  message={
                    restoreSuccess
                  }
                />
              </div>
            )}

            {restorePlan && (
              <div className="mt-6 max-w-3xl overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/70 dark:bg-amber-950/20">
                <div className="border-b border-amber-200 p-4 dark:border-amber-900/70 sm:p-5">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Restore preview
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                    Restore mode:{" "}
                    <strong>
                      {restorePlan.mode}
                    </strong>
                    . Your current journal
                    would be replaced by this
                    backup snapshot.
                  </p>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Current journal
                      </p>

                      <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                        {
                          restorePlan.current.entryCount
                        }
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        journal entries
                      </p>

                      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {
                          restorePlan.current.analysisCount
                        }{" "}
                        AI analyses
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Backup snapshot
                      </p>

                      <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                        {
                          restorePlan.backup.entryCount
                        }
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        journal entries
                      </p>

                      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {
                          restorePlan.backup.analysisCount
                        }{" "}
                        AI analyses
                      </p>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">
                        Backup file
                      </dt>

                      <dd className="mt-0.5 break-all font-semibold text-slate-950 dark:text-white">
                        {
                          restorePlan.backup.filename
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">
                        Generation
                      </dt>

                      <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                        {
                          restorePlan.backup.generation
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">
                        Exported
                      </dt>

                      <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                        {new Date(
                          restorePlan.backup.exportedAt
                        ).toLocaleString()}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">
                        Entry sources
                      </dt>

                      <dd className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                        {
                          restorePlan.backup.textEntryCount
                        }{" "}
                        text ·{" "}
                        {
                          restorePlan.backup.voiceEntryCount
                        }{" "}
                        voice
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                        Would restore
                      </h4>

                      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {restorePlan.willRestore.map(
                          (item) => (
                            <li
                              key={
                                item
                              }
                            >
                              • {item}
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="text-sm font-semibold text-slate-950 dark:text-white">
                        Would preserve
                      </h4>

                      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {restorePlan.willPreserve.map(
                          (item) => (
                            <li
                              key={
                                item
                              }
                            >
                              • {item}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>

                  {!restorePlan.account.emailMatches && (
                    <div className="mt-5 rounded-xl border border-amber-300 bg-amber-100 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                      The email stored in this
                      backup differs from your
                      current Diary AI email.
                      The currently authenticated
                      account would remain the
                      restore destination.
                    </div>
                  )}

                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/20">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                      No restore has happened.
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                      This is only a preview.
                      Your current journal,
                      account and settings are
                      unchanged.
                    </p>
                  </div>

                  <div className="mt-5 border-t border-amber-200 pt-5 dark:border-amber-900/70">
                    <h4 className="font-semibold text-slate-950 dark:text-white">
                      Confirm journal replacement
                    </h4>

                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Restoring will replace your
                      current journal with the backup
                      snapshot shown above. Entries
                      created after this backup will
                      be removed.
                    </p>

                    <div className="mt-4">
                      <label
                        htmlFor="restore-confirmation"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                      >
                        Type{" "}
                        <span className="font-bold">
                          RESTORE JOURNAL
                        </span>{" "}
                        to confirm
                      </label>

                      <input
                        id="restore-confirmation"
                        type="text"
                        autoComplete="off"
                        value={
                          restoreConfirmation
                        }
                        onChange={(
                          event
                        ) => {
                          setRestoreConfirmation(
                            event.target.value
                          );

                          setRestoreMutationError(
                            ""
                          );
                        }}
                        placeholder="RESTORE JOURNAL"
                        disabled={
                          isRestoring
                        }
                        className="mt-2 w-full max-w-md rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                      />
                    </div>

                    {restoreMutationError && (
                      <div className="mt-4 max-w-2xl">
                        <StatusMessage
                          type="error"
                          message={
                            restoreMutationError
                          }
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={
                        handleRestoreJournal
                      }
                      disabled={
                        isRestoring ||
                        restoreConfirmation !==
                          "RESTORE JOURNAL"
                      }
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
                    >
                      {isRestoring
                        ? "Restoring..."
                        : "Restore journal"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        Backups contain your journal
        and saved AI analysis data.
        Keep your backup passphrase
        private. Diary AI cannot
        recover an encrypted backup
        without it.
      </p>

      {showDisconnectConfirmation && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-center justify-center
            bg-slate-950/55
            p-4
            backdrop-blur-[2px]
          "
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="disconnect-google-title"
            aria-describedby="disconnect-google-description"
            className="
              relative
              w-full max-w-lg
              rounded-2xl
              border border-slate-200
              bg-white
              p-5
              shadow-2xl
              sm:p-6

              dark:border-slate-700
              dark:bg-slate-900
            "
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeDisconnectModal}
              disabled={isDisconnectingGoogle}
              aria-label="Close disconnect confirmation"
              className="
                absolute right-4 top-4
                inline-flex h-9 w-9
                items-center justify-center
                rounded-lg
                text-slate-500
                transition

                hover:bg-slate-100
                hover:text-slate-900

                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-red-500

                disabled:cursor-not-allowed
                disabled:opacity-50

                dark:text-slate-400
                dark:hover:bg-slate-800
                dark:hover:text-white
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="pr-10">
              <div
                className="
                  flex h-11 w-11
                  items-center justify-center
                  rounded-full
                  bg-red-50
                  text-red-600

                  dark:bg-red-950/50
                  dark:text-red-300
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
                </svg>
              </div>

              <h3
                id="disconnect-google-title"
                className="
                  mt-4 text-lg font-semibold
                  text-slate-950
                  dark:text-white
                "
              >
                Disconnect Google Drive?
              </h3>

              <p
                id="disconnect-google-description"
                className="
                  mt-2 text-sm leading-6
                  text-slate-600
                  dark:text-slate-400
                "
              >
                Diary AI will remove its connection to this
                Google account and Google-based recovery will
                be disabled.
              </p>
            </div>

            {/* Warning */}
            <div
              className="
                mt-5 rounded-xl
                border border-red-200
                bg-red-50
                px-4 py-3

                dark:border-red-900/70
                dark:bg-red-950/30
              "
            >
              <p
                className="
                  text-sm leading-6
                  text-red-700
                  dark:text-red-300
                "
              >
                Existing encrypted Diary AI backup files in
                Google Drive will not be deleted.
              </p>
            </div>

            {/* Confirmation */}
            <div className="mt-5">
              <label
                htmlFor="disconnect-google-confirmation"
                className="
                  block text-sm font-medium
                  text-slate-700
                  dark:text-slate-200
                "
              >
                Type{" "}
                <span className="font-bold">
                  DISCONNECT GOOGLE DRIVE
                </span>{" "}
                to confirm
              </label>

              <input
                id="disconnect-google-confirmation"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={disconnectConfirmation}
                onChange={(event) => {
                  setDisconnectConfirmation(
                    event.target.value
                  );

                  setDisconnectError("");
                }}
                disabled={isDisconnectingGoogle}
                placeholder="DISCONNECT GOOGLE DRIVE"
                className="
                  mt-2 w-full
                  rounded-xl border
                  border-slate-300
                  bg-white
                  px-3.5 py-2.5
                  text-sm text-slate-950
                  outline-none
                  transition

                  placeholder:text-slate-400

                  focus:border-red-500
                  focus:ring-2
                  focus:ring-red-500/20

                  disabled:cursor-not-allowed
                  disabled:opacity-60

                  dark:border-slate-700
                  dark:bg-slate-950
                  dark:text-white
                  dark:placeholder:text-slate-500
                "
              />
            </div>

            {disconnectError && (
              <div className="mt-4">
                <StatusMessage
                  type="error"
                  message={disconnectError}
                />
              </div>
            )}

            {/* Actions */}
            <div
              className="
                mt-6 flex flex-col-reverse
                gap-3
                sm:flex-row
                sm:justify-end
              "
            >
              <button
                type="button"
                onClick={closeDisconnectModal}
                disabled={isDisconnectingGoogle}
                className="
                  inline-flex min-h-11
                  items-center justify-center
                  rounded-xl border
                  border-slate-300
                  bg-white cursor-pointer
                  px-4 py-2.5
                  text-sm font-semibold
                  text-slate-700
                  transition

                  hover:bg-slate-50

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-slate-400
                  focus-visible:ring-offset-2

                  disabled:cursor-not-allowed
                  disabled:opacity-50

                  dark:border-slate-700
                  dark:bg-slate-900
                  dark:text-slate-200
                  dark:hover:bg-slate-800
                  dark:focus-visible:ring-offset-slate-900
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDisconnectGoogleDrive}
                disabled={
                  isDisconnectingGoogle ||
                  disconnectConfirmation !==
                    "DISCONNECT GOOGLE DRIVE"
                }
                className="
                  inline-flex min-h-11
                  items-center justify-center
                  rounded-xl cursor-pointer
                  bg-red-600
                  px-4 py-2.5
                  text-sm font-semibold
                  text-white
                  transition

                  hover:bg-red-700

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-red-500
                  focus-visible:ring-offset-2

                  disabled:cursor-not-allowed
                  disabled:bg-red-600
                  disabled:opacity-50

                  dark:hover:bg-red-500
                  dark:focus-visible:ring-offset-slate-900
                "
              >
                {isDisconnectingGoogle
                  ? "Disconnecting..."
                  : "Disconnect Google Drive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}