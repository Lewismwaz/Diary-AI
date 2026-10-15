import type {
  PCMChunk,
  TTSModelInfo,
  TTSOptions,
  TTSState,
} from "./types";

export type TTSStateListener = (
  state: TTSState,
) => void;

export type TTSChunkListener = (
  chunk: PCMChunk,
) => void;

export interface TTSEngine {
  initialize(): Promise<TTSModelInfo>;

  speak(
    text: string,
    options?: TTSOptions,
  ): Promise<void>;

  pause(): Promise<void>;

  resume(): Promise<void>;

  /*
   * Replay the completed narration from retained
   * PCM without running Sherpa inference again.
   */
  replay(): Promise<void>;

  /*
   * Build a WAV file from the completed narration.
   *
   * null means generation has not completed or
   * there is no retained narration.
   */
  getAudioBlob(): Blob | null;

  stop(): void;

  subscribe(
    listener: TTSStateListener,
  ): () => void;

  subscribeToChunks(
    listener: TTSChunkListener,
  ): () => void;

  dispose(): Promise<void>;
}