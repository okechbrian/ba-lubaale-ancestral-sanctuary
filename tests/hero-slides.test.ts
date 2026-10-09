import { describe, expect, it } from "vitest";
import { SLIDE_MS, nextIndex, shouldAutoAdvance } from "@/lib/hero-slides";

describe("SLIDE_MS", () => {
  it("holds each slide for six seconds", () => {
    expect(SLIDE_MS).toBe(6000);
  });
});

describe("nextIndex", () => {
  it("advances one slide at a time", () => {
    expect(nextIndex(0, 5)).toBe(1);
    expect(nextIndex(3, 5)).toBe(4);
  });

  it("wraps the last slide back to the first so the cycle never dead-ends", () => {
    expect(nextIndex(4, 5)).toBe(0);
    expect(nextIndex(1, 2)).toBe(0);
  });

  it("cannot advance a list of one or empty", () => {
    expect(nextIndex(0, 1)).toBe(0);
    expect(nextIndex(0, 0)).toBe(0);
    expect(nextIndex(3, 1)).toBe(0);
  });

  it("visits every slide of a full cycle exactly once", () => {
    const length = 5;
    const seen = new Set<number>();
    let i = 0;
    for (let step = 0; step < length; step += 1) {
      seen.add(i);
      i = nextIndex(i, length);
    }
    expect(seen.size).toBe(length);
    expect(i).toBe(0);
  });
});

describe("shouldAutoAdvance", () => {
  const base = { length: 5, reducedMotion: false, hovered: false, visible: true };

  it("runs when nothing is holding it back", () => {
    expect(shouldAutoAdvance(base)).toBe(true);
  });

  it("never runs with nothing to advance to", () => {
    expect(shouldAutoAdvance({ ...base, length: 1 })).toBe(false);
    expect(shouldAutoAdvance({ ...base, length: 0 })).toBe(false);
  });

  it("honours reduced motion ahead of everything else", () => {
    expect(shouldAutoAdvance({ ...base, reducedMotion: true })).toBe(false);
  });

  it("stops for a resting pointer, so the copy is not swapped under a cursor", () => {
    expect(shouldAutoAdvance({ ...base, hovered: true })).toBe(false);
  });

  it("stops when the hero is out of sight", () => {
    expect(shouldAutoAdvance({ ...base, visible: false })).toBe(false);
  });

  it("resumes when every hold is released", () => {
    const held = { ...base, hovered: true, visible: false, reducedMotion: true };
    expect(shouldAutoAdvance(held)).toBe(false);
    expect(shouldAutoAdvance({ ...held, reducedMotion: false })).toBe(false);
    expect(shouldAutoAdvance({ ...held, reducedMotion: false, visible: true })).toBe(false);
    expect(
      shouldAutoAdvance({ ...held, reducedMotion: false, visible: true, hovered: false }),
    ).toBe(true);
  });
});