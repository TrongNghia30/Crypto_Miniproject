import {
  MAX_LENGTH,
  normalizeText,
  preparePlayfair,
  mod,
} from "./normalize.js";

export class ValidationError extends Error {
  constructor(message, field = "request", code = "INVALID_INPUT") {
    super(message);
    this.field = field;
    this.code = code;
  }
}

export const CIPHER_IDS = [
  "caesar",
  "mono",
  "rail",
  "vigenere",
  "playfair",
  "otp",
];
const fail = (message, field, code) => {
  throw new ValidationError(message, field, code);
};

function boundedString(value, field) {
  if (typeof value !== "string") fail("Giá trị phải là chuỗi.", field);
  if (value.length > MAX_LENGTH)
    fail("Tối đa 10.000 ký tự.", field, "TOO_LONG");
  return value;
}

function integerKey(value) {
  if (
    !/^[+-]?\d+$/.test(value.trim()) ||
    !Number.isSafeInteger(Number(value))
  ) {
    fail("Khóa phải là số nguyên an toàn, không chứa ký tự khác.", "key");
  }
  return Number(value);
}

export function validateProcess(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    fail("Yêu cầu JSON không hợp lệ.");
  const { cipher_type: cipher, mode } = body;
  if (!CIPHER_IDS.includes(cipher))
    fail("Thuật toán không hợp lệ.", "cipher_type");
  if (!["encrypt", "decrypt"].includes(mode))
    fail("Chế độ không hợp lệ.", "mode");
  let text = normalizeText(boundedString(body.text, "text"));
  const rawKey = boundedString(body.key, "key");
  if (!text)
    fail(
      "Văn bản phải có ít nhất một chữ cái sau chuẩn hóa.",
      "text",
      "EMPTY_TEXT",
    );
  if (text.length > MAX_LENGTH)
    fail("Văn bản chuẩn hóa vượt quá 10.000 ký tự.", "text", "TOO_LONG");
  let key;
  if (cipher === "caesar" || cipher === "rail") {
    const number = integerKey(rawKey);
    if (cipher === "rail" && (number < 2 || number > 1000))
      fail("Số rail phải từ 2 đến 1000.", "key");
    key = String(cipher === "caesar" ? mod(number) : number);
  } else {
    key = normalizeText(rawKey);
    if (key.length > MAX_LENGTH)
      fail("Khóa chuẩn hóa vượt quá 10.000 ký tự.", "key", "TOO_LONG");
    if (!key) fail("Khóa phải có ít nhất một chữ cái sau chuẩn hóa.", "key");
    if (cipher === "mono" && (key.length !== 26 || new Set(key).size !== 26)) {
      fail("Khóa phải chứa đủ 26 chữ cái A–Z, mỗi chữ đúng một lần.", "key");
    }
    if (cipher === "otp" && key.length !== text.length) {
      fail(
        `Khóa OTP phải có đúng ${text.length} chữ cái, bằng độ dài văn bản.`,
        "key",
      );
    }
  }
  if (cipher === "playfair") {
    text = text.replace(/J/g, "I");
    key = key.replace(/J/g, "I");
    if (mode === "decrypt" && text.length % 2)
      fail("Bản mã Playfair phải có độ dài chẵn.", "text");
  }
  const prepared =
    cipher === "playfair" && mode === "encrypt" ? preparePlayfair(text) : text;
  if (prepared.length > MAX_LENGTH) {
    fail(
      "Văn bản Playfair sau thêm ký tự đệm vượt quá 10.000 ký tự.",
      "text",
      "TOO_LONG",
    );
  }
  return { cipher, mode, text, key, prepared };
}

export function validateKeyRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    fail("Yêu cầu JSON không hợp lệ.");
  if (!["mono", "otp"].includes(body.cipher_type))
    fail("Chỉ Monoalphabetic và OTP hỗ trợ tạo khóa.", "cipher_type");
  if (
    body.cipher_type === "otp" &&
    (!Number.isInteger(body.text_length) ||
      body.text_length < 1 ||
      body.text_length > MAX_LENGTH)
  ) {
    fail("Độ dài khóa OTP phải là số nguyên từ 1 đến 10.000.", "text_length");
  }
  return body;
}
