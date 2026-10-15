"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  convertBlobToWav,
} from "@/lib/audio/blob-to-wav";

type VoiceRecorderProps = {
  onTranscriptReady: (
    transcript: string
  ) => void;

  allowTranscription: boolean;
};

type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "recorded"
  | "converting"
  | "transcribing"
  | "error";

type TranscriptionResponse = {
  data?: {
    transcript?: string;
  };
  error?: string;
};

function getPreferredMimeType():
  | string
  | undefined {
  if (
    typeof MediaRecorder ===
    "undefined"
  ) {
    return undefined;
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return candidates.find(
    (type) =>
      MediaRecorder.isTypeSupported(
        type
      )
  );
}

export default function VoiceRecorder({
  onTranscriptReady,
  allowTranscription,
}: VoiceRecorderProps) {
  const mediaRecorderRef =
    useRef<MediaRecorder | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const chunksRef =
    useRef<Blob[]>([]);

  const timerRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  const [
    recordingBlob,
    setRecordingBlob,
  ] =
    useState<Blob | null>(null);

  const [status, setStatus] =
    useState<RecorderStatus>(
      "idle"
    );

  const [error, setError] =
    useState("");

  const [seconds, setSeconds] =
    useState(0);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(null);

  const [
    transcript,
    setTranscript,
  ] =
    useState("");

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(
        timerRef.current
      );

      timerRef.current = null;
    }
  }

  function stopMediaStream() {
    streamRef.current
      ?.getTracks()
      .forEach((track) => {
        track.stop();
      });

    streamRef.current = null;
  }

  function clearAudioUrl() {
    setAudioUrl(
      (currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(
            currentUrl
          );
        }

        return null;
      }
    );
  }

  async function startRecording() {
    setError("");
    setTranscript("");
    setRecordingBlob(null);
    setSeconds(0);

    clearAudioUrl();

    setStatus("requesting");

    try {
      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        throw new Error(
          "Audio recording is not supported by this browser."
        );
      }

      if (
        typeof MediaRecorder ===
        "undefined"
      ) {
        throw new Error(
          "Media recording is not supported by this browser."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current =
        stream;

      const mimeType =
        getPreferredMimeType();

      const mediaRecorder =
        mimeType
          ? new MediaRecorder(
              stream,
              {
                mimeType,
              }
            )
          : new MediaRecorder(
              stream
            );

      mediaRecorderRef.current =
        mediaRecorder;

      chunksRef.current = [];

      mediaRecorder.ondataavailable =
        (event) => {
          if (
            event.data.size > 0
          ) {
            chunksRef.current.push(
              event.data
            );
          }
        };

      mediaRecorder.onstop =
        () => {
          const mimeType =
            mediaRecorder.mimeType ||
            "audio/webm";

          const audioBlob =
            new Blob(
              chunksRef.current,
              {
                type: mimeType,
              }
            );

          if (
            audioBlob.size === 0
          ) {
            setError(
              "The recording was empty. Please try again."
            );

            setStatus("error");

            stopMediaStream();
            clearTimer();

            return;
          }

          const url =
            URL.createObjectURL(
              audioBlob
            );

          setRecordingBlob(
            audioBlob
          );

          setAudioUrl(url);

          setStatus("recorded");

          stopMediaStream();
          clearTimer();
        };

      mediaRecorder.onerror =
        () => {
          setError(
            "The recording could not be completed."
          );

          setStatus("error");

          stopMediaStream();
          clearTimer();
        };

      mediaRecorder.start();

      setStatus("recording");

      timerRef.current =
        setInterval(() => {
          setSeconds(
            (current) =>
              current + 1
          );
        }, 1000);
    } catch (error) {
      stopMediaStream();
      clearTimer();

      if (
        error instanceof
          DOMException &&
        error.name ===
          "NotAllowedError"
      ) {
        setError(
          "Microphone permission was denied. Allow microphone access and try again."
        );
      } else {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to access the microphone."
        );
      }

      setStatus("error");
    }
  }

  function stopRecording() {
    const recorder =
      mediaRecorderRef.current;

    if (
      recorder &&
      recorder.state ===
        "recording"
    ) {
      recorder.stop();
    }
  }

  function discardRecording() {
    clearAudioUrl();

    chunksRef.current = [];

    mediaRecorderRef.current =
      null;

    setRecordingBlob(null);
    setTranscript("");
    setSeconds(0);
    setError("");
    setStatus("idle");
  }

  async function transcribeRecording() {
    if (!recordingBlob) {
      setError(
        "Record some audio before transcribing."
      );

      return;
    }

    setError("");
    setStatus("converting");

    try {
      /*
       * Chrome commonly records WebM/Opus.
       * Decode it and create a real
       * PCM WAV file for Cohere.
       */
      const wavBlob =
        await convertBlobToWav(
          recordingBlob
        );

      const audioFile =
        new File(
          [wavBlob],
          "diary-recording.wav",
          {
            type: "audio/wav",
          }
        );

      const formData =
        new FormData();

      formData.append(
        "audio",
        audioFile
      );

      setStatus("transcribing");

      const response =
        await fetch(
          "/api/transcribe",
          {
            method: "POST",
            body: formData,
          }
        );

      const responseText =
        await response.text();

      let result:
        TranscriptionResponse = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            ) as TranscriptionResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to transcribe the recording."
        );
      }

      const text =
        result.data?.transcript
          ?.trim();

      if (!text) {
        throw new Error(
          "No transcript was returned."
        );
      }

      setTranscript(text);
      onTranscriptReady(text);
      setStatus("recorded");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to transcribe the recording."
      );

      /*
       * Preserve the original recording
       * so transcription can be retried.
       */
      setStatus("recorded");
    }
  }

  useEffect(() => {
    return () => {
      clearTimer();
      stopMediaStream();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(
          audioUrl
        );
      }
    };
  }, [audioUrl]);

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  const formattedTime =
    `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;

  return (
    <section
      className="
        rounded-2xl
        border border-slate-200
        bg-slate-50
        p-5
        dark:border-slate-800
        dark:bg-slate-950
        sm:p-6
      "
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          Voice entry
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Record your thoughts,
          preview them, then convert
          the recording into text.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="
            mt-4 rounded-xl
            border border-red-200
            bg-red-50
            px-4 py-3
            text-sm text-red-700
            dark:border-red-900/50
            dark:bg-red-950/40
            dark:text-red-300
          "
        >
          {error}
        </div>
      )}

      {status ===
        "requesting" && (
        <p
          className="mt-6 text-sm text-slate-600 dark:text-slate-400"
          aria-live="polite"
        >
          Waiting for microphone
          permission...
        </p>
      )}

      {status ===
        "recording" && (
        <div
          className="mt-6"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Recording
          </p>

          <p className="mt-1 font-mono text-2xl font-semibold text-slate-950 dark:text-white">
            {formattedTime}
          </p>
        </div>
      )}

      {status ===
        "converting" && (
        <div
          className="
            mt-6 rounded-xl
            border border-sky-200
            bg-sky-50
            px-4 py-3
            dark:border-sky-900/50
            dark:bg-sky-950/30
          "
          aria-live="polite"
        >
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
            Preparing your
            recording...
          </p>

          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Converting the recording
            into a transcription-ready
            audio format.
          </p>
        </div>
      )}

      {status ===
        "transcribing" && (
        <div
          className="
            mt-6 rounded-xl
            border border-sky-200
            bg-sky-50
            px-4 py-3
            dark:border-sky-900/50
            dark:bg-sky-950/30
          "
          aria-live="polite"
        >
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
            Transcribing your
            recording...
          </p>

          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Keep this page open while
            the audio is processed.
          </p>
        </div>
      )}

      {audioUrl && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Recording preview
          </p>

          <audio
            controls
            src={audioUrl}
            className="w-full"
          >
            Your browser does not
            support audio playback.
          </audio>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {(status === "idle" ||
          status === "error") && (
          <button
            type="button"
            onClick={startRecording}
            className="
              inline-flex min-h-11
              items-center justify-center
              rounded-xl
              bg-sky-600
              px-5 py-2
              font-semibold text-white
              transition
              hover:bg-sky-500
            "
          >
            Start recording
          </button>
        )}

        {status ===
          "recording" && (
          <button
            type="button"
            onClick={stopRecording}
            className="
              inline-flex min-h-11
              items-center justify-center
              rounded-xl
              bg-red-600
              px-5 py-2
              font-semibold text-white
              transition
              hover:bg-red-500
            "
          >
            Stop recording
          </button>
        )}

        {status ===
          "recorded" &&
          recordingBlob && (
            <>
              <button
                type="button"
                onClick={
                  transcribeRecording
                }
                disabled={
                  !allowTranscription
                }
                className="
                  inline-flex min-h-11
                  items-center justify-center
                  rounded-xl
                  bg-emerald-600
                  px-5 py-2
                  font-semibold text-white
                  transition
                  hover:bg-emerald-500
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {transcript
                  ? "Transcribe again"
                  : "Transcribe recording"}
              </button>

              {!allowTranscription && (
                <p className="basis-full text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Voice transcription is
                  disabled in Settings →
                  Privacy & AI. Your recording
                  remains available for local
                  preview or discard.
                </p>
              )}

              <button
                type="button"
                onClick={
                  startRecording
                }
                className="
                  inline-flex min-h-11
                  items-center justify-center
                  rounded-xl
                  border border-slate-300
                  bg-white
                  px-5 py-2
                  font-semibold
                  text-slate-700
                  transition
                  hover:bg-slate-100
                  dark:border-slate-700
                  dark:bg-transparent
                  dark:text-slate-300
                  dark:hover:bg-slate-900
                "
              >
                Record again
              </button>

              <button
                type="button"
                onClick={
                  discardRecording
                }
                className="
                  inline-flex min-h-11
                  items-center justify-center
                  rounded-xl
                  border border-slate-300
                  bg-white
                  px-5 py-2
                  font-semibold
                  text-slate-700
                  transition
                  hover:bg-slate-100
                  dark:border-slate-700
                  dark:bg-transparent
                  dark:text-slate-300
                  dark:hover:bg-slate-900
                "
              >
                Discard
              </button>
            </>
          )}
      </div>
    </section>
  );
}