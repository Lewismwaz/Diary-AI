
import { z } from "zod";

import {
  passwordSchema,
} from "@/domain/auth/account.schema";

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(
    (data) =>
      data.newPassword ===
      data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    }
  );

export type ResetPasswordRequest =
  z.infer<typeof resetPasswordSchema>;
