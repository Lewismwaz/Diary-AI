import {
  NextResponse,
} from "next/server";

import {
  updateProfileSchema,
} from "@/domain/auth/account.schema";

import {
  requireAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  AccountNotFoundError,
  EmailAlreadyInUseError,
  updateAccountProfile,
} from "@/services/account.service";

import {
  unstable_update,
} from "@/auth";

function getErrorMessage(
  error: unknown
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Unknown server error";
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
      updateProfileSchema.safeParse(
        body
      );

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          error:
            "Please correct your account details.",

          issues:
            validation.error
              .issues,
        },
        {
          status: 400,
        }
      );
    }

    const profile =
      await updateAccountProfile({
        userId,
        ...validation.data,
      });

    /*
     * Refresh the JWT after PostgreSQL
     * has become authoritative.
     *
     * The jwt callback handles the
     * "update" trigger and reloads
     * trusted profile fields directly
     * from the database.
     */
    await unstable_update({});

    return NextResponse.json({
      data: profile,
    });
  } catch (error) {
    if (
      error instanceof
      EmailAlreadyInUseError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 409,
        }
      );
    }

    if (
      error instanceof
      AccountNotFoundError
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to locate your account.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "Authentication required."
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
      "PATCH /api/account/profile failed:",
      getErrorMessage(
        error
      )
    );

    return NextResponse.json(
      {
        error:
          "Unable to update your account.",
      },
      {
        status: 500,
      }
    );
  }
}