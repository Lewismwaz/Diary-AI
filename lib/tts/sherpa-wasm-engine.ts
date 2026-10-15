import { PCMPlayer } from "./pcm-player";

import {
  DEFAULT_TTS_OPTIONS,
  type PCMChunk,
  type TTSModelInfo,
  type TTSOptions,
  type TTSState,
} from "./types";

import type {
  TTSEngine,
  TTSChunkListener,
  TTSStateListener,
} from "./tts-engine";

import {
  segmentTextForSpeech,
} from "./segment-text";

import {
  pcmChunksToWav,
} from "./pcm-to-wav";

import {
  DEFAULT_TTS_SPEAKER_ID,
} from "@/lib/tts/tts-voices";

const MIN_START_BUFFER_SECONDS = 3;

const MIN_LONG_FORM_START_BUFFER_SECONDS = 10;

/*
 * Runtime underrun detection.
 *
 * We don't switch to "buffering" the instant the
 * calculated buffer reaches exactly zero because
 * tiny Web Audio timing differences are normal.
 */
const BUFFERING_EPSILON_SECONDS = 0.05;

/*
 * Once an underrun occurs, wait for a little PCM
 * headroom before reporting normal playback again.
 * This prevents rapid:
 *
 * playing -> buffering -> playing -> buffering
 */
const BUFFERING_RECOVERY_SECONDS = 0.5;

type WorkerReadyMessage = {
  type: "ready";
  modelType: string;
  numSpeakers: number;
};

type WorkerStatusMessage = {
  type: "status";
  status: string;
};

type WorkerChunkMessage = {
  type: "chunk";
  utteranceId: number;
  segmentIndex: number;
  samples: Float32Array;
  progress: number;
  callbackCount: number;
  generatedSamples: number;
};

type WorkerSegmentCompleteMessage = {
  type: "segment-complete";
  utteranceId: number;
  segmentIndex: number;
  sampleRate: number;
  totalSamples: number;
};

type WorkerCancelledMessage = {
  type: "cancelled";
  utteranceId: number;
  segmentIndex?: number;
};

type WorkerErrorMessage = {
  type: "error";
  utteranceId?: number;
  segmentIndex?: number;
  message: string;
};

type WorkerMessage =
  | WorkerReadyMessage
  | WorkerStatusMessage
  | WorkerChunkMessage
  | WorkerSegmentCompleteMessage
  | WorkerCancelledMessage
  | WorkerErrorMessage;

type PendingGeneration = {
  resolve: () => void;
  reject: (error: Error) => void;
};

type BufferedChunk = {
  samples: Float32Array;
  sampleRate: number;
  progress: number;
};

export class SherpaWasmEngine implements TTSEngine {
  private worker: Worker | null = null;

  private player = new PCMPlayer();

  private stateListeners =
    new Set<TTSStateListener>();

  private chunkListeners =
    new Set<TTSChunkListener>();

  private state: TTSState = {
    status: "idle",
    progress: {
      generated: 0,
      played: 0,
      totalSeconds: 0,
      bufferedSeconds: 0,
    },
    error: null,
  };

  private modelInfo: TTSModelInfo | null = null;

  private initializePromise:
    | Promise<TTSModelInfo>
    | null = null;

  private initializeResolve:
    | ((info: TTSModelInfo) => void)
    | null = null;

  private initializeReject:
    | ((error: Error) => void)
    | null = null;

  private utteranceCounter = 0;

  private activeUtteranceId:
    number | null = null;

  private segments: string[] = [];

  private currentSegmentIndex = 0;

  private completedSegments = 0;

  private speakerId: number =
    DEFAULT_TTS_SPEAKER_ID;

  private speed: number =
    DEFAULT_TTS_OPTIONS.speed;

  private playbackRate = 1;

  private generationStartedAt: number | null = null;

  private firstChunkAt: number | null = null;

  private playbackStartedAt: number | null = null;

  private pendingGeneration:
    | PendingGeneration
    | null = null;

  private startupChunks: BufferedChunk[] = [];

  /*
   * Complete PCM generated for the current narration.
   *
   * This is intentionally kept only in memory.
   * It powers Replay and WAV download without
   * another Sherpa inference pass.
   */
  private generatedChunks: BufferedChunk[] = [];

  private telemetryFrame:
    number | null = null;

  private generationComplete = false;

