"use client";

import { useState } from "react";
import Image from "next/image";

const MOMENTS = [
  {
    src: "/images/host-measuring-bark.jpg",
    alt: "Queen Nalubaale measuring bark cloth with tape in the banana grove",
    caption: "Bark cloth measurement",
  },
  {
    src: "/images/bark-teaching.jpg",
    alt: "Teaching bark-cloth technique beside the fire",
    caption: "Bark-cloth teaching",
  },
  {
    src: "/images/cowrie-four.jpg",
    alt: "Four women wearing cowrie strand necklaces",
    caption: "Cowrie adornment",
  },
  {
    src: "/images/food-luwombo.jpg",
    alt: "Luwombo wrapped in banana leaf",
    caption: "Luwombo feast",
  },
  {
    src: "/images/forest-butterfly.jpg",
    alt: "Butterfly resting on a leaf in the sanctuary forest",
    caption: "Forest life",
  },
  {
    src: "/images/arrival-canoe.jpg",
    alt: "Arriving by canoe to the sanctuary shore",
    caption: "Arrival by canoe",
  },
] as const;

export function MomentsStrip() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <>
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold text-ink">
            Sanctuary Moments
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink/70">
            Small scenes from the land, the craft, and the table.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {MOMENTS.map((m, i) => (
              <button
                key={m.src}
                type="button"
                onClick={() => setLightbox(i)}
                className="group block overflow-hidden rounded-md"
              >
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={m.src}
                    alt={m.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-center text-xs text-ink/60">
                  {m.caption}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dusk/90 p-4"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightbox(null);
          }}
          role="dialog"
          aria-label="Image lightbox"
          tabIndex={-1}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
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
              src={MOMENTS[lightbox].src}
              alt={MOMENTS[lightbox].alt}
              width={900}
              height={700}
              className="rounded-md object-contain"
            />
            <p className="mt-3 text-center text-sm text-cream/70">
              {MOMENTS[lightbox].caption}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
