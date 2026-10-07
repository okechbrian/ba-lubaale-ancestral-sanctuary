"use client";

import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "@/components/useReducedMotion";

/**
 * Hero crossfade: four stills then the tortoise clip, 36s round.
 * The first frame paints at once; the rest ramp in and out on the
 * per-layer keyframes declared in globals.css. Costs no JavaScript and
 * no extra bytes. Reduced-motion visitors get one still and no cycle.
 */
const HERO_CYCLE = "36s linear infinite";

const FIRST_FRAME = {
  src: "/images/hero-host-main.jpg",
  alt: "Queen Nalubaale welcoming visitors to the sanctuary",
};

const LATER_FRAMES = [
  { src: "/images/hero-nature-wide.jpg", frame: 2 },
  { src: "/images/hero-nature-forest.jpg", frame: 3 },
  { src: "/images/fire-night.jpg", frame: 4 },
] as const;

export function Hero() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {reducedMotion ? (
        /* Reduced motion: one still, no cycle, no video */
        <Image
          src={FIRST_FRAME.src}
          alt={FIRST_FRAME.alt}
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          {/* Frame 1 — already on screen at load, so it never fades in */}
          <Image
            src={FIRST_FRAME.src}
            alt={FIRST_FRAME.alt}
            fill
            priority
            quality={85}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ animation: `heroFrame1 ${HERO_CYCLE}` }}
          />

          {/* Frames 2–4: stills */}
          {LATER_FRAMES.map(({ src, frame }) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              quality={85}
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ animation: `heroFrame${frame} ${HERO_CYCLE}` }}
            />
          ))}

          {/* Frame 5: the tortoise clip closes the cycle */}
          <video
            muted
            playsInline
            loop
            autoPlay
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ animation: `heroFrame5 ${HERO_CYCLE}` }}
          >
            <source src="/images/hero-herd-video.mp4" type="video/mp4" />
          </video>
        </>
      )}

      {/* Dusk overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-dusk/60 via-dusk/50 to-dusk/70" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.3em] text-bark-soft uppercase">
          Ssese Islands · Lake Victoria · Uganda
        </p>
        <h1 className="mt-6 font-display text-5xl font-semibold text-cream sm:text-7xl">
          Ba Lubaale Ancestral Sanctuary
        </h1>
        <h2 className="mt-2 font-display text-3xl text-bark-soft sm:text-4xl">
          Kiwamirembe
        </h2>
        <p className="mt-6 text-lg text-cream/80 sm:text-xl">
          A living ancestral sanctuary of cave, craft, herd, and lake.
        </p>
        <p className="mt-2 text-sm tracking-widest text-bark-soft/70 uppercase">
          The Weaver&apos;s Sanctuary &amp; Sacred Caves
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/apply"
            className="rounded-md bg-lake px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80"
          >
            Request an Immersion
          </Link>
          <a
            href="#land-gateways"
            className="rounded-md border border-cream/30 px-8 py-3 text-sm font-semibold text-cream transition-colors hover:border-cream/60"
          >
            Enter the Land
          </a>
        </div>

        <p className="mt-8 text-xs text-cream/50">
          Private. Screened. One household at a time.
        </p>
      </div>
    </section>
  );
}