  private minimumObservedBuffer =
    Number.POSITIVE_INFINITY;

  private lastTelemetryLogAt = 0;

  /*
   * Two-stage startup:
   *
   * For long-form speech we keep Stage 1 buffered
   * until Stage 2 has produced its first PCM.
   */
  private longFormStageReady = false;
  private playbackBuffering = false;

  private getGeneratedDuration(): number {
    return this.generatedChunks.reduce(
      (total, chunk) =>
        total +
        chunk.samples.length /
          chunk.sampleRate,
      0,
    );
  }

  private startTelemetry(): void {
    this.stopTelemetry();

    const tick = () => {
      if (!this.playbackStarted) {
        this.telemetryFrame = null;
        return;
      }

      const played =
        this.player.getPlayedSeconds();

      const bufferedSeconds =
        this.player.getBufferedSeconds();

      const totalSeconds =
        this.player.getScheduledDuration();

      /*
       * Detect a genuine playback underrun only while
       * generation is still active.
       *
       * Once generation is complete, the buffer naturally
       * approaches zero because playback is finishing.
       * That is not a buffering event.
       */
      const hasUnderrun =
        !this.pauseRequested &&
        !this.generationComplete &&
        bufferedSeconds <=
          BUFFERING_EPSILON_SECONDS;

      /*
       * Enter buffering.
       */
      if (
        hasUnderrun &&
        !this.playbackBuffering &&
        !this.pauseRequested
      ) {
        this.playbackBuffering = true;

        console.log(
          "[TTS] Playback buffering:",
          {
            played:
              played.toFixed(2),
            buffered:
              bufferedSeconds.toFixed(2),
          },
        );
      }

      /*
       * Leave buffering only after some useful headroom
       * has returned.
       */
      if (
        this.playbackBuffering &&
        bufferedSeconds >=
          BUFFERING_RECOVERY_SECONDS
      ) {
        this.playbackBuffering = false;

        console.log(
          "[TTS] Playback resumed:",
          {
            played:
              played.toFixed(2),
            buffered:
              bufferedSeconds.toFixed(2),
          },
        );
      }

      const now = performance.now();

      if (
        now - this.lastTelemetryLogAt >=
          1000
      ) {
        this.lastTelemetryLogAt = now;

        console.log(
          "[TTS] Playback telemetry:",
          {
            played:
              played.toFixed(2),
            buffered:
              bufferedSeconds.toFixed(2),
            scheduled:
              this.player
                .getScheduledDuration()
                .toFixed(2),
            generationComplete:
              this.generationComplete,
          },
        );
      }

      if (
        bufferedSeconds > 0 &&
        bufferedSeconds <
          this.minimumObservedBuffer
      ) {
        this.minimumObservedBuffer =
          bufferedSeconds;
      }

      this.setState({
        status: this.pauseRequested
          ? "paused"
          : this.playbackBuffering
            ? "buffering"
            : "playing",

        progress: {
          ...this.state.progress,
          played,
          totalSeconds,
          bufferedSeconds,
        },
      });

      /*
       * Generation can finish before playback.
       * Only mark the utterance ready once the
       * final scheduled PCM has actually ended.
       */
      if (
        this.generationComplete &&
        this.player.hasPlaybackFinished()
      ) {
        console.log(
          "[TTS] Minimum observed buffer:",
          Number.isFinite(
            this.minimumObservedBuffer,
          )
            ? this.minimumObservedBuffer.toFixed(3)
            : "n/a",
          "s",
        );

        this.playbackStarted = false;
        this.playbackBuffering = false;
        this.pauseRequested = false;

        const finalDuration =
          this.player.getScheduledDuration();

        this.setState({
          status: "finished",

          progress: {
            ...this.state.progress,
            generated: 1,
            played: finalDuration,
            totalSeconds: finalDuration,
            bufferedSeconds: 0,
          },
        });

        this.telemetryFrame = null;
        return;
      }

      this.telemetryFrame =
        requestAnimationFrame(tick);
    };

    this.telemetryFrame =
      requestAnimationFrame(tick);
  }

  private stopTelemetry(): void {
    if (this.telemetryFrame !== null) {
      cancelAnimationFrame(
        this.telemetryFrame,
      );

      this.telemetryFrame = null;
    }
  }
  
  private playbackStarted = false;
  private pauseRequested = false;

