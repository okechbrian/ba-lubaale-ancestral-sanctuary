"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { site, navigationGroups } from "@/content/site";
import { LanguageStub } from "./LanguageStub";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Close menus on route change.
  //
  // Adjusting state during render rather than in an effect: React re-runs the
  // component immediately with the new state before committing to the DOM, so
  // the menus never paint open on the destination route. The previous version
  // used a `useEffect`, which renders once with the menus still open and then
  // closes them in a second pass — the extra render this repo's lint gate
  // flags as a cascading-render hazard, and a visible flash of the old menu.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setActiveDropdown(null);
  }

  // Scroll detection for frosted glass navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock scroll when mobile menu is open
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

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setMobileOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMouseEnter = (key: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const isGroupActive = (items: readonly { href: string }[]) => {
    return items.some(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b border-mist bg-cream transition-shadow duration-300 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Desktop nav, left */}
        <nav
          ref={navRef}
          className="hidden items-center gap-4 xl:gap-6 lg:flex"
          aria-label="Main"
        >
          {/* Group 1: The Sanctuary */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter("sanctuary")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-bark rounded-sm xl:text-[11px] xl:tracking-[0.16em] ${
                isGroupActive(navigationGroups.sanctuary.items) ||
                activeDropdown === "sanctuary"
                  ? "text-bark"
                  : "text-ink/80 hover:text-ink"
              }`}
              onClick={() =>
                setActiveDropdown(
                  activeDropdown === "sanctuary" ? null : "sanctuary"
                )
              }
              aria-expanded={activeDropdown === "sanctuary"}
              aria-haspopup="true"
            >
              <span>{navigationGroups.sanctuary.label}</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  activeDropdown === "sanctuary" ? "rotate-180 text-bark" : "text-ink/50"
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {activeDropdown === "sanctuary" && (
              <div
                className="absolute left-0 top-full mt-2 w-80 rounded-lg border border-mist bg-cream p-3 shadow-xl ring-1 ring-ink/5 transition-all animate-in fade-in slide-in-from-top-1 duration-200"
                role="menu"
              >
                <div className="space-y-1">
                  {navigationGroups.sanctuary.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`group flex flex-col rounded-md p-2.5 transition-colors ${
                          active
                            ? "bg-mist/80 text-bark"
                            : "hover:bg-mist/50 text-ink"
                        }`}
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="font-display text-sm font-semibold flex items-center justify-between">
                          <span>{item.label}</span>
                          {active && (
                            <span className="h-1.5 w-1.5 rounded-full bg-bark" />
                          )}
                        </span>
                        <span className="mt-0.5 text-xs text-ink/70 leading-relaxed font-normal">
                          {item.description}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Group 2: Experiences */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter("experiences")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-bark rounded-sm xl:text-[11px] xl:tracking-[0.16em] ${
                isGroupActive(navigationGroups.experiences.items) ||
                activeDropdown === "experiences"
                  ? "text-bark"
                  : "text-ink/80 hover:text-ink"
              }`}
              onClick={() =>
                setActiveDropdown(
                  activeDropdown === "experiences" ? null : "experiences"
                )
              }
              aria-expanded={activeDropdown === "experiences"}
              aria-haspopup="true"
            >
              <span>{navigationGroups.experiences.label}</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  activeDropdown === "experiences"
                    ? "rotate-180 text-bark"
                    : "text-ink/50"
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {activeDropdown === "experiences" && (
              <div
                className="absolute left-0 top-full mt-2 w-84 rounded-lg border border-mist bg-cream p-3 shadow-xl ring-1 ring-ink/5 transition-all animate-in fade-in slide-in-from-top-1 duration-200"
                role="menu"
              >
                <div className="space-y-1">
                  {navigationGroups.experiences.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`group flex flex-col rounded-md p-2.5 transition-colors ${
                          active
                            ? "bg-mist/80 text-bark"
                            : "hover:bg-mist/50 text-ink"
                        }`}
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="font-display text-sm font-semibold flex items-center justify-between">
                          <span>{item.label}</span>
                          {active && (
                            <span className="h-1.5 w-1.5 rounded-full bg-bark" />
                          )}
                        </span>
                        <span className="mt-0.5 text-xs text-ink/70 leading-relaxed font-normal">
                          {item.description}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Group 3: Visit & Plan */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnter("visit")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-bark rounded-sm xl:text-[11px] xl:tracking-[0.16em] ${
                isGroupActive(navigationGroups.visit.items) ||
                activeDropdown === "visit"
                  ? "text-bark"
                  : "text-ink/80 hover:text-ink"
              }`}
              onClick={() =>
                setActiveDropdown(activeDropdown === "visit" ? null : "visit")
              }
              aria-expanded={activeDropdown === "visit"}
              aria-haspopup="true"
            >
              <span>{navigationGroups.visit.label}</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  activeDropdown === "visit" ? "rotate-180 text-bark" : "text-ink/50"
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {activeDropdown === "visit" && (
              <div
                className="absolute right-0 top-full mt-2 w-84 rounded-lg border border-mist bg-cream p-3 shadow-xl ring-1 ring-ink/5 transition-all animate-in fade-in slide-in-from-top-1 duration-200"
                role="menu"
              >
                <div className="space-y-1">
                  {navigationGroups.visit.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`group flex flex-col rounded-md p-2.5 transition-colors ${
                          active
                            ? "bg-mist/80 text-bark"
                            : "hover:bg-mist/50 text-ink"
                        }`}
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="font-display text-sm font-semibold flex items-center justify-between">
                          <span>{item.label}</span>
                          {active && (
                            <span className="h-1.5 w-1.5 rounded-full bg-bark" />
                          )}
                        </span>
                        <span className="mt-0.5 text-xs text-ink/70 leading-relaxed font-normal">
                          {item.description}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        <Link
          href="/"
          className="group justify-self-center text-center leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-bark rounded-sm"
          aria-label="Ba Lubaale Ancestral Sanctuary Kiwamirembe Home"
        >
          <span className="block font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            BA LUBAALE
          </span>
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-bark sm:hidden">
            Kiwamirembe
          </span>
          <span className="mt-1 hidden text-[9px] font-medium uppercase tracking-[0.22em] text-bark sm:block">
            {site.subtitle}
          </span>
        </Link>

        <div className="flex items-center justify-end gap-4">
          <div className="hidden items-center gap-5 lg:flex">
            <Link
              href="/stories"
              className={`text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-bark rounded-sm ${
                pathname === "/stories" || pathname.startsWith("/stories/")
                  ? "text-bark"
                  : "text-ink/80 hover:text-ink"
              }`}
            >
              Stories
            </Link>
            <Link
              href="/apply"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:text-bark"
            >
              Request
            </Link>
            <LanguageStub />
          </div>

          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-bark lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <div className="flex flex-col items-center justify-center gap-1.5">
              <span
                className={`block h-0.5 w-5 bg-ink transition-all duration-300 ${
                  mobileOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-ink transition-opacity duration-300 ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-ink transition-all duration-300 ${
                  mobileOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-cream/98 backdrop-blur-xl lg:hidden animate-in fade-in duration-200">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-mist/70 px-4 py-3 sm:px-6">
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
              className="flex h-10 w-10 items-center justify-center rounded-md text-ink hover:bg-mist/50"
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
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer content: Scrollable navigation */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* The Sanctuary */}
            <div>
              <p className="text-xs font-semibold tracking-widest text-bark uppercase">
                {navigationGroups.sanctuary.label}
              </p>
              <div className="mt-2.5 space-y-1">
                {navigationGroups.sanctuary.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-md py-2 px-3 font-display text-lg font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-mist text-bark"
                        : "text-ink hover:bg-mist/50"
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-xs font-normal text-ink/60 font-sans">
                      {item.description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Experiences */}
            <div className="border-t border-mist/60 pt-5">
              <p className="text-xs font-semibold tracking-widest text-bark uppercase">
                {navigationGroups.experiences.label}
              </p>
              <div className="mt-2.5 space-y-1">
                {navigationGroups.experiences.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-md py-2 px-3 font-display text-lg font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-mist text-bark"
                        : "text-ink hover:bg-mist/50"
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-xs font-normal text-ink/60 font-sans">
                      {item.description}
                    </div>
                  </Link>
                ))}
                <Link
                  href="/stories"
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-md py-2 px-3 font-display text-lg font-medium transition-colors ${
                    pathname === "/stories"
                      ? "bg-mist text-bark"
                      : "text-ink hover:bg-mist/50"
                  }`}
                >
                  <div>Stories</div>
                  <div className="text-xs font-normal text-ink/60 font-sans">
                    Notes and reflections from the house
                  </div>
                </Link>
              </div>
            </div>

            {/* Visit & Plan */}
            <div className="border-t border-mist/60 pt-5">
              <p className="text-xs font-semibold tracking-widest text-bark uppercase">
                {navigationGroups.visit.label}
              </p>
              <div className="mt-2.5 space-y-1">
                {navigationGroups.visit.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-md py-2 px-3 font-display text-lg font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-mist text-bark"
                        : "text-ink hover:bg-mist/50"
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-xs font-normal text-ink/60 font-sans">
                      {item.description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer footer actions */}
          <div className="border-t border-mist/70 bg-cream p-6 space-y-4">
            <Link
              href="/apply"
              className="block w-full rounded-full bg-bark py-3.5 text-center text-sm font-semibold text-cream transition-colors hover:bg-ember"
              onClick={() => setMobileOpen(false)}
            >
              Request an Immersion
            </Link>

            <div className="flex items-center justify-between text-xs text-ink/70">
              <LanguageStub />
              <a
                href={`mailto:${site.contact.email}`}
                className="hover:text-bark transition-colors"
              >
                {site.contact.email}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

