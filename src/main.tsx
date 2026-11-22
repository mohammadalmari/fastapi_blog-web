import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { RouterProvider } from "@tanstack/react-router";

import { setupApiClient } from "@/api/client";

import { ThemeProvider } from "@/components/theme-provider";

import "./index.css";

import { createAppRouter } from "./router";

setupApiClient();
const router = createAppRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>
);
