"use client";

import { useState } from "react";
import Image from "next/image";
import { channel, films } from "@/content/teaching";

export function HearHer() {
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <section id="hear-her" className="scroll-mt-16 bg-dusk py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl font-semibold text-cream">
          Hear her
        </h2>

        <ul className="mt-8">
          {films.map((film) => (
            <li
              key={film.id}
              className="grid gap-5 border-t border-cream/10 py-8 first:border-t-0 first:pt-0 sm:grid-cols-[18rem_1fr] sm:items-center lg:grid-cols-[24rem_1fr]"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
                {playing === film.id ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${film.id}?autoplay=1&rel=0`}
                    title={film.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlaying(film.id)}
                    aria-label={`Play ${film.title}`}
                    className="group absolute inset-0 h-full w-full cursor-pointer"
                  >
                    <Image
                      src={`https://i.ytimg.com/vi/${film.id}/sddefault.jpg`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 24rem, (min-width: 640px) 18rem, 100vw"
                      className="object-cover"
                    />
                    <span className="absolute inset-0 bg-dusk/40 transition-colors group-hover:bg-dusk/20" />
                    <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream text-dusk transition-transform group-hover:scale-105">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="ml-1 h-6 w-6 fill-current"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </button>
                )}
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-cream">
                  {film.title}
                </h3>
                <p className="mt-2 max-w-xl text-sm text-cream/70">{film.en}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-cream/70">
          The class continues on{" "}
          <a
            href={channel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-leaf transition-colors hover:text-leaf/80"
          >
            {channel.label}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
