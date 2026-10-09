"use client";

import Image from "next/image";
import Link from "next/link";
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

export function Hero() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8 lg:py-16">
        <div className="relative z-10 max-w-xl lg:col-start-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bark sm:text-[11px] sm:tracking-[0.22em]">
            Ssese Islands · Lake Victoria · Uganda
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-[0.92] tracking-tight text-ink sm:text-7xl">
            Ba Lubaale
            <span className="mt-2 block text-[0.62em] font-medium leading-none">
              Ancestral Sanctuary
            </span>
          </h1>
          <h2 className="mt-3 font-display text-2xl text-bark sm:text-3xl">
            Kiwamirembe
          </h2>
          <WavyRule className="hidden sm:block" />
        </div>

        <div className="relative lg:col-start-2 lg:row-span-2 lg:row-start-1">
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

        <div className="relative z-10 max-w-xl lg:col-start-1">
          <p className="max-w-sm text-base leading-relaxed text-ink/75 sm:text-lg">
            A living ancestral sanctuary of cave, craft, herd, and lake.
          </p>
          <p className="mt-3 hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/50 sm:block">
            The Weaver&apos;s Sanctuary & Sacred Caves
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <Link
              href="/apply"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-bark px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-ember"
            >
              Request an Immersion
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#land-gateways"
              className="text-center text-sm font-semibold text-ink underline decoration-bark/50 underline-offset-4 transition-colors hover:text-bark sm:text-left"
            >
              Enter the Land
            </a>
          </div>
          <p className="mt-4 text-xs tracking-wide text-ink/45">
            Private. Screened. One household at a time.
          </p>
        </div>
      </div>
    </section>
  );
}