  private requestSegment(
    utteranceId: number,
    segmentIndex: number,
  ): void {
    if (
      !this.worker ||
      utteranceId !==
        this.activeUtteranceId
    ) {
      return;
    }

    const text =
      this.segments[segmentIndex];

    if (!text) {
      return;
    }

    this.currentSegmentIndex =
      segmentIndex;

    console.log(
      "[TTS] Requesting generation stage:",
      {
        stage: segmentIndex + 1,
        totalStages: this.segments.length,
        characters: text.length,
        preview:
          text.length > 100
            ? `${text.slice(0, 100)}...`
            : text,
      },
    );

    this.worker.postMessage({
      type: "generate-segment",
      utteranceId,
      segmentIndex,
      text,
      speakerId: this.speakerId,
      speed: this.speed,
    });
  }

  async initialize(): Promise<TTSModelInfo> {
    if (this.modelInfo) {
      return this.modelInfo;
    }

    if (this.initializePromise) {
      return this.initializePromise;
    }

    if (typeof window === "undefined") {
      throw new Error(
        "Sherpa WASM TTS can only initialize in the browser.",
      );
    }

    this.setState({
      status: "initializing",
      error: null,
    });

    this.initializePromise =
      new Promise<TTSModelInfo>(
        (resolve, reject) => {
          this.initializeResolve = resolve;
          this.initializeReject = reject;

          try {
            this.worker = new Worker(
              new URL(
                "../../workers/sherpa-tts.worker.js",
                import.meta.url,
              ),
            );

            this.worker.onmessage = (
              event: MessageEvent<WorkerMessage>,
            ) => {
              void this.handleWorkerMessage(
                event.data,
              );
            };

            this.worker.onerror = (event) => {
              const error = new Error(
                event.message ||
                  "Sherpa TTS worker failed.",
              );

              this.failInitialization(error);
              this.failGeneration(error);

              this.setState({
                status: "error",
                error: error.message,
              });
            };
          } catch (error) {
            const normalized =
              this.toError(error);

            this.failInitialization(normalized);

            this.setState({
              status: "error",
              error: normalized.message,
            });
          }
        },
      );

    return this.initializePromise;
  }



  async speak(
    text: string,
    options: TTSOptions = {},
  ): Promise<void> {
    const normalizedText = text.trim();

    if (!normalizedText) {
      throw new Error(
        "TTS text cannot be empty.",
      );
    }

    await this.initialize();

    if (!this.worker) {
      throw new Error(
        "Sherpa TTS worker is unavailable.",
      );
    }

    /*
     * One engine owns one active utterance.
     * Starting another utterance stops the old one.
     */
    this.stop();

    const segments =
      segmentTextForSpeech(normalizedText);

    if (segments.length === 0) {
      throw new Error(
        "TTS text produced no speech segments.",
      );
    }

    const utteranceId =
      ++this.utteranceCounter;

    this.activeUtteranceId =
      utteranceId;

    this.segments = segments;
    this.currentSegmentIndex = 0;
    this.completedSegments = 0;

    this.resetStartupBuffer();

    /*
     * Listen always means a completely new narration.
     */
    this.generatedChunks = [];

    this.generationComplete = false;

    this.minimumObservedBuffer =
      Number.POSITIVE_INFINITY;

    this.lastTelemetryLogAt = 0;

    this.longFormStageReady = false;

    this.playbackBuffering = false;

    this.pauseRequested = false;

    this.speakerId =
      options.speakerId ??
      DEFAULT_TTS_SPEAKER_ID;

    this.speed =
      options.speed ??
      DEFAULT_TTS_OPTIONS.speed;

    this.setState({
      status: "generating",

      progress: {
        generated: 0,
        played: 0,
        totalSeconds: 0,
        bufferedSeconds: 0,
      },

      error: null,
    });

    const generationPromise =
      new Promise<void>(
        (resolve, reject) => {
          this.pendingGeneration = {
            resolve,
            reject,
          };
        },
      );

    this.generationStartedAt =
      performance.now();

    this.firstChunkAt = null;
    this.playbackStartedAt = null;

    this.requestSegment(
      utteranceId,
      0,
    );

    return generationPromise;
  }

