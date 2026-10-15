import { z } from "zod";

export const GOOGLE_DISCONNECT_CONFIRMATION =
  "DISCONNECT GOOGLE DRIVE" as const;

export const googleDisconnectRequestSchema =
  z.object({
    confirmation:
      z.literal(
        GOOGLE_DISCONNECT_CONFIRMATION
      ),
  });