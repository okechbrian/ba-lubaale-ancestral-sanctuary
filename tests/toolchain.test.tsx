// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

/**
 * Toolchain smoke test.
 *
 * This file exists to prove the component-testing setup actually works before
 * any real component test depends on it. It asserts three things that could
 * each fail independently under Vitest 5 + React 19:
 *
 *  1. the per-file `@vitest-environment jsdom` docblock still opts a single
 *     file out of the project-wide `environment: "node"` (Vitest 5 removed
 *     `environmentMatchGlobs`, so this docblock is the supported mechanism),
 *  2. TSX in a test file transforms and renders without a @vitejs/plugin-react,
 *     relying on Vite's esbuild JSX plus tsconfig's `jsx: react-jsx`,
 *  3. React state updates settle so assertions see the committed DOM.
 *
 * Interactions must use fireEvent rather than a bare element.click(); see the
 * note on the third case.
 *
 * If any of those regress, this test fails loudly instead of a dozen admin
 * tests failing confusingly later.
 */
function Counter() {
  const [n, setN] = useState(0);
  return (
    <div>
      <p>count is {n}</p>
      <button type="button" onClick={() => setN((value) => value + 1)}>
        increment
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe("component test toolchain", () => {
  it("runs in a DOM, not in node", () => {
    // Proves the docblock took effect: `document` only exists under jsdom.
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });

  it("renders TSX and asserts on text", () => {
    render(<Counter />);
    expect(screen.getByText("count is 0")).toBeTruthy();
  });

  it("commits state updates so post-interaction assertions are reliable", () => {
    render(<Counter />);
    // fireEvent, not a bare element.click(): React 19 needs the update wrapped
    // in act(), and RTL's fireEvent does that. A native .click() dispatches a
    // real DOM event that React processes outside act, so the state update is
    // not flushed when the assertion runs. Every interaction in the admin
    // component tests must go through fireEvent for the same reason.
    fireEvent.click(screen.getByRole("button", { name: "increment" }));
    expect(screen.getByText("count is 1")).toBeTruthy();
  });
});