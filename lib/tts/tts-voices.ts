export const TTS_VOICES = [
  { id: 0, name: "Avery" },
  { id: 331, name: "Amanda" },
  { id: 564, name: "Miles" },
  { id: 185, name: "Elena" },
  { id: 743, name: "John" },
  { id: 833, name: "Mary" },
  { id: 182, name: "Donald" },
  { id: 120, name: "Kristi" },
  { id: 25, name: "Claire" },
  { id: 15, name: "Sienna" },
  { id: 163, name: "Maya" },
  { id: 278, name: "Theo" },
  { id: 299, name: "Nora" },
  { id: 281, name: "Amara" },
  { id: 309, name: "Gabbie" },
  { id: 292, name: "Sonya" },
  { id: 305, name: "Naomi" },
  { id: 319, name: "Grace" },
  { id: 317, name: "Ben" },
  { id: 125, name: "Nelly" },
  { id: 242, name: "Sofia" },
  { id: 244, name: "Venus" },
] as const;

export const DEFAULT_TTS_SPEAKER_ID =
  TTS_VOICES[0].id;

export type TTSVoiceId =
  (typeof TTS_VOICES)[number]["id"];

export function isTTSVoiceId(
  value: number,
): value is TTSVoiceId {
  return TTS_VOICES.some(
    (voice) => voice.id === value,
  );
}

export function getTTSVoice(
  speakerId: number,
) {
  return TTS_VOICES.find(
    (voice) =>
      voice.id === speakerId,
  );
}