import {
  ALPHABET,
  mod,
  playfairMatrix,
  railAt,
} from "../public/shared/normalize.js";

const value = (char) => char.charCodeAt(0) - 65;
const shifted = (char, shift) => ALPHABET[mod(value(char) + shift)];

export function caesar(text, key, mode) {
  const shift = Number(key) * (mode === "encrypt" ? 1 : -1);
  return [...text].map((char) => shifted(char, shift)).join("");
}

export function mono(text, key, mode) {
  return [...text]
    .map((char) =>
      mode === "encrypt" ? key[value(char)] : ALPHABET[key.indexOf(char)],
    )
    .join("");
}

export function polyalphabetic(text, key, mode) {
  const sign = mode === "encrypt" ? 1 : -1;
  return [...text]
    .map((char, i) => shifted(char, sign * value(key[i % key.length])))
    .join("");
}

export function rail(text, key, mode) {
  const rails = Number(key);
  if (rails >= text.length) return text;
  if (mode === "encrypt") {
    const buckets = Array.from({ length: rails }, () => []);
    for (let i = 0; i < text.length; i++)
      buckets[railAt(i, rails)].push(text[i]);
    return buckets.map((bucket) => bucket.join("")).join("");
  }
  const counts = Array(rails).fill(0);
  for (let i = 0; i < text.length; i++) counts[railAt(i, rails)]++;
  let offset = 0;
  const cursors = counts.map((count) => {
    const start = offset;
    offset += count;
    return start;
  });
  return Array.from(
    { length: text.length },
    (_, i) => text[cursors[railAt(i, rails)]++],
  ).join("");
}

export function playfair(text, key, mode) {
  const matrix = playfairMatrix(key);
  const sign = mode === "encrypt" ? 1 : -1;
  const result = [];
  for (let i = 0; i < text.length; i += 2) {
    const a = matrix.indexOf(text[i]);
    const b = matrix.indexOf(text[i + 1]);
    const ar = Math.floor(a / 5),
      ac = a % 5;
    const br = Math.floor(b / 5),
      bc = b % 5;
    if (ar === br)
      result.push(
        matrix[ar * 5 + mod(ac + sign, 5)],
        matrix[br * 5 + mod(bc + sign, 5)],
      );
    else if (ac === bc)
      result.push(
        matrix[mod(ar + sign, 5) * 5 + ac],
        matrix[mod(br + sign, 5) * 5 + bc],
      );
    else result.push(matrix[ar * 5 + bc], matrix[br * 5 + ac]);
  }
  return result.join("");
}

export function transform({ cipher, prepared, key, mode }) {
  const algorithms = {
    caesar,
    mono,
    rail,
    vigenere: polyalphabetic,
    playfair,
    otp: polyalphabetic,
  };
  return algorithms[cipher](prepared, key, mode);
}
