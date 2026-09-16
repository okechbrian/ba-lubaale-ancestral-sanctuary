"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { site } from "@/content/site";
import { LanguageStub } from "./LanguageStub";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-cream shadow-sm" : "bg-cream/90 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Wordmark */}
        <Link href="/" className="flex flex-col leading-tight">
          <span className="font-display text-lg font-semibold tracking-wide text-ink">
            BA LUBAALE
          </span>
          <span className="text-[10px] tracking-widest text-bark uppercase">
            {site.subtitle}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink/80 transition-colors hover:text-ember"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/apply"
            className="rounded-md bg-ember px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-ember/90"
          >
            Request Immersion
          </Link>
          <LanguageStub />
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex flex-col gap-1.5 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span className="block h-0.5 w-6 bg-ink" />
          <span className="block h-0.5 w-6 bg-ink" />
          <span className="block h-0.5 w-6 bg-ink" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-cream lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="flex flex-col leading-tight"
              onClick={() => setMobileOpen(false)}
            >
              <span className="font-display text-lg font-semibold tracking-wide text-ink">
                BA LUBAALE
              </span>
              <span className="text-[10px] tracking-widest text-bark uppercase">
                {site.subtitle}
              </span>
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md text-ink"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-1 flex-col items-center justify-center gap-8" aria-label="Mobile">
            {site.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-2xl font-medium text-ink transition-colors hover:text-ember"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/apply"
              className="rounded-md bg-ember px-6 py-3 text-lg font-semibold text-cream transition-colors hover:bg-ember/90"
              onClick={() => setMobileOpen(false)}
            >
              Request Immersion
            </Link>
            <LanguageStub />
          </nav>
        </div>
      )}
    </header>
  );
}
