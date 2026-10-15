const FIRST_TARGET_LENGTH = 45;
const FIRST_MAX_LENGTH = 70;

/*
 * For very short text there is no reason to
 * create a separate startup request.
 */
const MIN_TWO_STAGE_LENGTH = 90;

export function segmentTextForSpeech(
  text: string,
): string[] {
  const normalized = text
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  /*
   * Short narration:
   *
   * Keep it as one Sherpa request. Splitting
   * short text only adds inference overhead.
   */
  if (
    normalized.length <=
    MIN_TWO_STAGE_LENGTH
  ) {
    return [normalized];
  }

  /*
   * Long narration:
   *
   * Stage 1:
   * A small natural startup phrase so Sherpa
   * can produce initial PCM quickly.
   *
   * Stage 2:
   * Everything remaining is sent as ONE
   * Sherpa generation request.
   */
  const splitAt = findBestBoundary(
    normalized,
    FIRST_TARGET_LENGTH,
    FIRST_MAX_LENGTH,
  );

  /*
   * Defensive fallback.
   */
  if (
    splitAt <= 0 ||
    splitAt >= normalized.length
  ) {
    return [normalized];
  }

  const first = normalized
    .slice(0, splitAt)
    .trim();

  const remainder = normalized
    .slice(splitAt)
    .trim();

  if (!first) {
    return [normalized];
  }

  if (!remainder) {
    return [first];
  }

  return [
    first,
    remainder,
  ];
}

function findBestBoundary(
  text: string,
  targetLength: number,
  maxLength: number,
): number {
  const searchLimit = Math.min(
    maxLength,
    text.length,
  );

  /*
   * Prefer strong sentence boundaries around
   * the target.
   */
  const sentenceBoundary =
    findBoundaryNearTarget(
      text,
      targetLength,
      searchLimit,
      /[.!?]\s/g,
    );

  if (sentenceBoundary !== null) {
    return sentenceBoundary;
  }

  /*
   * Then softer punctuation.
   */
  const punctuationBoundary =
    findBoundaryNearTarget(
      text,
      targetLength,
      searchLimit,
      /[,;:]\s/g,
    );

  if (punctuationBoundary !== null) {
    return punctuationBoundary;
  }

  /*
   * Finally split at whitespace so we never
   * cut through a word.
   */
  const whitespaceBoundary =
    findBoundaryNearTarget(
      text,
      targetLength,
      searchLimit,
      /\s/g,
    );

  if (whitespaceBoundary !== null) {
    return whitespaceBoundary;
  }

  /*
   * Extremely unusual input containing no
   * whitespace/punctuation.
   */
  return searchLimit;
}

function findBoundaryNearTarget(
  text: string,
  targetLength: number,
  searchLimit: number,
  pattern: RegExp,
): number | null {
  const candidates: number[] = [];

  const searchable =
    text.slice(0, searchLimit);

  for (
    const match of searchable.matchAll(pattern)
  ) {
    /*
     * Split after the punctuation/whitespace.
     */
    candidates.push(
      match.index + match[0].length,
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  /*
   * Select the boundary closest to our target
   * rather than blindly choosing the last one.
   */
  let best = candidates[0];
  let bestDistance = Math.abs(
    best - targetLength,
  );

  for (const candidate of candidates) {
    const distance = Math.abs(
      candidate - targetLength,
    );

    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best;
}