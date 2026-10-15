import { NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  transcribeAudio,
} from "@/lib/cohere";

import {
  getPrivacySettings,
} from "@/services/privacy-settings.service";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE =
  25 * 1024 * 1024;

const SUPPORTED_TYPES =
  new Set([
    "audio/wav",
    "audio/x-wav",
  ]);

export async function POST(
  request: Request
) {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const privacySettings =
      await getPrivacySettings(
        userId
      );

    if (
      !privacySettings
        .allowVoiceTranscription
    ) {
      return NextResponse.json(
        {
          error:
            "Voice transcription is disabled in your Privacy & AI settings.",
          code:
            "VOICE_TRANSCRIPTION_DISABLED",
        },
        {
          status: 403,
        }
      );
    }

    let formData: FormData;

    try {
      formData =
        await request.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid transcription request.",
        },
        {
          status: 400,
        }
      );
    }

    const audio =
      formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          error:
            "An audio recording is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (audio.size === 0) {
      return NextResponse.json(
        {
          error:
            "The audio recording is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      audio.size >
      MAX_AUDIO_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "The audio recording exceeds the 25 MB limit.",
        },
        {
          status: 413,
        }
      );
    }

    const baseMimeType =
      audio.type
        .split(";")[0]
        .trim()
        .toLowerCase();

    if (
      !SUPPORTED_TYPES.has(
        baseMimeType
      )
    ) {
      return NextResponse.json(
        {
          error:
          "Unsupported audio format. A WAV recording is required.",
        },
        {
          status: 415,
        }
      );
    }

    const transcription =
      await transcribeAudio(
        audio,
        "en"
      );

    return NextResponse.json(
      {
        data: {
          transcript:
            transcription.text,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/transcribe failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to transcribe the recording.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}