  async pause(): Promise<void> {
    if (
      this.state.status !== "generating" &&
      this.state.status !== "buffering" &&
      this.state.status !== "playing"
    ) {
      return;
    }

    /*
     * Record user intent immediately.
     *
     * Worker generation is allowed to continue,
     * but no generated PCM may cause playback
     * state to become "playing" until resume()
     * explicitly clears this flag.
     */
    this.pauseRequested = true;

    if (this.playbackStarted) {
      await this.player.pause();
    }

    /*
     * Publish "paused" only after Web Audio has
     * actually suspended.
     *
     * pauseRequested protects us from worker
     * callbacks changing the logical state while
     * the await is in progress.
     */
    this.setState({
      status: "paused",
    });
  }

  async resume(): Promise<void> {
    if (this.state.status !== "paused") {
      return;
    }

    /*
     * If playback already exists, resume the
     * AudioContext FIRST.
     *
     * Keep pauseRequested=true during the await so
     * incoming worker chunks and telemetry cannot
     * claim we're playing before Web Audio really
     * resumes.
     */
    if (this.playbackStarted) {
      await this.player.resume();

      this.pauseRequested = false;

      this.setState({
        status: this.playbackBuffering
          ? "buffering"
          : "playing",

        progress: {
          ...this.state.progress,
          bufferedSeconds:
            this.player.getBufferedSeconds(),
        },
      });

      return;
    }

    /*
     * Playback has not started yet.
     *
     * The user is resuming generation/buffering,
     * so it is now safe to clear the pause intent.
     */
    this.pauseRequested = false;

    /*
     * PCM may have accumulated while paused before
     * playback had its initial start.
     */
    if (this.startupChunks.length > 0) {
      const isTwoStageLongForm =
        this.segments.length === 2;

      const startupBufferedSeconds =
        this.getStartupBufferedSeconds();

      const canStartTwoStageLongForm =
        isTwoStageLongForm &&
        this.longFormStageReady &&
        startupBufferedSeconds >=
          MIN_LONG_FORM_START_BUFFER_SECONDS;

      const canStartNormalSpeech =
        !isTwoStageLongForm &&
        startupBufferedSeconds >=
          MIN_START_BUFFER_SECONDS;

      if (
        canStartTwoStageLongForm ||
        canStartNormalSpeech
      ) {
        await this.startBufferedPlayback();
        return;
      }

      /*
       * PCM exists, but our safe startup condition
       * has not been reached yet.
       */
      this.setState({
        status: "buffering",

        progress: {
          ...this.state.progress,
          bufferedSeconds:
            startupBufferedSeconds,
        },
      });

      return;
    }

    /*
     * No PCM exists yet. Sherpa is still generating.
     */
    this.setState({
      status: "generating",
    });
  }

  getAudioBlob(): Blob | null {
    if (
      !this.generationComplete ||
      this.generatedChunks.length === 0
    ) {
      return null;
    }

    return pcmChunksToWav(
      this.generatedChunks,
    );
  }

