import crypto from "crypto";

export function generateRandomToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildTokenExpiry(minutesFromNow = 60) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}
