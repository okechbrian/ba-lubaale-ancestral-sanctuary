"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const MOMENTS = [
  {
    src: "/images/hero-shore-gathering.jpg",
    alt: "Shore gathering on Lake Victoria",
    caption: "Shore gathering",
  },
  {
    src: "/images/hero-shore-gathering-alt.jpg",
    alt: "Shore gathering alt view",
    caption: "Shore light",
  },
  {
    src: "/images/og-cave-shore.jpg",
    alt: "Mossed rock mouth of Nalubaale Cave seen from the water",
    caption: "Cave mouth",
  },
  {
    src: "/images/fire-night.jpg",
    alt: "Night bonfire on the shore",
    caption: "Night fire",
  },
  {
    src: "/images/closing-shore.jpg",
    alt: "Shore gathering at sunset",
    caption: "Sunset shore",
  },
  {
    src: "/images/arrival-boat.jpg",
    alt: "Approaching the sanctuary by boat",
    caption: "Arrival by boat",
  },
  {
    src: "/images/arrival-canoe.jpg",
    alt: "Arriving by canoe to the sanctuary shore",
    caption: "Canoe arrival",
  },
  {
    src: "/images/forest-roots.jpg",
    alt: "Buttress roots in the sanctuary forest",
    caption: "Forest roots",
  },
  {
    src: "/images/forest-butterfly.jpg",
    alt: "Butterfly resting on a leaf in the sanctuary forest",
    caption: "Forest life",
  },
  {
    src: "/images/coffee-cherries.jpg",
    alt: "Coffee cherries growing on the sanctuary grounds",
    caption: "Coffee cherries",
  },
  {
    src: "/images/host-measuring-bark.jpg",
    alt: "Mama Nalubaale measuring bark cloth with tape in the banana grove",
    caption: "Bark measurement",
  },
  {
    src: "/images/bark-teaching.jpg",
    alt: "Teaching bark-cloth technique beside the fire",
    caption: "Bark teaching",
  },
  {
    src: "/images/bark-dresses-stand.jpg",
    alt: "Finished bark-cloth dresses hanging on a stand among banana trees",
    caption: "Bark dresses",
  },
  {
    src: "/images/cowrie-four.jpg",
    alt: "Four women wearing cowrie strand necklaces",
    caption: "Cowrie adornment",
  },
  {
    src: "/images/cowrie-three.jpg",
    alt: "Three women wearing cowrie strand necklaces",
    caption: "Cowrie strands",
  },
  {
    src: "/images/food-luwombo.jpg",
    alt: "Luwombo wrapped in banana leaf",
    caption: "Luwombo feast",
  },
  {
    src: "/images/food-plate.jpg",
    alt: "A plate of sanctuary farm food",
    caption: "Farm plate",
  },
  {
    src: "/images/cave-mouth-wide.jpg",
    alt: "Wide view of the cave mouth opening to the forest",
    caption: "Cave opening",
  },
  {
    src: "/images/cave-mouth-congregation.jpg",
    alt: "Gathering at the cave mouth",
    caption: "Cave threshold",
  },
  {
    src: "/images/land-rock-islet.jpg",
    alt: "Rock islet off the sanctuary shore",
    caption: "Lake islet",
  },
  {
    src: "/images/fire-wide.jpg",
    alt: "Wide view of the shore fire at dusk",
    caption: "Shore fire",
  },
  {
    src: "/images/bark-shore-four.jpg",
    alt: "Four women in bark cloth standing on the shore",
    caption: "Shore circle",
  },
  {
    src: "/images/kente-shore-two.jpg",
    alt: "Two women in kente cloth standing on the shore",
    caption: "Kente shore",
  },
  {
    src: "/images/lake-house.jpg",
    alt: "The Lake House on stilts over Lake Victoria, framed by mango trees",
    caption: "The Lake House",
  },
  {
    src: "/images/herd-goats.jpg",
    alt: "Free-roaming goats in the sanctuary compound",
    caption: "The herd",
  },
  {
    src: "/images/sunset-calm-lake.jpg",
    alt: "Golden sunset reflecting on calm Lake Victoria water",
    caption: "Sunset lake",
  },
  {
    src: "/images/weaving-basket.jpg",
    alt: "Woman weaving a large basket from natural fibres",
    caption: "Weaving craft",
  },
  {
    src: "/images/bark-cloth-cave-entrance.jpg",
    alt: "Person in bark cloth standing at the rocky cave entrance",
    caption: "Cave entrance",
  },
  {
    src: "/images/island-natural-arch.jpg",
    alt: "Small tree-covered island with a natural rock arch on Lake Victoria",
    caption: "Lake island",
  },
  {
    src: "/images/bark-dress-hearts.jpg",
    alt: "Bark cloth dress with decorative heart cutouts and cowrie trim",
    caption: "Bark artistry",
  },
  {
    src: "/images/pineapple-farm-lake.jpg",
    alt: "Pineapple farm on the hillside with Lake Victoria in the background",
    caption: "Island harvest",
  },
] as const;

export function MomentsStrip() {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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

        <div
          ref={stripRef}
          className="mt-12 flex gap-4"
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
          {[...MOMENTS, ...MOMENTS].map((m, i) => (
            <button
              key={`${m.src}-${i}`}
              type="button"
              onClick={() => openLightbox(i % MOMENTS.length)}
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
