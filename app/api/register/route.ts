import bcrypt from "bcryptjs";
import {
  NextResponse,
} from "next/server";

import {
  registerSchema,
} from "@/domain/auth/auth.schema";

import {
  prisma,
} from "@/lib/prisma";

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

export async function POST(
  request: Request
) {
  try {
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
      registerSchema.safeParse(
        body
      );

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          error:
            "Please correct the registration details.",

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
      firstName,
      lastName,
      email,
      password,
    } = validation.data;

    const existingUser =
      await prisma.user
        .findUnique({
          where: {
            email,
          },

          select: {
            id: true,
          },
        });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    const user =
      await prisma.user
        .create({
          data: {
            firstName,
            lastName,
            email,
            passwordHash,
          },

          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        });

    return NextResponse.json(
      {
        data: user,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/register failed:",
      getErrorMessage(
        error
      )
    );

    return NextResponse.json(
      {
        error:
          "Unable to create your account.",
      },
      {
        status: 500,
      }
    );
  }
}