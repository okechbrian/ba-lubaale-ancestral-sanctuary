"use client";

import { useEffect, useState } from "react";

const navAnchors = [
  { id: "land-gateways", label: "Four Realms" },
  { id: "who-is-welcomed", label: "Who Is Welcomed" },
  { id: "three-acts", label: "The Three Acts" },
  { id: "craft-healing", label: "Craft as Healing" },
  { id: "the-host", label: "Queen Nalubaale" },
  { id: "immersions", label: "Immersions" },
];

/**
 * The site header is `sticky top-0` and changes height when it gains a
 * background on scroll, so its pixel height is not a constant. Measuring it
 * beats hardcoding an offset: the jump bar must sit flush beneath the header,
 * and an anchor scrolled to must not land underneath it.
 */
function useHeaderHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector("header");
      setHeight(header ? Math.round(header.getBoundingClientRect().height) : 0);
    };
    measure();
    // Re-measure on resize, and on scroll because the header grows a border and
    // shadow once it becomes opaque.
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);

  return height;
}

export function HomeQuickJump() {
  const [activeId, setActiveId] = useState<string>("");
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    const handleScroll = () => {
      // Compare against the header + bar so the active pill reflects the
      // section actually under the jump bar, not one hidden behind it.
      const scrollPosition = window.scrollY + headerHeight + 100;
      for (let i = navAnchors.length - 1; i >= 0; i--) {
        const anchor = navAnchors[i];
        const element = document.getElementById(anchor.id);
        if (element && element.getBoundingClientRect().top + window.scrollY <= scrollPosition) {
          setActiveId(anchor.id);
          return;
        }
      }
      setActiveId("");
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [headerHeight]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return; // a real href keeps this usable if JS is unavailable
    e.preventDefault();
    // Land the section top just below the header and the jump bar itself.
    const offset = headerHeight + 56;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  return (
    <div
      className="sticky z-30 border-b border-mist/70 bg-cream/90 py-2.5 backdrop-blur-md"
      style={{ top: `${headerHeight}px` }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-bark md:inline-block">
          Explore Sanctuary:
        </span>
        <div className="flex w-full items-center justify-start gap-1.5 overflow-x-auto no-scrollbar md:w-auto md:justify-end">
          {navAnchors.map((item) => {
            const isActive = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => scrollToSection(e, item.id)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-canopy text-cream shadow-sm"
                    : "text-ink/75 hover:bg-mist/80 hover:text-ink"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
