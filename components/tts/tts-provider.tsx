"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { SherpaWasmEngine } from "@/lib/tts/sherpa-wasm-engine";


import type {
  TTSOptions,
  TTSState,
} from "@/lib/tts/types";

import type {
  TTSNarration,
} from "@/lib/tts/narration";

import {
  DEFAULT_TTS_SPEAKER_ID,
  isTTSVoiceId,
  type TTSVoiceId,
} from "@/lib/tts/tts-voices";

const TTS_SPEAKER_STORAGE_KEY =
  "diary-ai-tts-speaker-id";

const INITIAL_STATE: TTSState = {
  status: "idle",
  progress: {
    generated: 0,
    played: 0,
    totalSeconds: 0,
    bufferedSeconds: 0,
  },
  error: null,
};


type TTSContextValue = {
  state: TTSState;

  activeOwnerId: string | null;
  activeNarration: TTSNarration | null;

  selectedSpeakerId: TTSVoiceId;

  generatedSpeakerId: TTSVoiceId | null;
  applySelectedVoice: () => Promise<void>;

  setSelectedSpeakerId: (
    speakerId: number,
  ) => void;

  playbackRate: number;

  setPlaybackRate: (
    rate: number,
  ) => void;

  speak: (
    narration: TTSNarration,
    options?: TTSOptions,
  ) => Promise<void>;

  pause: () => Promise<void>;
  resume: () => Promise<void>;
  replay: () => Promise<void>;

  stop: () => void;

  getAudioBlob: () => Blob | null;
};

const TTSContext =
  createContext<TTSContextValue | null>(
    null,
  );

