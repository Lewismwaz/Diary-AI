import "server-only";

import {
  cleanDiaryResultSchema,
  type CleanDiaryResult,
} from "@/domain/ai/diary-cleaning.schema";

import {
  diaryAnalysisResultSchema,
  type DiaryAnalysisResult,
} from "@/domain/ai/diary-analysis.schema";

import {
  diaryTrendSynthesisSchema,
  type DiaryTrendSynthesis,
} from "@/domain/ai/diary-trends.schema";

const COHERE_API_URL =
  "https://api.cohere.com/v2/audio/transcriptions";

const COHERE_CHAT_API_URL =
  "https://api.cohere.com/v2/chat";

const COHERE_DIARY_MODEL =
  "command-a-plus-05-2026";

export type CohereTranscriptionResult = {
  text: string;
};

export async function synthesizeDiaryTrends(
  input: unknown
): Promise<DiaryTrendSynthesis> {
  const apiKey =
    process.env.COHERE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "COHERE_API_KEY is not configured."
    );
  }

  const response =
    await fetch(
      COHERE_CHAT_API_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model:
            COHERE_DIARY_MODEL,

          temperature: 0,

          messages: [
            {
              role: "system",

              content: `
You analyze structured diary-analysis data across multiple diary entries.

Your task is to identify useful cross-entry patterns without inventing facts.

Rules:
- Use only the supplied data.
- Do not diagnose medical or mental-health conditions.
- Do not infer facts that are not supported by the supplied analyses.
- Do not alter or invent numerical statistics.
- Group semantically related topics only when the relationship is reasonably supported.
- Evidence must refer to information present in the supplied analyses.
- Distinguish repeated patterns from one-off observations.
- Do not describe a one-off observation as a recurring trend.
- Keep the overview concise.
- Suggested focus areas must be practical and non-prescriptive.
- If the available data does not support a pattern, do not invent one.
- Return only a JSON object matching the supplied schema.
- The supplied analyses may represent only a subset of all diary entries.
- When describing scope, say "analyzed entries" rather than implying that all diary entries were analyzed.
- Never say "every entry", "all entries", or equivalent unless the supplied data explicitly establishes that all entries in the period were analyzed.
              `.trim(),
            },

            {
              role: "user",

              content: `
Analyze the following structured diary-analysis data across multiple entries.

Identify recurring themes, observed cross-entry patterns, and useful focus areas.

DATA:

${JSON.stringify(
  input,
  null,
  2
)}
              `.trim(),
            },
          ],

          response_format: {
            type:
              "json_object",

            schema: {
              type:
                "object",

              properties: {
                overview: {
                  type:
                    "string",
                },

                recurringThemes: {
                  type:
                    "array",

                  items: {
                    type:
                      "object",

                    properties: {
                      theme: {
                        type:
                          "string",
                      },

                      evidence: {
                        type:
                          "array",

                        items: {
                          type:
                            "string",
                        },
                      },
                    },

                    required: [
                      "theme",
                      "evidence",
                    ],
                  },
                },

                observedPatterns: {
                  type:
                    "array",

                  items: {
                    type:
                      "string",
                  },
                },

                suggestedFocusAreas: {
                  type:
                    "array",

                  items: {
                    type:
                      "string",
                  },
                },
              },

              required: [
                "overview",
                "recurringThemes",
                "observedPatterns",
                "suggestedFocusAreas",
              ],
            },
          },
        }),

        cache: "no-store",
      }
    );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "Cohere diary trend synthesis failed:",
      response.status,
      responseText
    );

    if (
      response.status === 429
    ) {
      throw new Error(
        "The AI service is temporarily rate-limited."
      );
    }

    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 498
    ) {
      throw new Error(
        "The AI service could not authenticate the server."
      );
    }

    throw new Error(
      "The AI service could not synthesize diary trends."
    );
  }

  let responseData: unknown;

  try {
    responseData =
      JSON.parse(
        responseText
      );
  } catch {
    throw new Error(
      "The AI service returned an invalid response."
    );
  }

  const generatedText =
    (
      responseData as {
        message?: {
          content?: Array<{
            type?: string;
            text?: string;
          }>;
        };
      }
    ).message?.content?.find(
      (item) =>
        item.type === "text"
    )?.text;

  if (!generatedText) {
    throw new Error(
      "The AI service returned no diary trend synthesis."
    );
  }

  let generatedJson: unknown;

  try {
    generatedJson =
      JSON.parse(
        generatedText
      );
  } catch {
    throw new Error(
      "The AI returned invalid structured trend data."
    );
  }

  const validation =
    diaryTrendSynthesisSchema
      .safeParse(
        generatedJson
      );

  if (!validation.success) {
    console.error(
      "Invalid AI diary trend synthesis:",
      validation.error.flatten()
    );

    throw new Error(
      "The AI returned an invalid diary trend synthesis."
    );
  }

  return validation.data;
}

