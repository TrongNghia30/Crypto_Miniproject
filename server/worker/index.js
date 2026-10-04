import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import { createApiApp } from "../api.js";

// The exact Express API is reused in the hosted runtime; no cipher duplication.
const apiHandler = httpServerHandler(createServer(createApiApp()));

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (path === "/api" || path.startsWith("/api/")) {
      return apiHandler.fetch(request, env, ctx);
    }
    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    return response;
  },
};
