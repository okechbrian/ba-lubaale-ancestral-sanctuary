"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatFireDate, nextFireSaturday } from "@/lib/fire-circle/date";
import { SLIDE_MS, nextIndex, shouldAutoAdvance } from "@/lib/hero-slides";
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
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  // Memoised so the timer effect can depend on `list` without restarting on
  // every render: slides(nextFire)[mode] hands back a fresh array each time,
  // which would reset the clock forever and the copy would never move.
  const list = useMemo(() => slides(nextFire)[mode], [mode, nextFire]);
  const active = list[Math.min(index, list.length - 1)];

  const autoAdvance = shouldAutoAdvance({
    length: list.length,
    reducedMotion,
    hovered,
    visible,
  });

  // No point rotating copy nobody can see: stop while the hero is scrolled
  // away, and while the tab sits in the background.
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(element);
    const onVisibility = () => setVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Moves the copy on its own, exactly as clicking the next pill would. A
  // setTimeout chain rather than setInterval, so a hold stops the clock
  // outright instead of leaving a backlog of callbacks to fire at once.
  useEffect(() => {
    if (!autoAdvance) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => nextIndex(current, list.length));
    }, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, index, list]);

  function chooseMode(next: "now" | "ahead") {
    setMode(next);
    setIndex(0);
  }

  return (
    <section
      ref={sectionRef}
      className="relative bg-cream"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8 lg:py-16">
        <div className="relative z-10 max-w-xl lg:row-start-1">
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

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
            {list.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                  i === index ? "bg-bark text-cream" : "text-ink/70"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>

          {/* aria-hidden because this copy now rewrites itself every six
              seconds: without it a screen reader announces the whole slide
              again on every tick. The pills above remain the way to reach a
              specific slide deliberately. */}
          <h1
            aria-hidden="true"
            className="mt-6 font-display text-4xl font-semibold leading-none text-ink sm:text-6xl"
          >
            {active.title}
          </h1>
          <WavyRule />
          <p
            aria-hidden="true"
            className="mt-4 max-w-md text-base leading-relaxed text-ink/75 sm:text-lg"
          >
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