export async function transcribeAudio(
  audioFile: File,
  language = "en"
): Promise<CohereTranscriptionResult> {
  const apiKey =
    process.env.COHERE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "COHERE_API_KEY is not configured."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "model",
    "cohere-transcribe-03-2026"
  );

  formData.append(
    "language",
    language
  );

  /*
   * Keep file last.
   */
  formData.append(
    "file",
    audioFile
  );

  const response =
    await fetch(
      COHERE_API_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,
        },

        body: formData,
        cache: "no-store",
      }
    );

  const responseText =
    await response.text();

  let result:
    | {
        text?: string;
        message?: string;
      }
    | undefined;

  if (responseText) {
    try {
      result =
        JSON.parse(
          responseText
        );
    } catch {
      result = undefined;
    }
  }

  if (!response.ok) {
    console.error(
      "Cohere transcription failed:",
      response.status,
      responseText
    );

    if (response.status === 429) {
      throw new Error(
        "The transcription service is temporarily rate-limited."
      );
    }

    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 498
    ) {
      throw new Error(
        "The transcription service could not authenticate the server."
      );
    }

    throw new Error(
      result?.message ??
        "The transcription service rejected the recording."
    );
  }

  const transcript =
    result?.text?.trim();

  if (!transcript) {
    throw new Error(
      "The transcription service returned an empty transcript."
    );
  }

  return {
    text: transcript,
  };
}


export async function cleanDiaryContent(
  content: string
): Promise<CleanDiaryResult> {
  const apiKey =
    process.env.COHERE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "COHERE_API_KEY is not configured."
    );
  }

  const response = await fetch(
    COHERE_CHAT_API_URL,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model:
          COHERE_DIARY_MODEL,

        messages: [
          {
            role: "system",

            content: `
You are a diary editing assistant.

Your job is to clean and improve diary text while preserving the writer's original meaning and personal voice.

Rules:
- Correct punctuation, capitalization, spelling, and obvious grammar problems.
- Improve readability and paragraph structure.
- Remove speech filler such as "um", "uh", and accidental verbal repetitions when they add no meaning.
- Preserve names, people, places, events, dates, emotions, opinions, and factual details.
- Preserve first-person perspective.
- Do not summarize.
- Do not shorten meaningful content.
- Do not invent information.
- Do not add events, emotions, motivations, conclusions, or advice that the writer did not express.
- Do not make the writing unnecessarily formal.
- Do not analyze the writer.
- Do not provide recommendations.
- Do not add headings unless the original content clearly requires them.

Return JSON only according to the supplied schema.
            `.trim(),
          },

          {
            role: "user",

            content: `
Clean the following diary entry.

Generate a JSON object containing the cleanedContent field.

DIARY ENTRY:

${content}
            `.trim(),
          },
        ],

        response_format: {
          type: "json_object",

          schema: {
            type: "object",

            properties: {
              cleanedContent: {
                type: "string",
              },
            },

            required: [
              "cleanedContent",
            ],
          },
        },
      }),

      cache: "no-store",
    }
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "Cohere diary cleaning failed:",
      response.status,
      responseText
    );

    if (response.status === 429) {
      throw new Error(
        "The AI service is temporarily rate-limited."
      );
    }

    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 498
    ) {
      throw new Error(
        "The AI service could not authenticate the server."
      );
    }

    throw new Error(
      "The AI service could not clean the diary entry."
    );
  }

  let responseData: unknown;

  try {
    responseData =
      JSON.parse(responseText);
  } catch {
    throw new Error(
      "The AI service returned an invalid response."
    );
  }

  /*
   * Cohere Chat V2 places generated
   * text inside:
   *
   * message.content[0].text
   */
  const generatedText =
    (
      responseData as {
        message?: {
          content?: Array<{
            type?: string;
            text?: string;
          }>;
        };
      }
    ).message?.content?.find(
      (item) =>
        item.type === "text"
    )?.text;

  if (!generatedText) {
    throw new Error(
      "The AI service returned no cleaned diary content."
    );
  }

  let generatedJson: unknown;

  try {
    generatedJson =
      JSON.parse(generatedText);
  } catch {
    throw new Error(
      "The AI returned invalid structured diary content."
    );
  }

  const validation =
    cleanDiaryResultSchema.safeParse(
      generatedJson
    );

  if (!validation.success) {
    console.error(
      "Invalid AI diary cleaning result:",
      validation.error.flatten()
    );

    throw new Error(
      "The AI returned an invalid diary result."
    );
  }

  return validation.data;
}

