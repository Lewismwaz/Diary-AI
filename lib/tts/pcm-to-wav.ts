type WAVChunk = {
  samples: Float32Array;
  sampleRate: number;
};

export function pcmChunksToWav(
  chunks: WAVChunk[],
): Blob {
  if (chunks.length === 0) {
    throw new Error(
      "Cannot create WAV from empty PCM.",
    );
  }

  const sampleRate =
    chunks[0].sampleRate;

  for (const chunk of chunks) {
    if (chunk.sampleRate !== sampleRate) {
      throw new Error(
        "All PCM chunks must use the same sample rate.",
      );
    }
  }

  const totalSamples =
    chunks.reduce(
      (total, chunk) =>
        total + chunk.samples.length,
      0,
    );

  const bytesPerSample = 2;
  const dataSize =
    totalSamples * bytesPerSample;

  const buffer =
    new ArrayBuffer(44 + dataSize);

  const view =
    new DataView(buffer);

  writeString(view, 0, "RIFF");

  view.setUint32(
    4,
    36 + dataSize,
    true,
  );

  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");

  view.setUint32(16, 16, true);

  // PCM
  view.setUint16(20, 1, true);

  // Mono
  view.setUint16(22, 1, true);

  view.setUint32(
    24,
    sampleRate,
    true,
  );

  view.setUint32(
    28,
    sampleRate * bytesPerSample,
    true,
  );

  view.setUint16(
    32,
    bytesPerSample,
    true,
  );

  // 16-bit PCM
  view.setUint16(34, 16, true);

  writeString(view, 36, "data");

  view.setUint32(
    40,
    dataSize,
    true,
  );

  let offset = 44;

  for (const chunk of chunks) {
    for (
      let index = 0;
      index < chunk.samples.length;
      index += 1
    ) {
      const sample = Math.max(
        -1,
        Math.min(
          1,
          chunk.samples[index],
        ),
      );

      const pcm16 =
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff;

      view.setInt16(
        offset,
        Math.round(pcm16),
        true,
      );

      offset += 2;
    }
  }

  return new Blob(
    [buffer],
    {
      type: "audio/wav",
    },
  );
}

function writeString(
  view: DataView,
  offset: number,
  value: string,
): void {
  for (
    let index = 0;
    index < value.length;
    index += 1
  ) {
    view.setUint8(
      offset + index,
      value.charCodeAt(index),
    );
  }
}