  setPlaybackRate(
    rate: number,
  ): void {
    if (
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return;
    }

    /*
     * Playback-rate changes apply to completed
     * retained audio and its next Replay.
     *
     * They do not trigger Sherpa inference.
     */
    this.playbackRate = rate;

    this.player.setPlaybackRate(rate);
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  async replay(): Promise<void> {
    if (
      !this.generationComplete ||
      this.generatedChunks.length === 0
    ) {
      return;
    }

    /*
     * Replay is only intended for a completed
     * narration.
     */
    if (
      this.state.status !== "finished" &&
      this.state.status !== "ready"
    ) {
      return;
    }

    this.stopTelemetry();

    /*
     * Clear only the Web Audio playback timeline.
     * Do NOT clear generatedChunks.
     */
    this.player.stop();

    this.pauseRequested = false;
    this.playbackBuffering = false;
    this.playbackStarted = true;

    const finalDuration =
      this.getGeneratedDuration() /
      this.playbackRate;

    this.setState({
      status: "buffering",

      progress: {
        ...this.state.progress,
        generated: 1,
        played: 0,
        totalSeconds: finalDuration,
        bufferedSeconds: finalDuration,
      },

      error: null,
    });

    /*
     * Schedule the already-generated PCM.
     *
     * No worker call occurs here.
     */
    for (const chunk of this.generatedChunks) {
      await this.player.schedule(
        chunk.samples,
        chunk.sampleRate,
      );
    }

    this.setState({
      status: "playing",

      progress: {
        ...this.state.progress,
        played: 0,
        totalSeconds:
          this.player.getScheduledDuration(),
        bufferedSeconds:
          this.player.getBufferedSeconds(),
      },
    });

    this.startTelemetry();
  }

  stop(): void {
    const utteranceId =
      this.activeUtteranceId;

    if (
      this.worker &&
      utteranceId !== null
    ) {
      this.worker.postMessage({
        type: "cancel",
        utteranceId,
      });
    }

    this.stopTelemetry();
    this.generationComplete = false;

    this.minimumObservedBuffer =
      Number.POSITIVE_INFINITY;

    this.activeUtteranceId = null;

    this.segments = [];
    this.currentSegmentIndex = 0;
    this.completedSegments = 0;

    this.resetStartupBuffer();
    this.pauseRequested = false;

    this.longFormStageReady = false;

    this.playbackBuffering = false;

    this.player.stop();

    /*
     * Stop closes the current listening session.
     * Replay/Download are therefore intentionally
     * discarded.
     */
    this.generatedChunks = [];

    if (this.pendingGeneration) {
      this.pendingGeneration.resolve();
      this.pendingGeneration = null;
    }

    if (
      this.state.status !== "idle" &&
      this.state.status !== "ready"
    ) {
      this.setState({
        status: "stopped",

        progress: {
          generated: 0,
          played: 0,
          totalSeconds: 0,
          bufferedSeconds: 0,
        },
      });
    }
  }

  subscribe(
    listener: TTSStateListener,
  ): () => void {
    this.stateListeners.add(listener);

    listener(this.state);

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  subscribeToChunks(
    listener: TTSChunkListener,
  ): () => void {
    this.chunkListeners.add(listener);

    return () => {
      this.chunkListeners.delete(listener);
    };
  }

  async dispose(): Promise<void> {
    this.stop();

    this.worker?.terminate();
    this.worker = null;

    await this.player.dispose();

    this.pauseRequested = false;

    this.modelInfo = null;
    this.initializePromise = null;
    this.initializeResolve = null;
    this.initializeReject = null;

    this.stateListeners.clear();
    this.chunkListeners.clear();

    this.state = {
      status: "idle",
      progress: {
        generated: 0,
        played: 0,
        totalSeconds: 0,
        bufferedSeconds: 0,
      },
      error: null,
    };
  }

  private async handleWorkerMessage(
    message: WorkerMessage,
  ): Promise<void> {
    switch (message.type) {
      case "status": {
        return;
      }

      case "ready": {
        /*
         * LibriTTS-R Medium is the model currently
         * packaged in our Emscripten .data file.
         */
        this.modelInfo = {
          sampleRate: 22050,
          numSpeakers: message.numSpeakers,
        };

        this.setState({
          status: "ready",
          error: null,
        });

        this.initializeResolve?.(
          this.modelInfo,
        );

        this.initializeResolve = null;
        this.initializeReject = null;

        return;
      }

      case "chunk": {
        if (
          message.utteranceId !==
            this.activeUtteranceId
        ) {
          return;
        }

        await this.handleChunk(message);

        return;
      }

      case "segment-complete": {
        if (
          message.utteranceId !==
            this.activeUtteranceId ||
          message.segmentIndex !==
            this.currentSegmentIndex
        ) {
          return;
        }

        this.completedSegments += 1;

        const generated =
          this.completedSegments /
          this.segments.length;

        this.setState({
          progress: {
            ...this.state.progress,
            generated,
            bufferedSeconds:
              this.playbackStarted
                ? this.player
                    .getBufferedSeconds()
                : this
                    .getStartupBufferedSeconds(),
          },
        });

        const nextSegmentIndex =
          message.segmentIndex + 1;

        if (
          nextSegmentIndex <
          this.segments.length
        ) {
          this.requestSegment(
            message.utteranceId,
            nextSegmentIndex,
          );

          return;
        }

        /*
         * Entire utterance has now been generated.
         */
        if (
          !this.playbackStarted &&
          this.startupChunks.length > 0 &&
          !this.pauseRequested
        ) {
          await this.startBufferedPlayback();
        }

        this.generationComplete = true;

        this.pendingGeneration?.resolve();
        this.pendingGeneration = null;

        this.activeUtteranceId = null;

        this.setState({
          progress: {
            ...this.state.progress,
            generated: 1,
            bufferedSeconds:
              this.playbackStarted
                ? this.player
                    .getBufferedSeconds()
                : this
                    .getStartupBufferedSeconds(),
          },
        });

        if (this.pauseRequested) {
          this.setState({
            status: "paused",
          });
        } else if (this.playbackStarted) {
          this.setState({
            status: "playing",
          });
        } else if (
          this.player.hasPlaybackFinished()
        ) {
          this.setState({
            status: "ready",
          });
        }

        return;
      }

      case "cancelled": {
        if (
          message.utteranceId !==
            this.activeUtteranceId
        ) {
          return;
        }

        this.pendingGeneration?.resolve();
        this.pendingGeneration = null;

        return;
      }

      case "error": {
        if (
          message.utteranceId !==
            this.activeUtteranceId
        ) {
          return;
        }

        const error = new Error(
          message.message,
        );

        this.failInitialization(error);
        this.failGeneration(error);

        this.setState({
          status: "error",
          error: error.message,
        });

        return;
      }
    }
  }

  private async handleChunk(
    message: WorkerChunkMessage,
  ): Promise<void> {
    const sampleRate =
      this.modelInfo?.sampleRate ?? 22050;

    /*
     * Sherpa's callback progress belongs only to the
     * current segment.
     *
     * Convert it into progress for the complete
     * utterance.
     */
    const segmentProgress =
      this.normalizeProgress(
        message.progress,
      );

    const overallProgress =
      (
        message.segmentIndex +
        segmentProgress
      ) /
      this.segments.length;

      const isTwoStageLongForm =
        this.segments.length === 2;

      const isLongFormStage =
        isTwoStageLongForm &&
        message.segmentIndex === 1;

      if (
        isLongFormStage &&
        !this.longFormStageReady
      ) {
        this.longFormStageReady = true;

        console.log(
          "[TTS] Long-form stage ready:",
          {
            segmentIndex:
              message.segmentIndex,
            startupBufferedSeconds:
              this.getStartupBufferedSeconds(),
          },
        );
      }

    /*
     * Temporary performance instrumentation.
     */
    if (
      this.firstChunkAt === null &&
      this.generationStartedAt !== null
    ) {
      this.firstChunkAt = performance.now();

      const firstChunkSeconds =
        (this.firstChunkAt -
          this.generationStartedAt) /
        1000;

      const chunkDurationSeconds =
        message.samples.length /
        sampleRate;

      console.log(
        "[TTS] First PCM:",
        firstChunkSeconds.toFixed(3),
        "s",
      );

      console.log(
        "[TTS] First chunk duration:",
        chunkDurationSeconds.toFixed(3),
        "s",
      );
    }

    const chunk: PCMChunk = {
      samples: message.samples,
      sampleRate,
      progress: overallProgress,
    };

    /*
     * Retain our own copy for Replay/Download.
     *
     * The worker transferred this Float32Array to us.
     * PCMPlayer only reads it, so keeping the reference
     * here does not duplicate the large sample buffer.
     */
    this.generatedChunks.push({
      samples: message.samples,
      sampleRate,
      progress: overallProgress,
    });

    for (const listener of this.chunkListeners) {
      listener(chunk);
    }

    this.setState({
      progress: {
        ...this.state.progress,
        generated: overallProgress,
      },
    });

    /*
     * Playback has already started.
     *
     * New PCM can therefore be appended directly
     * to Web Audio's scheduling queue.
     */
    if (this.playbackStarted) {
      await this.player.schedule(
        message.samples,
        sampleRate,
      );

      const bufferedSeconds =
        this.player.getBufferedSeconds();

      const totalSeconds =
        this.player.getScheduledDuration();

      /*
       * If we previously ran out of PCM, don't claim
       * we're playing again until enough headroom has
       * actually returned.
       */
      if (
        !this.pauseRequested &&
        this.playbackBuffering &&
        bufferedSeconds >=
          BUFFERING_RECOVERY_SECONDS
      ) {
              this.playbackBuffering = false;
      }

      this.setState({
        status: this.pauseRequested
          ? "paused"
          : this.playbackBuffering
            ? "buffering"
            : "playing",

        progress: {
          ...this.state.progress,
          totalSeconds,
          bufferedSeconds,
        },
      });

      return;
    }

    /*
     * Playback hasn't started yet.
     *
     * Accumulate PCM until we have sufficient
     * startup headroom.
     */
    this.startupChunks.push(chunk);

    const startupBufferedSeconds =
      this.getStartupBufferedSeconds();

    /*
     * Startup audio is derived directly from the
     * buffered PCM chunks. Do not maintain a second
     * counter that could drift out of sync.
     */

    const hasEnoughAudio =
      startupBufferedSeconds >=
      MIN_START_BUFFER_SECONDS;

    /*
     * Long-form two-stage narration:
     *
     * Stage 1 remains buffered until Stage 2 has
     * actually produced its first PCM callback.
     */
    const canStartTwoStageLongForm =
      isTwoStageLongForm &&
      this.longFormStageReady &&
      startupBufferedSeconds >=
        MIN_LONG_FORM_START_BUFFER_SECONDS;

    /*
     * Ordinary/short narration keeps using the
     * normal startup-buffer threshold.
     */
    const canStartNormalSpeech =
      !isTwoStageLongForm &&
      hasEnoughAudio;

    if (
      !this.pauseRequested &&
      (
        canStartTwoStageLongForm ||
        canStartNormalSpeech
      )
    ) {
      await this.startBufferedPlayback();
    }

    this.setState({
      status: this.pauseRequested
        ? "paused"
        : this.playbackStarted
          ? "playing"
          : "buffering",

      progress: {
        ...this.state.progress,

        totalSeconds:
          this.playbackStarted
            ? this.player
                .getScheduledDuration()
            : startupBufferedSeconds,

        bufferedSeconds:
          this.playbackStarted
            ? this.player
                .getBufferedSeconds()
            : startupBufferedSeconds,
      },
    });
  }

  private async startBufferedPlayback():
    Promise<void> {
    if (
      this.pauseRequested ||
      this.playbackStarted ||
      this.startupChunks.length === 0
    ) {
      return;
    }

    this.playbackStartedAt =
      performance.now();

    if (this.generationStartedAt !== null) {
      console.log(
        "[TTS] Playback start:",
        (
          (this.playbackStartedAt -
            this.generationStartedAt) /
          1000
        ).toFixed(3),
        "s",
      );
    }

    console.log(
      "[TTS] Audio available at playback start:",
      this.getStartupBufferedSeconds().toFixed(3),
      "s",
    );

    this.playbackStarted = true;

    /*
     * Capture first, clear second.
     */
    const chunks =
      this.startupChunks;

    this.startupChunks = [];

    for (const chunk of chunks) {
      await this.player.schedule(
        chunk.samples,
        chunk.sampleRate,
      );
    }

    /*
     * PCM is now actually scheduled.
     * Start observing the playback clock.
     */
    this.startTelemetry();

    this.setState({
      status: "playing",

      progress: {
        ...this.state.progress,

        played:
          this.player.getPlayedSeconds(),

        totalSeconds:
          this.player.getScheduledDuration(),

        bufferedSeconds:
          this.player.getBufferedSeconds(),
      },
    });
  }

  private resetStartupBuffer(): void {
    this.startupChunks = [];
    this.playbackStarted = false;
  }

  private getStartupBufferedSeconds():
    number {
    return this.startupChunks.reduce(
      (total, chunk) =>
        total +
        chunk.samples.length /
          chunk.sampleRate,
      0,
    );
  }

  private normalizeProgress(
    progress: number,
  ): number {
    if (!Number.isFinite(progress)) {
      return 0;
    }

    /*
     * Sherpa currently reports callback progress as
     * 0..1. Keep this defensive in case a runtime
     * reports percentages instead.
     */
    const normalized =
      progress > 1
        ? progress / 100
        : progress;

    return Math.min(
      1,
      Math.max(0, normalized),
    );
  }

  private setState(
    update: Partial<TTSState>,
  ): void {
    this.state = {
      ...this.state,
      ...update,
    };

    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }

  private failInitialization(
    error: Error,
  ): void {
    if (this.initializeReject) {
      this.initializeReject(error);
    }

    this.initializeResolve = null;
    this.initializeReject = null;
    this.initializePromise = null;
  }

  private failGeneration(
    error: Error,
  ): void {
    if (this.pendingGeneration) {
      this.pendingGeneration.reject(error);
      this.pendingGeneration = null;
    }

    this.activeUtteranceId = null;

    this.resetStartupBuffer();
    this.player.stop();
    this.stopTelemetry();
    this.generationComplete = false;
    this.longFormStageReady = false;
    this.playbackBuffering = false;
  }

  private toError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }
}