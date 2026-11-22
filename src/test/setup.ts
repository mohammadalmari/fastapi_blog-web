import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Without Vitest's globals Testing Library can't register this itself, and
// one test's DOM would still be on the page for the next.
afterEach(cleanup);
