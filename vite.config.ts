/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";

import { SECURITY_HEADERS } from "./security-headers.ts";

// The app always calls the API on its own origin. Here the dev and preview
// servers pass those paths on, so there is no CORS and the API's
// SameSite=Strict refresh cookie is sent. The Host header is left alone:
// the API compares it with the browser's Origin on the cookie routes.
const apiTarget = process.env.API_URL ?? "http://127.0.0.1:8000";
const proxy = {
  "/api": apiTarget,
  "/media": apiTarget,
  "/health": apiTarget,
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before react(), or routes are not generated or split.
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      quoteStyle: "double",
      semicolons: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: { proxy },
  // The headers production must send, so the browser tests run under them.
  preview: { proxy, headers: SECURITY_HEADERS },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "security-headers.test.ts"],
  },
});
