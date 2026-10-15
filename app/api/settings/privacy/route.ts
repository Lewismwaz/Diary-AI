import {
  NextResponse,
} from "next/server";

import {
  privacySettingsSchema,
} from "@/domain/settings/privacy.schema";

import {
  requireAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  getPrivacySettings,
  updatePrivacySettings,
} from "@/services/privacy-settings.service";

function isAuthenticationError(
  error: unknown
): boolean {
  return (
    error instanceof Error &&
    error.message ===
      "Authentication required."
  );
}

export async function GET() {
  try {
    const userId =
      await requireAuthenticatedUserId();

    const settings =
      await getPrivacySettings(
        userId
      );

    return NextResponse.json({
      data: settings,
    });
  } catch (error) {
    if (
      isAuthenticationError(
        error
      )
    ) {
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

    console.error(
      "GET /api/settings/privacy failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load privacy settings.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    const userId =
      await requireAuthenticatedUserId();

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "The request body must contain valid JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const validation =
      privacySettingsSchema.safeParse(
        body
      );

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid privacy settings.",

          issues:
            validation.error
              .issues,
        },
        {
          status: 400,
        }
      );
    }

    const settings =
      await updatePrivacySettings(
        userId,
        validation.data
      );

    return NextResponse.json({
      data: settings,
    });
  } catch (error) {
    if (
      isAuthenticationError(
        error
      )
    ) {
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

    console.error(
      "PATCH /api/settings/privacy failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update privacy settings.",
      },
      {
        status: 500,
      }
    );
  }
}