export function TTSProvider({
  children,
}: {
  children: ReactNode;
}) {
  const engineRef =
    useRef<SherpaWasmEngine | null>(
      null,
    );

  const [state, setState] =
    useState<TTSState>(INITIAL_STATE);

  const [
    activeOwnerId,
    setActiveOwnerId,
  ] = useState<string | null>(null);

  const [
    activeNarration,
    setActiveNarration,
  ] =
    useState<TTSNarration | null>(
      null,
    );

  const [
    playbackRate,
    setPlaybackRateState,
  ] = useState(1);


  /*
   * Voice 0 is our default.
   *
   * The persisted browser preference is loaded
   * after hydration.
   */
  const [
    selectedSpeakerId,
    setSelectedSpeakerIdState,
  ] = useState<TTSVoiceId>(
    () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return DEFAULT_TTS_SPEAKER_ID;
      }

      try {
        const stored =
          window.localStorage.getItem(
            TTS_SPEAKER_STORAGE_KEY,
          );

        if (stored === null) {
          return DEFAULT_TTS_SPEAKER_ID;
        }

        const parsed =
          Number(stored);

        if (isTTSVoiceId(parsed)) {
          return parsed;
        }

        window.localStorage.removeItem(
          TTS_SPEAKER_STORAGE_KEY,
        );

        return DEFAULT_TTS_SPEAKER_ID;
      } catch {
        return DEFAULT_TTS_SPEAKER_ID;
      }
    },
  );

  const [
    generatedSpeakerId,
    setGeneratedSpeakerId,
  ] = useState<TTSVoiceId | null>(null);


  const applySelectedVoice =
    useCallback(async (): Promise<void> => {
      const currentEngine =
        engineRef.current;

      const narration =
        activeNarration;

      if (
        !currentEngine ||
        !narration ||
        !narration.text.trim()
      ) {
        return;
      }

      const speakerId =
        selectedSpeakerId;

      /*
       * Nothing to regenerate if the selected
       * voice already generated this narration.
       */
      if (
        generatedSpeakerId ===
        speakerId
      ) {
        return;
      }

      /*
       * A newly generated voice starts at
       * normal playback speed, matching fresh
       * narration behaviour.
       */
      setPlaybackRateState(1);
      currentEngine.setPlaybackRate(1);

      /*
       * Record the speaker associated with this
       * new generation.
       */
      setGeneratedSpeakerId(
        speakerId,
      );

      await currentEngine.speak(
        narration.text,
        {
          speakerId,
          speed: 1,
        },
      );
    }, [
      activeNarration,
      selectedSpeakerId,
      generatedSpeakerId,
    ]);

  useEffect(() => {
    const instance =
      new SherpaWasmEngine();

    engineRef.current = instance;

    const unsubscribe =
      instance.subscribe(
        (nextState) => {
          setState(nextState);

          /*
           * Do not clear ownership when the
           * engine internally emits "stopped".
           *
           * speak() stops the previous utterance
           * before starting another one.
           */
        },
      );

    return () => {
      unsubscribe();

      void instance.dispose();

      engineRef.current = null;
    };
  }, []);

  function setPlaybackRate(
    rate: number,
  ): void {
    if (
      !Number.isFinite(rate) ||
      rate < 0.75 ||
      rate > 1.45
    ) {
      return;
    }

    setPlaybackRateState(rate);

    engineRef.current?.setPlaybackRate(
      rate,
    );
  }

  function setSelectedSpeakerId(
    speakerId: number,
  ): void {
    if (!isTTSVoiceId(speakerId)) {
      return;
    }

    setSelectedSpeakerIdState(
      speakerId,
    );

    try {
      window.localStorage.setItem(
        TTS_SPEAKER_STORAGE_KEY,
        String(speakerId),
      );
    } catch {
      /*
       * Keep the in-memory preference even if
       * persistence is unavailable.
       */
    }
  }

  async function speak(
    narration: TTSNarration,
  ): Promise<void> { 
    const currentEngine =
      engineRef.current;

    const normalizedText =
      narration.text.trim();

    if (
      !currentEngine ||
      !normalizedText
    ) {
      return;
    }

    /*
     * Every newly generated narration starts
     * at normal playback speed.
     *
     * Playback speed can be changed after the
     * completed narration is available.
     */
    setPlaybackRateState(1);

    currentEngine.setPlaybackRate(1);

    /*
     * Immediately transfer ownership.
     *
     * This opens/updates the modal before
     * generation completes.
     */
    setActiveOwnerId(
      narration.ownerId,
    );

    setActiveNarration({
      ...narration,
      text: normalizedText,
    });

    try {
      /*
       * Voice selection is global and owned by
       * the provider.
       *
       * Sherpa synthesis speed stays at 1.
       * Completed-audio playback speed is a
       * separate PCMPlayer concern.
       */
      const speakerId =
        selectedSpeakerId;

      setGeneratedSpeakerId(
        speakerId,
      );

      await currentEngine.speak(
        narration.text,
        {
          speakerId,
          speed: 1,
        },
      );
    } catch (error) {
      console.error(
        "TTS playback failed:",
        error,
      );
    }
  }

  async function pause(): Promise<void> {
    await engineRef.current?.pause();
  }

  async function resume(): Promise<void> {
    await engineRef.current?.resume();
  }

  async function replay(): Promise<void> {
    await engineRef.current?.replay();
  }

  function stop(): void {
    engineRef.current?.stop();

    setActiveOwnerId(null);
    setActiveNarration(null);
    setGeneratedSpeakerId(null);
  }

  function getAudioBlob():
    | Blob
    | null {
    return (
      engineRef.current?.getAudioBlob() ??
      null
    );
  }

  return (
    <TTSContext.Provider
      value={{
        state,

        activeOwnerId,
        activeNarration,

        selectedSpeakerId,
        setSelectedSpeakerId,

        generatedSpeakerId,
        applySelectedVoice,

        playbackRate,
        setPlaybackRate,

        speak,

        pause,
        resume,
        replay,
        stop,

        getAudioBlob,
      }}
    >
      {children}
    </TTSContext.Provider>
  );
}

export function useTTS(): TTSContextValue {
  const context =
    useContext(TTSContext);

  if (!context) {
    throw new Error(
      "useTTS must be used inside TTSProvider.",
    );
  }

  return context;
}