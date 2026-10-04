import express from "express";
import { fileURLToPath } from "node:url";
import { createApiApp } from "./api.js";

export const app = createApiApp({
  staticMiddleware: express.static(
    fileURLToPath(new URL("../public/", import.meta.url)),
  ),
});
