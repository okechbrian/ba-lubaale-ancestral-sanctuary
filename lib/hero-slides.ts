/**
 * Hero slide rotation.
 *
 * The hero advances its own copy on a timer. These helpers hold the parts
 * that can be reasoned about without a DOM or a clock, so the timing rules
 * are pinned by unit tests rather than by timing out a real component.
 *
 * Timing follows the length of the copy rather than a single global value:
 * the seven bodies run from 10 to 25 words, and a fixed five or six seconds
 * tore the 25-word Atelier slide away mid-sentence. Three hundred
 * milliseconds a word is roughly 200 wpm, plus a beat to let the eye land,
 * then clamped so no slide flashes past and no slide outstays its welcome.
 */

/** Shortest a slide may stay up, in milliseconds. */
export const MIN_READ_MS = 6000;

/** Longest a slide may stay up, in milliseconds. */
export const MAX_READ_MS = 9000;

/** Allowable pause per word, about 200 wpm. */
const MS_PER_WORD = 300;

/** Settling time before the next slide arrives. */
const SETTLE_MS = 1500;

function countWords(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}

/**
 * How long a slide body should stay up. Scaled to the copy and clamped to
 * both ends, so the shortest slide still gets a readable beat and the
 * longest still gets read to the end.
 */
export function readMsFor(body: string): number {
  const raw = countWords(body) * MS_PER_WORD + SETTLE_MS;
  return Math.min(MAX_READ_MS, Math.max(MIN_READ_MS, raw));
}

/**
 * The slide after `index`, wrapping the last back to the first so the cycle
 * never dead-ends on a still hero. Returns 0 for a list that cannot advance.
 */
export function nextIndex(index: number, length: number): number {
  if (length <= 1) return 0;
  return (index + 1) % length;
}

/**
 * Whether the hero may move on its own. A single-slide list has nothing to
 * advance to, and every other pause is the caller's business: reduced
 * motion, the visitor's pause, a resting pointer or keyboard focus inside
 * the hero, and a backgrounded tab that must not run the clock down while
 * nobody is looking at it.
 */
export function shouldAutoAdvance(options: {
  length: number;
  reducedMotion: boolean;
  paused: boolean;
  hovered: boolean;
  focusWithin: boolean;
  hidden: boolean;
}): boolean {
  return (
    options.length > 1 &&
    !options.reducedMotion &&
    !options.paused &&
    !options.hovered &&
    !options.focusWithin &&
    !options.hidden
  );
}