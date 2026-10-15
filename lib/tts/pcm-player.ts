export class PCMPlayer {
  private audioContext: AudioContext | null = null;

  private nextScheduledTime = 0;

  private playbackRate = 1;

  private readonly COMPLETION_EPSILON_SECONDS = 0.05;

  private playbackStartedAt: number | null = null;

  private totalScheduledDuration = 0;

  private activeSources = new Set<AudioBufferSourceNode>();

  private paused = false;

  private playedBeforeCurrentRun = 0;

  private currentRunStartedAt:
    number | null = null;

  private currentRunScheduledDuration = 0;

  setPlaybackRate(
    rate: number,
  ): void {
    if (
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return;
    }

    this.playbackRate = rate;
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  async initialize(sampleRate: number): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate,
      });

      this.nextScheduledTime =
        this.audioContext.currentTime;
    }
  }

  async schedule(
    samples: Float32Array,
    sampleRate: number,
  ): Promise<void> {
    if (samples.length === 0) {
      return;
    }

    await this.initialize(sampleRate);

    const context = this.audioContext;

    if (!context) {
      throw new Error(
        "AudioContext could not be initialized.",
      );
    }

    /*
     * A browser may initially create AudioContext
     * suspended because of autoplay policy.
     *
     * Resume that initial suspension only when the
     * user has NOT explicitly paused playback.
     */
    if (
      context.state === "suspended" &&
      !this.paused
    ) {
      await context.resume();
    }

    const buffer = context.createBuffer(
      1,
      samples.length,
      sampleRate,
    );

    buffer.getChannelData(0).set(samples);

    const source =
      context.createBufferSource();

    source.buffer = buffer;

    source.playbackRate.value =
      this.playbackRate;

    const playbackDuration =
      buffer.duration /
      this.playbackRate;

    source.connect(context.destination);

    /*
     * IMPORTANT:
     *
     * Determine whether the previous audio queue
     * has already run dry BEFORE changing
     * nextScheduledTime.
     */
    const previousQueueEnd =
      this.nextScheduledTime;

    const isNewRun =
      this.currentRunStartedAt === null ||
      context.currentTime >
        previousQueueEnd;

    /*
     * Schedule immediately if the previous queue
     * has already ended. Otherwise append this PCM
     * directly after the existing scheduled audio.
     */
    const startAt = Math.max(
      context.currentTime,
      previousQueueEnd,
    );

    /*
     * A new run means:
     *
     * 1. this is the first audio, or
     * 2. playback previously exhausted its buffer
     *    and this chunk arrived after the gap.
     */
    if (isNewRun) {
      if (
        this.currentRunStartedAt !== null
      ) {
        const previousRunPlayed =
          Math.min(
            this.currentRunScheduledDuration,
            Math.max(
              0,
              context.currentTime -
                this.currentRunStartedAt,
            ),
          );

        this.playedBeforeCurrentRun +=
          previousRunPlayed;
      }

      this.currentRunStartedAt =
        startAt;

      this.currentRunScheduledDuration =
        0;
    }

    /*
     * Keep this for overall playback lifecycle
     * detection.
     */
    if (this.playbackStartedAt === null) {
      this.playbackStartedAt =
        startAt;
    }

    /*
     * Each AudioBufferSourceNode may be started
     * exactly once.
     */
    source.start(startAt);

    /*
     * Update timing only once for this chunk.
     */
    this.currentRunScheduledDuration +=
      playbackDuration;

    this.totalScheduledDuration +=
      playbackDuration;

    this.nextScheduledTime =
      startAt + playbackDuration;

    this.activeSources.add(source);

    source.onended = () => {
      this.activeSources.delete(source);

      try {
        source.disconnect();
      } catch {
        // The source may already be disconnected.
      }
    };
  }

  async pause(): Promise<void> {
    if (
      !this.audioContext ||
      this.audioContext.state !== "running"
    ) {
      return;
    }

    await this.audioContext.suspend();

    this.paused = true;
  }

  async resume(): Promise<void> {
    if (
      !this.audioContext ||
      this.audioContext.state !== "suspended"
    ) {
      return;
    }

    await this.audioContext.resume();

    this.paused = false;
  }

  stop(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // The source may already have finished.
      }

      try {
        source.disconnect();
      } catch {
        // The source may already be disconnected.
      }
    }

    this.activeSources.clear();

    if (this.audioContext) {
      this.nextScheduledTime =
        this.audioContext.currentTime;
    } else {
      this.nextScheduledTime = 0;
    }

    this.playedBeforeCurrentRun = 0;
    this.currentRunStartedAt = null;
    this.currentRunScheduledDuration = 0;

    this.playbackStartedAt = null;
    this.totalScheduledDuration = 0;

    this.paused = false;
  }

  getPlayedSeconds(): number {
    if (
      !this.audioContext ||
      this.currentRunStartedAt === null
    ) {
      return this.playedBeforeCurrentRun;
    }

    const currentRunPlayed =
      Math.min(
        this.currentRunScheduledDuration,
        Math.max(
          0,
          this.audioContext.currentTime -
            this.currentRunStartedAt,
        ),
      );

    return Math.min(
      this.totalScheduledDuration,
      this.playedBeforeCurrentRun +
        currentRunPlayed,
    );
  }

  getScheduledDuration(): number {
    return this.totalScheduledDuration;
  }

  getBufferedSeconds(): number {
    if (!this.audioContext) {
      return 0;
    }

    return Math.max(
      0,
      this.nextScheduledTime -
        this.audioContext.currentTime,
    );
  }

  hasPlaybackFinished(): boolean {
    if (
      this.playbackStartedAt === null ||
      this.totalScheduledDuration <= 0
    ) {
      return false;
    }

    const played =
      this.getPlayedSeconds();

    const remaining =
      Math.max(
        0,
        this.totalScheduledDuration - played,
      );

    /*
     * AudioBufferSourceNode.onended is our strongest
     * signal that all scheduled PCM has actually
     * finished.
     *
     * The small epsilon handles Web Audio clock /
     * floating-point differences near the exact end
     * of playback.
     */
    return (
      this.activeSources.size === 0 &&
      remaining <=
        this.COMPLETION_EPSILON_SECONDS
    );
  }

  isPaused(): boolean {
    return this.paused;
  }

  async dispose(): Promise<void> {
    this.stop();

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.nextScheduledTime = 0;

    this.playbackStartedAt = null;
    this.totalScheduledDuration = 0;
  }
}