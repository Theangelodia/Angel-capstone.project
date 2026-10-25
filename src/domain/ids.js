
import { randomBytes, randomUUID } from "node:crypto";

export function newId() {
  return randomUUID();
}

export function newReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "";

  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }

  return `BK-${code}`;
}
