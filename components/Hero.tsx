"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const STILLS = [
  {
    src: "/images/hero-shore-gathering.jpg",
    alt: "Women in rust bark-cloth dresses standing on the Lake Victoria shore",
  },
  {
    src: "/images/og-cave-shore.jpg",
    alt: "Mossed rock mouth of Nalubaale Cave seen from the water",
  },
  {
    src: "/images/fire-night.jpg",
    alt: "Night bonfire on the shore with free-roaming herd nearby",
  },
] as const;

const CROSSFADE_MS = 7000;

export function Hero() {
  const [current, setCurrent] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pausedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion || videoPlaying) return;
    const id = setInterval(() => {
      if (!pausedRef.current) {
        setCurrent((i) => (i + 1) % STILLS.length);
      }
    }, CROSSFADE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, videoPlaying]);

  function toggleVideo() {
    const v = videoRef.current;
    if (!v) return;
    if (videoPlaying) {
      v.pause();
      setVideoPlaying(false);
    } else {
      v.play();
      setVideoPlaying(true);
    }
  }

  return (
    <section
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      {/* Still crossfade layer */}
      {!videoPlaying &&
        STILLS.map((s, i) => (
          <Image
            key={s.src}
            src={s.src}
            alt={s.alt}
            fill
            priority={i === 0}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

      {/* Video layer */}
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        poster={STILLS[current].src}
        className={`absolute inset-0 h-full w-full object-cover ${
          videoPlaying ? "block" : "hidden"
        }`}
        onClick={toggleVideo}
      >
        <source src="/video/tortoise.mp4" type="video/mp4" />
      </video>

      {/* Dusk overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-dusk/60 via-dusk/50 to-dusk/70" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.3em] text-bark uppercase">
          Ssese Islands · Lake Victoria · Uganda
        </p>
        <h1 className="mt-6 font-display text-5xl font-semibold text-cream sm:text-7xl">
          Ba Lubaale Ancestral Sanctuary
        </h1>
        <h2 className="mt-2 font-display text-3xl text-bark sm:text-4xl">
          Kiwamirembe
        </h2>
        <p className="mt-6 text-lg text-cream/80 sm:text-xl">
          A living ancestral sanctuary of cave, craft, herd, and lake.
        </p>
        <p className="mt-2 text-sm tracking-widest text-bark/70 uppercase">
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

        {/* Play the lake button */}
        <button
          type="button"
          onClick={toggleVideo}
          className="mt-6 text-xs text-cream/50 underline underline-offset-4 transition-colors hover:text-cream/80"
        >
          {videoPlaying ? "Stop the lake" : "Play the lake"}
        </button>

        <p className="mt-8 text-xs text-cream/50">
          Private. Screened. One household at a time.
        </p>
      </div>
    </section>
  );
}
