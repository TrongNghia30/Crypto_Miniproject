import { randomInt } from "node:crypto";
import { ALPHABET } from "../public/shared/normalize.js";

export function generateKey(cipher, length) {
  if (cipher === "otp")
    return Array.from({ length }, () => ALPHABET[randomInt(26)]).join("");
  const letters = [...ALPHABET];
  for (let i = letters.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join("");
}
