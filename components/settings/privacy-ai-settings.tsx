"use client";

import {
  useState,
} from "react";

import StatusMessage from "@/components/ui/status-message";

type PrivacyAISettingsProps = {
  initialAllowVoiceTranscription: boolean;
  initialAllowAIProcessing: boolean;
  initialAllowAITrendAnalysis: boolean;
};

type PrivacySettings = {
  allowVoiceTranscription: boolean;
  allowAIProcessing: boolean;
  allowAITrendAnalysis: boolean;
};

type PrivacySettingsResponse = {
  data?: PrivacySettings;
  error?: string;
};

export default function PrivacyAISettings({
  initialAllowVoiceTranscription,
  initialAllowAIProcessing,
  initialAllowAITrendAnalysis,
}: PrivacyAISettingsProps) {
  const [
    settings,
    setSettings,
  ] = useState<PrivacySettings>({
    allowVoiceTranscription:
      initialAllowVoiceTranscription,

    allowAIProcessing:
      initialAllowAIProcessing,

    allowAITrendAnalysis:
      initialAllowAITrendAnalysis,
  });

  const [
    savingSetting,
    setSavingSetting,
  ] = useState<
    keyof PrivacySettings | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const isSaving =
    savingSetting !== null;

  async function updateSetting(
    key: keyof PrivacySettings,
    value: boolean
  ) {
    if (isSaving) {
      return;
    }

    setError("");
    setSuccess("");
    setSavingSetting(key);

    const previousSettings =
      settings;

    const nextSettings = {
      ...settings,
      [key]: value,
    };

    /*
     * AI trend analysis depends on the
     * master AI processing permission.
     *
     * Turning AI processing off also
     * disables AI trend analysis.
     */
    if (
      key ===
        "allowAIProcessing" &&
      !value
    ) {
      nextSettings.allowAITrendAnalysis =
        false;
    }

    /*
     * Optimistically update the UI.
     * If persistence fails, restore
     * the previous state.
     */
    setSettings(
      nextSettings
    );

    try {
      const response =
        await fetch(
          "/api/settings/privacy",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                nextSettings
              ),
          }
        );

      const responseText =
        await response.text();

      let result:
        PrivacySettingsResponse = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            ) as PrivacySettingsResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to update your privacy settings."
        );
      }

      if (result.data) {
        setSettings(
          result.data
        );
      }

      setSuccess(
        "Privacy preference saved."
      );
    } catch (error) {
      setSettings(
        previousSettings
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update your privacy settings."
      );
    } finally {
      setSavingSetting(
        null
      );
    }
  }

  return (
    <section
      id="privacy"
      className="space-y-4"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">
          Privacy & AI
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Control when your
          journal data may be
          processed by AI-powered
          features.
        </p>
      </div>

      {(error ||
        success) && (
        <div className="max-w-2xl">
          {error && (
            <StatusMessage
              type="error"
              message={error}
            />
          )}

          {success && (
            <StatusMessage
              type="success"
              message={success}
            />
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <SettingRow
          title="Voice transcription"
          description="Allow recorded audio to be processed for speech-to-text."
          checked={
            settings
              .allowVoiceTranscription
          }
          disabled={
            isSaving
          }
          saving={
            savingSetting ===
            "allowVoiceTranscription"
          }
          onChange={(value) =>
            void updateSetting(
              "allowVoiceTranscription",
              value
            )
          }
        />

        <SettingRow
          title="AI diary processing"
          description="Allow diary content to be processed for cleaning, summaries and entry analysis."
          checked={
            settings
              .allowAIProcessing
          }
          disabled={
            isSaving
          }
          saving={
            savingSetting ===
            "allowAIProcessing"
          }
          onChange={(value) =>
            void updateSetting(
              "allowAIProcessing",
              value
            )
          }
        />

        <SettingRow
          title="AI trend analysis"
          description={
            settings
              .allowAIProcessing
              ? "Allow multiple journal analyses to be synthesized into longer-term AI insights."
              : "Turn on AI diary processing before enabling AI trend analysis."
          }
          checked={
            settings
              .allowAITrendAnalysis
          }
          disabled={
            isSaving ||
            !settings
              .allowAIProcessing
          }
          saving={
            savingSetting ===
            "allowAITrendAnalysis"
          }
          onChange={(value) =>
            void updateSetting(
              "allowAITrendAnalysis",
              value
            )
          }
          last
        />
      </div>

      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        These preferences control
        whether the corresponding
        server-side AI features may
        process your journal data.
        Turning a feature off does
        not delete diary entries or
        AI results that were already
        saved.
      </p>
    </section>
  );
}

type SettingRowProps = {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  saving: boolean;
  onChange: (
    checked: boolean
  ) => void;
  last?: boolean;
};

function SettingRow({
  title,
  description,
  checked,
  disabled,
  saving,
  onChange,
  last = false,
}: SettingRowProps) {
  return (
    <div
      className={`flex items-start justify-between gap-5 px-5 py-5 sm:px-6 ${
        last
          ? ""
          : "border-b border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-slate-950 dark:text-white">
            {title}
          </h3>

          {saving && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Saving...
            </span>
          )}
        </div>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <ToggleSwitch
        checked={checked}
        disabled={disabled}
        label={title}
        onChange={onChange}
      />
    </div>
  );
}

type ToggleSwitchProps = {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (
    checked: boolean
  ) => void;
};

function ToggleSwitch({
  checked,
  disabled,
  label,
  onChange,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() =>
        onChange(
          !checked
        )
      }
      className={`
        relative mt-0.5
        inline-flex h-7 w-12
        shrink-0 items-center
        rounded-full
        transition
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-sky-500
        focus-visible:ring-offset-2
        dark:focus-visible:ring-offset-slate-900

        ${
          checked
            ? "bg-sky-600"
            : "bg-slate-300 dark:bg-slate-700"
        }

        ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer"
        }
      `}
    >
      <span
        aria-hidden="true"
        className={`
          inline-block
          h-5 w-5
          rounded-full
          bg-white
          shadow-sm
          transition-transform

          ${
            checked
              ? "translate-x-6"
              : "translate-x-1"
          }
        `}
      />
    </button>
  );
}