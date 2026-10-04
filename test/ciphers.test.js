import test from "node:test";
import assert from "node:assert/strict";
import { validateProcess } from "../public/shared/validation.js";
import {
  normalizeText,
  preparePlayfair,
  playfairMatrix,
  ALPHABET,
} from "../public/shared/normalize.js";
import { transform } from "../server/ciphers.js";
import { generateKey } from "../server/keys.js";

const run = (cipher_type, text, key, mode = "encrypt") => {
  const input = validateProcess({ cipher_type, text, key, mode });
  return { result: transform(input), input };
};
const vectors = [
  ["caesar", "HELLO", "3", "KHOOR"],
  ["mono", "ABCXYZ", "ZYXWVUTSRQPONMLKJIHGFEDCBA", "ZYXCBA"],
  ["rail", "WEAREDISCOVEREDFLEEATONCE", "3", "WECRLTEERDSOEEFEAOCAIVDEN"],
  ["vigenere", "ATTACKATDAWN", "LEMON", "LXFOPVEFRNHR"],
  [
    "playfair",
    "HIDETHEGOLDINTHETREESTUMP",
    "PLAYFAIREXAMPLE",
    "BMODZBXDNABEKUDMUIXMMOUVIF",
  ],
  ["otp", "HELLO", "XMCKL", "EQNVZ"],
];

for (const [cipher, text, key, expected] of vectors) {
  test(`${cipher}: known encryption and decryption vector`, () => {
    const encrypted = run(cipher, text, key);
    assert.equal(encrypted.result, expected);
    assert.equal(
      run(cipher, expected, key, "decrypt").result,
      encrypted.input.prepared,
    );
  });
}

test("Vietnamese normalization including composed/decomposed accents and Đ", () => {
  assert.equal(normalizeText("Đặng Thị Nghĩa, số 123!"), "DANGTHINGHIASO");
  assert.equal(normalizeText("đặng"), "DANG");
  assert.equal(
    run("caesar", "Xin chào, Đạt!", "-23").result,
    run("caesar", "XINCHAODAT", "3").result,
  );
  assert.equal(run("vigenere", "Xin chào", "bí mật").input.key, "BIMAT");
});

test("Caesar negative, wrapping and safe integer boundaries", () => {
  assert.equal(run("caesar", "ABC", "-1").result, "ZAB");
  assert.equal(run("caesar", "ABC", "26").result, "ABC");
  assert.equal(run("caesar", "Z", "+1").result, "A");
  assert.equal(run("caesar", "A", "9007199254740991").result, "F");
});

test("Playfair preparation and matrix rules", () => {
  assert.equal(preparePlayfair("BALLOON"), "BALXLOON");
  assert.equal(preparePlayfair("XX"), "XQXQ");
  assert.equal(preparePlayfair("X"), "XQ");
  assert.equal(preparePlayfair("ABC"), "ABCX");
  const matrix = playfairMatrix("MONARCHY");
  assert.equal(matrix, "MONARCHYBDEFGIKLPQSTUVWXZ");
  assert.equal(matrix.length, 25);
  for (const sample of [
    "BALLOON",
    "XX",
    "X",
    "JIG",
    "AAAAA",
    "AXA",
    "HELLOX",
  ]) {
    const encrypted = run("playfair", sample, "MONARCHY");
    assert.equal(
      run("playfair", encrypted.result, "MONARCHY", "decrypt").result,
      encrypted.input.prepared,
    );
  }
  // MONARCHY: same row MO→ON, same column MC→CE, rectangle MH→OC.
  assert.equal(run("playfair", "MO", "MONARCHY").result, "ON");
  assert.equal(run("playfair", "MC", "MONARCHY").result, "CE");
  assert.equal(run("playfair", "MH", "MONARCHY").result, "OC");
});

test("Rail Fence round trips at many lengths, including rails >= length", () => {
  for (const length of [1, 2, 3, 10, 31, 100, 10_000]) {
    const text = ALPHABET.repeat(Math.ceil(length / 26)).slice(0, length);
    for (const rails of [2, 3, 7, 1000]) {
      const encrypted = run("rail", text, String(rails)).result;
      assert.equal(
        run("rail", encrypted, String(rails), "decrypt").result,
        text,
      );
      if (rails >= length) assert.equal(encrypted, text);
    }
  }
});

test("All substitutions round-trip with nontrivial deterministic samples", () => {
  for (let length = 1; length <= 80; length++) {
    const text = Array.from(
      { length },
      (_, i) => ALPHABET[(i * 11 + length) % 26],
    ).join("");
    for (const [cipher, key] of [
      ["caesar", "-917"],
      ["mono", "QWERTYUIOPASDFGHJKLZXCVBNM"],
      ["vigenere", "SECRET"],
      ["playfair", "MONARCHY"],
      ["otp", generateKey("otp", length)],
    ]) {
      const encrypted = run(cipher, text, key);
      assert.equal(
        run(cipher, encrypted.result, key, "decrypt").result,
        encrypted.input.prepared,
      );
    }
  }
});

test("Random keys are valid permutations or exact OTP lengths", () => {
  for (let i = 0; i < 30; i++) {
    const key = generateKey("mono");
    assert.equal([...key].sort().join(""), ALPHABET);
  }
  for (const length of [1, 17, 10_000]) {
    const key = generateKey("otp", length);
    assert.equal(key.length, length);
    assert.match(key, /^[A-Z]+$/);
  }
});

test("Reject invalid keys, modes, algorithms and normalized empty text", () => {
  const invalid = [
    ["caesar", "ABC", "3abc"],
    ["caesar", "ABC", "1.5"],
    ["caesar", "ABC", "1e2"],
    ["caesar", "ABC", "9007199254740992"],
    ["caesar", "ABC", ""],
    ["mono", "ABC", "ABC"],
    ["mono", "ABC", "A".repeat(26)],
    ["rail", "ABC", "1"],
    ["rail", "ABC", "1001"],
    ["rail", "ABC", "2.5"],
    ["vigenere", "ABC", "123"],
    ["playfair", "ABC", ""],
    ["playfair", "ABC", "KEY", "decrypt"],
    ["otp", "HELLO", "XMCK"],
    ["otp", "HELLO", "XMCKLA"],
    ["caesar", "123!🙂", "3"],
    ["unknown", "ABC", "3"],
    ["caesar", "ABC", "3", "oops"],
  ];
  for (const args of invalid) assert.throws(() => run(...args));
  assert.throws(() =>
    validateProcess({
      cipher_type: "caesar",
      text: 123,
      key: "3",
      mode: "encrypt",
    }),
  );
  assert.throws(() =>
    validateProcess({
      cipher_type: "caesar",
      text: "ABC",
      key: 3,
      mode: "encrypt",
    }),
  );
});

test("Enforce raw, normalized and Playfair prepared lengths", () => {
  assert.throws(() => run("caesar", " ".repeat(10_001) + "A", "3"));
  assert.throws(() => run("vigenere", "A", "K".repeat(10_001)));
  assert.throws(() => run("caesar", "ß".repeat(6000), "3"));
  assert.throws(() => run("vigenere", "A", "ß".repeat(6000)));
  assert.throws(() => run("playfair", "A".repeat(5001), "KEY"));
  assert.equal(run("playfair", "A".repeat(5000), "KEY").result.length, 10_000);
  assert.equal(run("caesar", "A".repeat(10_000), "3").result.length, 10_000);
});
