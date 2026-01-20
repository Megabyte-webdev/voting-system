import crypto from "crypto";

export function hashBiometric(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
