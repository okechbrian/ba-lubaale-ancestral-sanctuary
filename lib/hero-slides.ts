/**
 * Hero slide rotation.
 *
 * The hero copy moves to the next slide on its own, every SLIDE_MS. These
 * helpers hold the parts that can be reasoned about without a DOM or a clock,
 * so the timing rule is pinned by unit tests rather than by timing out a real
 * component.
 */

/** How long each slide holds before the hero moves on. */
export const SLIDE_MS = 6000;

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
 * advance to, and the rest are the caller's business: reduced motion, the
 * visitor's pointer resting in the hero, and a hero scrolled out of sight or a
 * backgrounded tab, where changing text nobody can see is pure waste.
 */
export function shouldAutoAdvance(options: {
  length: number;
  reducedMotion: boolean;
  hovered: boolean;
  visible: boolean;
}): boolean {
  return (
    options.length > 1 &&
    !options.reducedMotion &&
    !options.hovered &&
    options.visible
  );
}