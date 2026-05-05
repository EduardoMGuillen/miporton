import { randomInt } from "crypto";

const OTP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateResidentOneTimePassword(length = 10) {
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += OTP_ALPHABET[randomInt(0, OTP_ALPHABET.length)]!;
  }
  return value;
}