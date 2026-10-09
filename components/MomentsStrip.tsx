"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useReducedMotion } from "@/components/useReducedMotion";
import type { Moment } from "@/lib/cms/blocks";

export function MomentsStrip({ moments }: { moments: Moment[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const el = stripRef.current;
    if (!el) return;
    el.style.animationPlayState = paused ? "paused" : "running";
  }, [paused, reducedMotion]);

  function openLightbox(i: number) {
    setPaused(true);
    setLightbox(i);
  }

  function closeLightbox() {
    setLightbox(null);
    if (!reducedMotion) setPaused(false);
  }

  return (
    <>
      <section className="overflow-hidden bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold text-ink">
            Sanctuary Moments
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink/70">
            Small scenes from the land, the craft, and the table.
          </p>
        </div>

        {/* Keyframes */}
        {!reducedMotion && (
          <style
            // eslint-disable-next-line react/no-unknown-property
            dangerouslySetInnerHTML={{
              __html:
                "@keyframes moments-drift{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}",
            }}
          />
        )}

        {/* Phone: a row the person slides. A drifting strip is hard to tap. */}
        <div className="mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden">
          {moments.map((m, i) => (
            <button
              key={`${m.src}-hand-${i}`}
              type="button"
              onClick={() => openLightbox(i)}
              className="w-44 shrink-0 snap-start text-left"
            >
              <div className="relative aspect-square overflow-hidden rounded-[1.2rem]">
                <Image
                  src={m.src}
                  alt={m.alt}
                  width={224}
                  height={224}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 text-center text-xs text-ink/60">{m.caption}</p>
            </button>
          ))}
        </div>

        <div
          ref={stripRef}
          className="mt-12 hidden gap-4 md:flex"
          style={
            reducedMotion
              ? undefined
              : {
                  animation: "moments-drift 120s linear infinite",
                  animationPlayState: paused ? "paused" : "running",
                  width: "max-content",
                }
          }
          onMouseEnter={() => {
            if (!reducedMotion) setPaused(true);
          }}
          onMouseLeave={() => {
            if (!reducedMotion && lightbox === null) setPaused(false);
          }}
        >
          {[...moments, ...moments].map((m, i) => (
            <button
              key={`${m.src}-${i}`}
              type="button"
              onClick={() => openLightbox(i % moments.length)}
              className="group relative w-48 shrink-0 overflow-hidden rounded-md sm:w-56"
            >
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={m.src}
                  alt={m.alt}
                  width={224}
                  height={224}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <p className="mt-2 text-center text-xs text-ink/60">
                {m.caption}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dusk/90 p-4"
          onClick={closeLightbox}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeLightbox();
          }}
          role="dialog"
          aria-label="Image lightbox"
          tabIndex={-1}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-6 top-6 text-cream/70 transition-colors hover:text-cream"
            aria-label="Close lightbox"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div
            className="relative max-h-[80vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={moments[lightbox].src}
              alt={moments[lightbox].alt}
              width={900}
              height={700}
              className="rounded-md object-contain"
            />
            <p className="mt-3 text-center text-sm text-cream/70">
              {moments[lightbox].caption}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
