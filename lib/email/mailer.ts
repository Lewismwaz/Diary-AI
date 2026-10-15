import "server-only";

import { createMailTransport } from "./smtp-transport";

export { createMailTransport };

export async function sendRecoveryOtpEmail(
  recipient: string,
  code: string
): Promise<void> {
  const user = process.env.SMTP_USER;

  if (!user) {
    throw new Error("SMTP_USER is not configured.");
  }

  const transporter = createMailTransport();

  await transporter.sendMail({
    from: {
      name: process.env.SMTP_FROM_NAME ?? "Diary AI",
      address: user,
    },
    to: recipient,
    subject: "Diary AI — Account Recovery Verification",
    text: [
      "Your Diary AI account recovery verification code is:",
      "",
      code,
      "",
      "This code expires in 10 minutes.",
      "",
      "If you did not request account recovery,",
      "you can ignore this message.",
    ].join("\n"),
  });
}