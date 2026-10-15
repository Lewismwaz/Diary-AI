let tts = null;
let activeUtteranceId = null;

self.Module = {
  locateFile(path) {
    return `/tts/sherpa/${path}`;
  },

  setStatus(status) {
    self.postMessage({
      type: "status",
      status,
    });
  },

  onRuntimeInitialized() {
    try {
      tts = createOfflineTts(self.Module);

      self.postMessage({
        type: "ready",
        modelType: getDefaultOfflineTtsModelType(),
        numSpeakers: tts.numSpeakers,
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        message:
          "TTS initialization failed: " +
          getErrorMessage(error),
      });
    }
  },
};

importScripts(
  "/tts/sherpa/sherpa-onnx-wasm-main-tts.js",
);

importScripts(
  "/tts/sherpa/sherpa-onnx-tts.js",
);

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.stack
      ? `${error.message}\n${error.stack}`
      : error.message;
  }

  return String(error);
}

self.onmessage = (event) => {
  const {
    type,
    utteranceId,
    segmentIndex,
    text,
    speakerId = 331,
    speed = 1,
  } = event.data ?? {};

  if (type === "generate-segment") {
    generateSegment({
      utteranceId,
      segmentIndex,
      text,
      speakerId,
      speed,
    });

    return;
  }

  if (type === "cancel") {
    if (
      utteranceId === undefined ||
      utteranceId === activeUtteranceId
    ) {
      activeUtteranceId = null;
    }
  }
};

function generateSegment({
  utteranceId,
  segmentIndex,
  text,
  speakerId,
  speed,
}) {
  if (!tts) {
    self.postMessage({
      type: "error",
      utteranceId,
      segmentIndex,
      message: "Sherpa TTS is not ready.",
    });

    return;
  }

  if (
    typeof text !== "string" ||
    text.trim().length === 0
  ) {
    self.postMessage({
      type: "error",
      utteranceId,
      segmentIndex,
      message: "TTS segment cannot be empty.",
    });

    return;
  }

  activeUtteranceId = utteranceId;

  try {
    let callbackCount = 0;
    let generatedSamples = 0;

    const audio = tts.generateWithConfig(
      text,
      {
        sid: speakerId,
        speed,

        callback(samples, n, progress) {
          /*
           * generateWithConfig() is synchronous.
           * A cancel message cannot execute while
           * inference is running, so this primarily
           * protects state between segments.
           */
          if (
            activeUtteranceId !==
            utteranceId
          ) {
            return 0;
          }

          callbackCount += 1;
          generatedSamples += n;

          const chunk =
            new Float32Array(samples);

          self.postMessage(
            {
              type: "chunk",
              utteranceId,
              segmentIndex,
              samples: chunk,
              progress,
              callbackCount,
              generatedSamples,
            },
            [chunk.buffer],
          );

          return 1;
        },
      },
    );

    if (
      activeUtteranceId !== utteranceId
    ) {
      self.postMessage({
        type: "cancelled",
        utteranceId,
        segmentIndex,
      });

      return;
    }

    self.postMessage({
      type: "segment-complete",
      utteranceId,
      segmentIndex,
      sampleRate: audio.sampleRate,
      totalSamples: audio.samples.length,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      utteranceId,
      segmentIndex,
      message:
        "Speech generation failed: " +
        getErrorMessage(error),
    });
  }
}