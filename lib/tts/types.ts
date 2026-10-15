export type TTSStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "generating"
  | "playing"
  | "paused"
  | "buffering"
  | "finished"
  | "stopped"
  | "error";

export interface TTSOptions {
  speakerId?: number;
  speed?: number;
}

export interface TTSVoice {
  id: number;
  name: string;
}

export interface TTSProgress {
  generated: number;

  /*
   * Actual audio playback position in seconds.
   */
  played: number;

  /*
   * Total audio currently generated/scheduled.
   *
   * This grows while Sherpa is generating and
   * becomes the final duration once generation
   * completes.
   */
  totalSeconds: number;

  bufferedSeconds: number;
}

export interface TTSState {
  status: TTSStatus;
  progress: TTSProgress;
  error: string | null;
}

export interface PCMChunk {
  samples: Float32Array;
  sampleRate: number;
  progress: number;
}

export interface TTSModelInfo {
  sampleRate: number;
  numSpeakers: number;
}

export const DEFAULT_TTS_OPTIONS = {
  speed: 1,
} as const;