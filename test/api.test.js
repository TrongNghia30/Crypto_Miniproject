import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../server/app.js";

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
for (const [cipher_type, text, key, expected] of vectors) {
  test(`API ${cipher_type}: encryption/decryption metadata`, async () => {
    const response = await request(app)
      .post("/api/process")
      .send({ cipher_type, text, key, mode: "encrypt" })
      .expect(200);
    assert.equal(response.body.result, expected);
    assert.equal(response.body.status, "success");
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.body.normalized_text, text);
    const decrypted = await request(app)
      .post("/api/process")
      .send({ cipher_type, text: expected, key, mode: "decrypt" })
      .expect(200);
    assert.equal(decrypted.body.result, response.body.prepared_text);
  });
}

test("API returns field errors and rejects all invalid envelopes", async () => {
  const base = {
    cipher_type: "caesar",
    text: "ABC",
    key: "3",
    mode: "encrypt",
  };
  for (const [patch, field] of [
    [{ cipher_type: "bad" }, "cipher_type"],
    [{ mode: "bad" }, "mode"],
    [{ text: "!" }, "text"],
    [{ text: 3 }, "text"],
    [{ key: 3 }, "key"],
    [{ key: "3abc" }, "key"],
    [{ text: "A".repeat(10001) }, "text"],
    [{ key: "3".repeat(10001) }, "key"],
    [{ cipher_type: "otp", text: "HELLO", key: "XMCKLA" }, "key"],
    [
      { cipher_type: "playfair", mode: "decrypt", key: "KEY", text: "ABC" },
      "text",
    ],
  ]) {
    const response = await request(app)
      .post("/api/process")
      .send({ ...base, ...patch })
      .expect(400);
    assert.equal(response.body.error.field, field);
    assert.equal(response.body.status, "error");
    assert.equal(typeof response.body.error.message, "string");
  }
  for (const body of [{}, [], null])
    await request(app).post("/api/process").send(body).expect(400);
});

test("Key generation validates lengths and supports only mono/otp", async () => {
  const mono = await request(app)
    .post("/api/generate_key")
    .send({ cipher_type: "mono" })
    .expect(200);
  assert.equal(new Set(mono.body.key).size, 26);
  const otp = await request(app)
    .post("/api/generate_key")
    .send({ cipher_type: "otp", text_length: 10000 })
    .expect(200);
  assert.equal(otp.body.key.length, 10000);
  for (const text_length of [0, -1, 1.5, 10001, "5", null]) {
    await request(app)
      .post("/api/generate_key")
      .send({ cipher_type: "otp", text_length })
      .expect(400);
  }
  await request(app)
    .post("/api/generate_key")
    .send({ cipher_type: "caesar" })
    .expect(400);
});

test("Malformed, oversized JSON and unknown API return structured errors", async () => {
  const malformed = await request(app)
    .post("/api/process")
    .set("Content-Type", "application/json")
    .send("{oops")
    .expect(400);
  assert.equal(malformed.body.error.code, "INVALID_JSON");
  const oversized = await request(app)
    .post("/api/process")
    .send({ text: "A".repeat(270000) })
    .expect(413);
  assert.equal(oversized.body.error.code, "BODY_TOO_LARGE");
  const missing = await request(app).get("/api/missing").expect(404);
  assert.equal(missing.body.error.code, "NOT_FOUND");
});

test("Express serves UI and shared modules with security headers", async () => {
  const page = await request(app).get("/").expect(200);
  assert.match(page.text, /Crypto Lab/);
  assert.match(page.headers["content-security-policy"], /script-src 'self'/);
  await request(app).get("/shared/normalize.js").expect(200);
  await request(app).get("/.env").expect(404);
});