export async function analyzeDiaryContent(
  content: string
): Promise<DiaryAnalysisResult> {
  const apiKey =
    process.env.COHERE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "COHERE_API_KEY is not configured."
    );
  }

  const response = await fetch(
    COHERE_CHAT_API_URL,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model:
          COHERE_DIARY_MODEL,

        temperature: 0,

        messages: [
          {
            role: "system",

            content: `
You are an AI diary analysis assistant.

Analyze personal diary content carefully and conservatively.

Your task is to identify useful information that is explicitly stated or reasonably supported by the diary entry.

Rules:

SUMMARY
- Produce a concise factual summary.
- Preserve the writer's perspective.
- Do not invent events or details.

MOOD
- Identify the dominant emotional tone expressed in the entry.
- Use a short mood label such as happy, calm, excited, frustrated, sad, anxious, tired, hopeful, mixed, or neutral.
- moodConfidence must be between 0 and 1.
- Confidence represents how clearly the diary text supports the mood classification.
- Use null for moodLabel and moodConfidence if there is insufficient evidence.

TOPICS
- Identify the main subjects or themes discussed.
- Keep each topic short.
- Do not invent topics.

IMPORTANT EVENTS
- Include concrete events that appear significant within the entry.
- Use an empty array when there are none.

ACTION ITEMS
- Include tasks, commitments, plans, or intended future actions explicitly stated or clearly implied by the writer.
- Do not invent obligations.
- Use an empty array when there are none.

RECOMMENDATIONS
- Provide practical, restrained suggestions only when clearly useful from the diary context.
- Do not diagnose medical or mental-health conditions.
- Do not present assumptions as facts.
- Do not give legal, medical, or financial professional advice.
- Recommendations should support reflection or practical next steps.
- Use an empty array when no useful recommendation is justified.

Return only a JSON object matching the supplied schema.
            `.trim(),
          },

          {
            role: "user",

            content: `
Analyze the following diary entry.

Generate a JSON object containing:
summary,
moodLabel,
moodConfidence,
topics,
importantEvents,
actionItems,
recommendations.

DIARY ENTRY:

${content}
            `.trim(),
          },
        ],

        response_format: {
          type: "json_object",

          schema: {
            type: "object",

            properties: {
              summary: {
                type: "string",
              },

              moodLabel: {
                type: [
                  "string",
                  "null",
                ],
              },

              moodConfidence: {
                type: [
                  "number",
                  "null",
                ],
              },

              topics: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              importantEvents: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              actionItems: {
                type: "array",
                items: {
                  type: "string",
                },
              },

              recommendations: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },

            required: [
              "summary",
              "moodLabel",
              "moodConfidence",
              "topics",
              "importantEvents",
              "actionItems",
              "recommendations",
            ],
          },
        },
      }),

      cache: "no-store",
    }
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "Cohere diary analysis failed:",
      response.status,
      responseText
    );

    if (response.status === 429) {
      throw new Error(
        "The AI service is temporarily rate-limited."
      );
    }

    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 498
    ) {
      throw new Error(
        "The AI service could not authenticate the server."
      );
    }

    throw new Error(
      "The AI service could not analyze the diary entry."
    );
  }

  let responseData: unknown;

  try {
    responseData =
      JSON.parse(responseText);
  } catch {
    throw new Error(
      "The AI service returned an invalid response."
    );
  }

  const generatedText =
    (
      responseData as {
        message?: {
          content?: Array<{
            type?: string;
            text?: string;
          }>;
        };
      }
    ).message?.content?.find(
      (item) =>
        item.type === "text"
    )?.text;

  if (!generatedText) {
    throw new Error(
      "The AI service returned no diary analysis."
    );
  }

  let generatedJson: unknown;

  try {
    generatedJson =
      JSON.parse(generatedText);
  } catch {
    throw new Error(
      "The AI returned invalid structured analysis."
    );
  }

  const validation =
    diaryAnalysisResultSchema.safeParse(
      generatedJson
    );

  if (!validation.success) {
    console.error(
      "Invalid AI diary analysis:",
      validation.error.flatten()
    );

    throw new Error(
      "The AI returned an invalid diary analysis."
    );
  }

  return validation.data;
}