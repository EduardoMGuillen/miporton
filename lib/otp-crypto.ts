import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getOtpSecretKey() {
  const secret = process.env.AUTH_SECRET ?? "change-this-in-production-mivisita-secret";
  return createHash("sha256").update(secret).digest();
}

export function encryptOtp(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getOtpSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptOtp(cipherText: string) {
  const payload = Buffer.from(cipherText, "base64");
  if (payload.length < 29) {
    throw new Error("OTP cifrada invalida.");
  }

  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getOtpSecretKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}