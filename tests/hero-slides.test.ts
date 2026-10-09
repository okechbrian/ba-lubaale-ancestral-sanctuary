import { describe, expect, it } from "vitest";
import {
  MAX_READ_MS,
  MIN_READ_MS,
  nextIndex,
  readMsFor,
  shouldAutoAdvance,
} from "@/lib/hero-slides";

/** The seven real hero bodies, copied verbatim from components/Hero.tsx. */
const BODIES = [
  "Three of the caves are open to guests: Nalubaale, Lubaale Musisi, and Lubaale Wanema. The rest are visited only after a calling.",
  "A full-time spring rises in the roots of the ancient tree, clean water used for cleansing before and after cave sessions.",
  "Fire burns on the shore most evenings. Evening conversation here, with the host and her people. The day is laid down before sleep.",
  "Guests learn to measure, cut, and sew bark cloth into garments, wall hangings, and talisman wraps. You weave it, sew it, and carry it home.",
  "Free-roaming goats and cows. Naturally fed. Goat bell at dusk.",
  "Online. Queen Nalubaale speaks, then there are questions. No class, no recording, no chat. The next one is 18 October 2026.",
  "Essential Healing Immersion. Master Transformation & Craft. Whole-Island Buyout. One household at a time. Private. Screened.",
];

describe("readMsFor", () => {
  it("never drops below the floor, however short the copy", () => {
    expect(readMsFor("")).toBe(MIN_READ_MS);
    expect(readMsFor("Goat bell at dusk.")).toBe(MIN_READ_MS);
    expect(readMsFor("Free-roaming goats and cows. Naturally fed. Goat bell at dusk.")).toBe(
      MIN_READ_MS,
    );
  });

  it("scales with the copy so the longest slide is not cut off", () => {
    // 25 words * 300ms + 1500ms = 9000ms, the cap.
    const longest = BODIES[3];
    expect(readMsFor(longest)).toBe(MAX_READ_MS);
    // The shortest real slide, 10 words, is 4500ms raw and so floors at 6000.
    expect(readMsFor(BODIES[4])).toBe(MIN_READ_MS);
    // A middle slide lands strictly between the two ends.
    const middle = readMsFor(BODIES[2]);
    expect(middle).toBeGreaterThan(MIN_READ_MS);
    expect(middle).toBeLessThan(MAX_READ_MS);
  });

  it("clamps both ends no matter how extreme the input", () => {
    expect(readMsFor("a")).toBe(MIN_READ_MS);
    expect(readMsFor("word ".repeat(400))).toBe(MAX_READ_MS);
  });

  it("grows monotonically with word count", () => {
    const short = readMsFor("one two three four five six seven eight nine ten");
    const long = readMsFor("word ".repeat(24).trim());
    expect(long).toBeGreaterThan(short);
  });

  it("gives every shipped slide a readable dwell", () => {
    for (const body of BODIES) {
      const ms = readMsFor(body);
      expect(ms).toBeGreaterThanOrEqual(MIN_READ_MS);
      expect(ms).toBeLessThanOrEqual(MAX_READ_MS);
      // Never faster than a comfortable 200 wpm reading pace.
      const words = body.split(/\s+/).filter(Boolean).length;
      expect(ms / words).toBeGreaterThanOrEqual(300);
    }
  });

  it("ignores runs of whitespace when counting", () => {
    expect(readMsFor("  spread   across\n\nlines  ")).toBe(readMsFor("spread across lines"));
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
});

describe("shouldAutoAdvance", () => {
  const base = {
    length: 5,
    reducedMotion: false,
    paused: false,
    hovered: false,
    focusWithin: false,
    hidden: false,
  };

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

  it("stops for the visitor, a resting pointer, or keyboard focus", () => {
    expect(shouldAutoAdvance({ ...base, paused: true })).toBe(false);
    expect(shouldAutoAdvance({ ...base, hovered: true })).toBe(false);
    expect(shouldAutoAdvance({ ...base, focusWithin: true })).toBe(false);
  });

  it("stops in a backgrounded tab so the clock does not run down unseen", () => {
    expect(shouldAutoAdvance({ ...base, hidden: true })).toBe(false);
  });

  it("resumes when every hold is released", () => {
    const held = { ...base, hovered: true, focusWithin: true, hidden: true };
    expect(shouldAutoAdvance(held)).toBe(false);
    expect(shouldAutoAdvance({ ...held, hovered: false })).toBe(false);
    expect(shouldAutoAdvance({ ...held, hovered: false, focusWithin: false })).toBe(false);
    expect(
      shouldAutoAdvance({ ...held, hovered: false, focusWithin: false, hidden: false }),
    ).toBe(true);
  });
});