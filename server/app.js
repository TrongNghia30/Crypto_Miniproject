import express from "express";
import { fileURLToPath } from "node:url";
import {
  validateProcess,
  validateKeyRequest,
  ValidationError,
} from "../public/shared/validation.js";
import { transform } from "./ciphers.js";
import { generateKey } from "./keys.js";

export const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );
  if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "256kb" }));
app.post("/api/process", (req, res) => {
  const input = validateProcess(req.body);
  res.json({
    status: "success",
    result: transform(input),
    normalized_text: input.text,
    prepared_text: input.prepared,
    normalized_key: input.key,
  });
});
app.post("/api/generate_key", (req, res) => {
  const input = validateKeyRequest(req.body);
  res.json({ key: generateKey(input.cipher_type, input.text_length) });
});
app.use("/api", (req, res) =>
  res.status(404).json({
    status: "error",
    error: {
      code: "NOT_FOUND",
      message: "API không tồn tại.",
      field: "request",
    },
  }),
);
app.use(express.static(fileURLToPath(new URL("../public/", import.meta.url))));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = 500;
  let error = {
    code: "INTERNAL_ERROR",
    message: "Máy chủ không thể xử lý yêu cầu.",
    field: "request",
  };
  if (err instanceof ValidationError) {
    status = 400;
    error = { code: err.code, message: err.message, field: err.field };
  } else if (err.type === "entity.too.large") {
    status = 413;
    error = {
      code: "BODY_TOO_LARGE",
      message: "JSON body vượt quá 256 KB.",
      field: "request",
    };
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    error = {
      code: "INVALID_JSON",
      message: "JSON không hợp lệ.",
      field: "request",
    };
  }
  res.status(status).json({ status: "error", error });
});
