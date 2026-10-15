import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(
    8,
    "Password must contain at least 8 characters."
  )
  .max(
    128,
    "Password cannot exceed 128 characters."
  )
  .regex(
    /[A-Z]/,
    "Password must contain an uppercase letter."
  )
  .regex(
    /[a-z]/,
    "Password must contain a lowercase letter."
  )
  .regex(
    /[0-9]/,
    "Password must contain a number."
  );

const profileNameSchema = z
  .string()
  .trim()
  .min(
    2,
    "Must contain at least 2 characters."
  )
  .max(
    60,
    "Cannot exceed 60 characters."
  );

export const updateProfileSchema =
  z.object({
    firstName:
      profileNameSchema,

    lastName:
      profileNameSchema,

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(
        "Enter a valid email address."
      )
      .max(
        320,
        "Email address is too long."
      ),
  });

export type UpdateProfileRequest =
  z.infer<
    typeof updateProfileSchema
  >;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(
        1,
        "Current password is required."
      )
      .max(
        128,
        "Current password is too long."
      ),

    newPassword:
      passwordSchema,

    confirmPassword:
      z.string(),
  })
  .refine(
    (data) =>
      data.newPassword ===
      data.confirmPassword,
    {
      message:
        "Passwords do not match.",
      path: [
        "confirmPassword",
      ],
    }
  )
  .refine(
    (data) =>
      data.currentPassword !==
      data.newPassword,
    {
      message:
        "Your new password must be different from your current password.",
      path: [
        "newPassword",
      ],
    }
  );

export type ChangePasswordRequest =
  z.infer<
    typeof changePasswordSchema
  >;