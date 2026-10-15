import { z } from "zod";
import {
  passwordSchema,
} from "@/domain/auth/account.schema";


const nameSchema = z
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

export const registerSchema = z
  .object({
    firstName:
      nameSchema,

    lastName:
      nameSchema,

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

    password:
      passwordSchema,

    confirmPassword:
      z.string(),
  })
  .refine(
    (data) =>
      data.password ===
      data.confirmPassword,
    {
      message:
        "Passwords do not match.",
      path: [
        "confirmPassword",
      ],
    }
  );

export const loginSchema =
  z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(
        "Enter a valid email address."
      ),

    password: z
      .string()
      .min(
        1,
        "Password is required."
      )
      .max(128),
  });

export type RegisterRequest =
  z.infer<
    typeof registerSchema
  >;

export type LoginRequest =
  z.infer<
    typeof loginSchema
  >;