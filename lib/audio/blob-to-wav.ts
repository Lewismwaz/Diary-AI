function writeString(
  view: DataView,
  offset: number,
  value: string
) {
  for (
    let index = 0;
    index < value.length;
    index++
  ) {
    view.setUint8(
      offset + index,
      value.charCodeAt(index)
    );
  }
}

function audioBufferToWav(
  audioBuffer: AudioBuffer
): Blob {
  const numberOfChannels =
    audioBuffer.numberOfChannels;

  const sampleRate =
    audioBuffer.sampleRate;

  const bytesPerSample = 2;

  const blockAlign =
    numberOfChannels *
    bytesPerSample;

  const dataLength =
    audioBuffer.length *
    blockAlign;

  const buffer =
    new ArrayBuffer(
      44 + dataLength
    );

  const view =
    new DataView(buffer);

  // RIFF header
  writeString(
    view,
    0,
    "RIFF"
  );

  view.setUint32(
    4,
    36 + dataLength,
    true
  );

  writeString(
    view,
    8,
    "WAVE"
  );

  // fmt chunk
  writeString(
    view,
    12,
    "fmt "
  );

  view.setUint32(
    16,
    16,
    true
  );

  // PCM
  view.setUint16(
    20,
    1,
    true
  );

  view.setUint16(
    22,
    numberOfChannels,
    true
  );

  view.setUint32(
    24,
    sampleRate,
    true
  );

  view.setUint32(
    28,
    sampleRate * blockAlign,
    true
  );

  view.setUint16(
    32,
    blockAlign,
    true
  );

  // 16-bit PCM
  view.setUint16(
    34,
    16,
    true
  );

  // data chunk
  writeString(
    view,
    36,
    "data"
  );

  view.setUint32(
    40,
    dataLength,
    true
  );

  let offset = 44;

  for (
    let sampleIndex = 0;
    sampleIndex <
    audioBuffer.length;
    sampleIndex++
  ) {
    for (
      let channel = 0;
      channel <
      numberOfChannels;
      channel++
    ) {
      const channelData =
        audioBuffer.getChannelData(
          channel
        );

      const sample =
        Math.max(
          -1,
          Math.min(
            1,
            channelData[
              sampleIndex
            ]
          )
        );

      const pcmSample =
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff;

      view.setInt16(
        offset,
        pcmSample,
        true
      );

      offset += 2;
    }
  }

  return new Blob(
    [buffer],
    {
      type: "audio/wav",
    }
  );
}

export async function convertBlobToWav(
  audioBlob: Blob
): Promise<Blob> {
  const arrayBuffer =
    await audioBlob.arrayBuffer();

  const AudioContextClass =
    window.AudioContext;

  if (!AudioContextClass) {
    throw new Error(
      "Audio conversion is not supported by this browser."
    );
  }

  const audioContext =
    new AudioContextClass();

  try {
    const decodedAudio =
      await audioContext.decodeAudioData(
        arrayBuffer.slice(0)
      );

    return audioBufferToWav(
      decodedAudio
    );
  } finally {
    await audioContext.close();
  }
}