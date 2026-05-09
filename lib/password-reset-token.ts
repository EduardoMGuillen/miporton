import { createHash } from "crypto";

export function hashPasswordResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}
