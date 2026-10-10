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
    // `node` stays the default so the 39 existing suites (including the
    // integrity tests that talk to a real Postgres) keep running exactly as
    // they did. Component tests opt into a DOM per FILE with
    //
    //   // @vitest-environment jsdom
    //
    // on the first line. Vitest 5 removed `environmentMatchGlobs`, so a
    // per-file docblock is the supported way to mix both environments in one
    // project; a global flip to jsdom would risk every existing suite.
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
