"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatFireDate, nextFireSaturday } from "@/lib/fire-circle/date";
import { nextIndex, readMsFor, shouldAutoAdvance } from "@/lib/hero-slides";
import { useReducedMotion } from "@/components/useReducedMotion";
import { WavyRule } from "@/components/editorial";

/**
 * Hero crossfade: four stills then the tortoise clip, 36s round.
 * The first frame paints at once; the rest ramp in and out on the
 * per-layer keyframes declared in globals.css. Costs no JavaScript and
 * no extra bytes. Reduced-motion visitors get one still and no cycle.
 * The cycle plays inside the curved panel. On a phone the film sits
 * between the name and the request, and the seal stays inside the frame.
 */
const HERO_CYCLE = "36s linear infinite";

const FIRST_FRAME = {
  src: "/images/hero-nature-wide-v1.jpg",
  alt: "A wide vista of the sanctuary land and lake",
};

const LATER_FRAMES = [
  { src: "/images/hero-nature-path.jpg", frame: 2 },
  { src: "/images/hero-nature-roots.jpg", frame: 3 },
  { src: "/images/fire-night.jpg", frame: 4 },
] as const;

function Frames({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return (
      <Image
        src={FIRST_FRAME.src}
        alt={FIRST_FRAME.alt}
        fill
        priority
        quality={85}
        className="object-cover"
      />
    );
  }

  return (
    <>
      <Image
        src={FIRST_FRAME.src}
        alt={FIRST_FRAME.alt}
        fill
        priority
        quality={85}
        className="object-cover"
        style={{ animation: `heroFrame1 ${HERO_CYCLE}` }}
      />
      {LATER_FRAMES.map(({ src, frame }) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          quality={85}
          aria-hidden="true"
          className="object-cover"
          style={{ animation: `heroFrame${frame} ${HERO_CYCLE}` }}
        />
      ))}
      <video
        muted
        playsInline
        loop
        autoPlay
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: `heroFrame5 ${HERO_CYCLE}` }}
      >
        <source src="/images/hero-herd-video-v1.mp4" type="video/mp4" />
      </video>
    </>
  );
}

function Seal() {
  return (
    <div className="absolute bottom-3 right-3 z-20 h-24 w-24 sm:bottom-5 sm:right-5 sm:h-36 sm:w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-sm" aria-hidden="true">
        <circle cx="60" cy="60" r="58" fill="#E8A06A" />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="#1A1814"
          strokeWidth="0.7"
          strokeDasharray="1.5 2.2"
        />
        <path
          id="hero-seal"
          d="M60,60 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0"
          fill="none"
        />
        <text
          fill="#1A1814"
          fontSize="6.4"
          letterSpacing="3.1"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          <textPath href="#hero-seal">
            LAKE VICTORIA · UGANDA ·
          </textPath>
        </text>
        <text
          fill="#1A1814"
          textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
        >
          <tspan x="60" y="58" fontSize="13">
            Ssese
          </tspan>
          <tspan x="60" y="72" fontSize="11">
            Islands
          </tspan>
        </text>
      </svg>
      <span className="sr-only">Ssese Islands, Lake Victoria, Uganda</span>
    </div>
  );
}

type Slide = {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
};

function slides(nextFire: string): { now: Slide[]; ahead: Slide[] } {
  return {
    now: [
      {
        id: "cave",
        title: "The cave",
        body: "Three of the caves are open to guests: Nalubaale, Lubaale Musisi, and Lubaale Wanema. The rest are visited only after a calling.",
        href: "/the-cave",
        cta: "The three caves",
      },
      {
        id: "springs",
        title: "The springs",
        body: "A full-time spring rises in the roots of the ancient tree, clean water used for cleansing before and after cave sessions.",
        href: "/the-land",
        cta: "The land",
      },
      {
        id: "fire",
        title: "The shore fire",
        body: "Fire burns on the shore most evenings. Evening conversation here, with the host and her people. The day is laid down before sleep.",
        href: "/the-land",
        cta: "The land",
      },
      {
        id: "craft",
        title: "Craft",
        body: "Guests learn to measure, cut, and sew bark cloth into garments, wall hangings, and talisman wraps. You weave it, sew it, and carry it home.",
        href: "/atelier",
        cta: "Visit the Atelier",
      },
      {
        id: "herd",
        title: "The herd",
        body: "Free-roaming goats and cows. Naturally fed. Goat bell at dusk.",
        href: "/the-land",
        cta: "The land",
      },
    ],
    ahead: [
      {
        id: "circle",
        title: "The fire circle",
        body: `Online. Queen Nalubaale speaks, then there are questions. No class, no recording, no chat. The next one is ${nextFire}.`,
        href: "/fire-circle#request",
        cta: "Request a seat",
      },
      {
        id: "stays",
        title: "Immersions",
        body: "Essential Healing Immersion. Master Transformation & Craft. Whole-Island Buyout. One household at a time. Private. Screened.",
        href: "/immersions",
        cta: "View the stays",
      },
    ],
  };
}

