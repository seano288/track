import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  // Relative base so the built site works from a GitHub Pages subpath.
  base: "./",
  test: {
    // The suite covers pure parsing/aggregation logic, so no DOM is needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
