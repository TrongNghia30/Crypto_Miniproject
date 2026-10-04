export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const MAX_LENGTH = 10_000;

export function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export const mod = (n, base = 26) => ((n % base) + base) % base;

export function playfairMatrix(key) {
  return [...new Set(key.replace(/J/g, "I") + ALPHABET.replace("J", ""))].join(
    "",
  );
}

export function preparePlayfair(text) {
  const pairs = [];
  for (let i = 0; i < text.length;) {
    const a = text[i];
    const b = text[i + 1];
    if (!b || a === b) {
      pairs.push(a + (a === "X" ? "Q" : "X"));
      i += 1;
    } else {
      pairs.push(a + b);
      i += 2;
    }
  }
  return pairs.join("");
}

// Rail at a given index; no rails × textLength matrix is needed.
export function railAt(index, rails) {
  const phase = index % (2 * (rails - 1));
  return phase < rails ? phase : 2 * (rails - 1) - phase;
}
