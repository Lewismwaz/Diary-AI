import {
  NextResponse,
} from "next/server";

import {
  changePasswordSchema,
} from "@/domain/auth/account.schema";

import {
  requireAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  AccountNotFoundError,
  changeAccountPassword,
  IncorrectPasswordError,
  PasswordChangeConflictError,
  PasswordReuseError,
} from "@/services/account.service";

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
    /*
     * SECURITY:
     *
     * The account identity comes exclusively
     * from the authenticated session.
     *
     * We never accept userId from the client.
     */
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
      changePasswordSchema.safeParse(
        body
      );

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          error:
            "Please correct the password details.",

          issues:
            validation.error
              .issues,
        },
        {
          status: 400,
        }
      );
    }

    const {
      currentPassword,
      newPassword,
    } = validation.data;

    await changeAccountPassword({
      userId,
      currentPassword,
      newPassword,
    });

    return NextResponse.json({
      data: {
        message:
          "Password changed successfully.",
      },
    });
  } catch (error) {
    if (
      error instanceof
      IncorrectPasswordError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 400,
        }
      );
    }

    if (
      error instanceof
      PasswordReuseError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 400,
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

    if (error instanceof PasswordChangeConflictError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 409,
        }
      );
    }

    console.error(
      "PATCH /api/account/password failed:",
      getErrorMessage(
        error
      )
    );

    return NextResponse.json(
      {
        error:
          "Unable to change your password.",
      },
      {
        status: 500,
      }
    );
  }
}