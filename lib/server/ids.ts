import { randomBytes, randomUUID } from "crypto";

// Room codes are short and easy to type; ambiguous characters removed.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(length = 4): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/** Unguessable internal id / session token. */
export function makeToken(): string {
  return randomBytes(24).toString("base64url");
}

export function makeId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
