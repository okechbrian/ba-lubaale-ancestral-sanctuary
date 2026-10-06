import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      // Tests run outside React's server condition; use the marker's empty
      // module (same file Next resolves via the "react-server" export).
      {
        find: /^server-only$/,
        replacement: path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
      },
      { find: "@", replacement: path.resolve(import.meta.dirname) },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