export function Hero() {
  const reducedMotion = useReducedMotion();
  const nextFire = formatFireDate(nextFireSaturday());
  const [mode, setMode] = useState<"now" | "ahead">("now");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [hidden, setHidden] = useState(false);
const [manualStep, setManualStep] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  // Memoised so the timer effect can depend on `list` without restarting on
  // every render: slides(nextFire)[mode] hands back a fresh array each time,
  // which would reset the clock forever and nothing would ever advance.
  const list = useMemo(() => slides(nextFire)[mode], [mode, nextFire]);
  const active = list[Math.min(index, list.length - 1)];

  const autoAdvance = shouldAutoAdvance({
    length: list.length,
    reducedMotion,
    paused,
    hovered,
    focusWithin,
    hidden,
  });

  // A backgrounded tab must not run the clock down unseen, or the visitor
  // comes back to a slide they never saw.
  useEffect(() => {
    const sync = () => setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Keyboard focus inside the hero holds the copy still, so the link under a
  // visitor's focus is not swapped out from under them.
  useEffect(() => {
    const element = heroRef.current;
    if (!element) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      // Only keyboard focus counts. Clicking a slide with a mouse also focuses
      // that button, and quietly freezing the hero because someone picked a
      // slide would be baffling; :focus-visible marks keyboard intent.
      if (target?.matches?.(":focus-visible")) setFocusWithin(true);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!element.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
    };
    element.addEventListener("focusin", onFocusIn);
    element.addEventListener("focusout", onFocusOut);
    return () => {
      element.removeEventListener("focusin", onFocusIn);
      element.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // The dwell is timed to the length of the copy, so the 25-word Atelier
  // slide is not torn away mid-sentence. `manualStep` is a bump on any
  // deliberate choice, which restarts the clock even when the visitor
  // re-picks the slide already showing.
  useEffect(() => {
    if (!autoAdvance) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => nextIndex(current, list.length));
    }, readMsFor(active.body));
    return () => window.clearTimeout(timer);
  }, [autoAdvance, index, list, active.body, manualStep]);

  function chooseMode(next: "now" | "ahead") {
    setMode(next);
    setIndex(0);
    setManualStep((step) => step + 1);
  }

  function chooseSlide(next: number) {
    setIndex(next);
    setManualStep((step) => step + 1);
  }

  return (
    <section
      ref={heroRef}
      className="relative bg-cream"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8 lg:py-16">
        <div className="relative z-10 max-w-xl lg:row-start-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2" role="tablist" aria-label="What is happening">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "now"}
                onClick={() => chooseMode("now")}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                  mode === "now" ? "bg-ink text-cream" : "bg-mist text-ink"
                }`}
              >
                Now
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "ahead"}
                onClick={() => chooseMode("ahead")}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                  mode === "ahead" ? "bg-ink text-cream" : "bg-mist text-ink"
                }`}
              >
                Ahead
              </button>
            </div>

            {/* Required by WCAG 2.2.2: this copy changes on a timer for more
                than five seconds, so the visitor needs a way to stop it. A
                silent looping video does not need this, but auto-updating
                information does. With reduced motion there is nothing running
                to stop, so the control is left off entirely. */}
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setPaused((stopped) => !stopped)}
                className="min-h-11 rounded-full px-3 text-sm font-semibold text-ink/60 underline decoration-ink/25 underline-offset-4 transition-colors hover:text-ink"
              >
                {paused ? "Play" : "Pause"}
              </button>
            )}
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
            {list.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-current={i === index ? "true" : undefined}
                onClick={() => chooseSlide(i)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                  i === index ? "bg-bark text-cream" : "text-ink/70"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-none text-ink sm:text-6xl">
            {active.title}
          </h1>
          <WavyRule />
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink/75 sm:text-lg">
            {active.body}
          </p>
          {/* Locked in DECISIONS.md #1 / MASTER_PROMPT: the poetic subtitle, which
              must never appear as the header logo. The hero previously showed it
              below this paragraph; the work-led slides had dropped it from the
              whole site, so it is restored here at its original size and
              placement. */}
          <p className="mt-3 hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/50 sm:block">
            The Weaver&apos;s Sanctuary &amp; Sacred Caves
          </p>
          <Link
            href={active.href}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-bark px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-ember sm:w-auto"
          >
            {active.cta}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="relative lg:col-start-2 lg:row-start-1">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 top-8 hidden h-[88%] w-36 rounded-[100%] bg-cream lg:block"
          />
          <div className="relative h-64 overflow-hidden rounded-[1.75rem] bg-bark sm:h-auto sm:min-h-[32rem] lg:rounded-bl-[7.5rem] lg:rounded-tr-[2.25rem]">
            <div className="absolute inset-2 overflow-hidden rounded-[1.35rem] bg-dusk sm:inset-4 lg:rounded-bl-[6.5rem]">
              <Frames reducedMotion={reducedMotion} />
            </div>
            <Seal />
          </div>
        </div>
      </div>
    </section>
  );
}
