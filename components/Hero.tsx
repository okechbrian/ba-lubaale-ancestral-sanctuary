"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "@/components/useReducedMotion";

export function Hero() {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const v = videoRef.current;
    if (!v) return;
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setVideoPlaying(true))
        .catch(() => setVideoPlaying(false));
    }
  }, [reducedMotion]);

  function toggleVideo() {
    const v = videoRef.current;
    if (!v) return;
    if (videoPlaying) {
      v.pause();
      setVideoPlaying(false);
    } else {
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setVideoPlaying(true))
          .catch(() => setVideoPlaying(false));
      }
    }
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Poster still — only for reduced motion */}
      {reducedMotion && (
        <Image
          src="/images/hero-shore-gathering.jpg"
          alt="Women in rust bark-cloth dresses standing on the Lake Victoria shore"
          fill
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Video layer */}
      {!reducedMotion && (
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          className="absolute inset-0 h-full w-full object-cover"
          onClick={toggleVideo}
        >
          <source src="/video/tortoise.mp4" type="video/mp4" />
        </video>
      )}

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

        {/* Play / Pause control */}
        {!reducedMotion && (
          <button
            type="button"
            onClick={toggleVideo}
            className="mt-6 text-xs text-cream/50 underline underline-offset-4 transition-colors hover:text-cream/80"
          >
            {videoPlaying ? "Pause the lake" : "Play the lake"}
          </button>
        )}

        <p className="mt-8 text-xs text-cream/50">
          Private. Screened. One household at a time.
        </p>
      </div>
    </section>
  );
}
