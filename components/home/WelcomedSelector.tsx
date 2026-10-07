"use client";

import { useState } from "react";
import Link from "next/link";

type Category = "all" | "individual" | "household" | "group";

interface WelcomedItem {
  id: string;
  category: "individual" | "household" | "group";
  title: string;
  tagline: string;
  body: string;
  pathLabel: string;
  pathHref: string;
}

const items: WelcomedItem[] = [
  {
    id: "solitude",
    category: "individual",
    title: "Solitude Lovers",
    tagline: "Silence, fire, stone, & lake",
    body: "People ready to sit with themselves in deep silence, beside the ancient hearth and mossed stones, where they can be grounded directly back to their roots without distraction.",
    pathLabel: "Essential Solo Immersion",
    pathHref: "/immersions",
  },
  {
    id: "seekers",
    category: "individual",
    title: "Seekers of Healing & Shedding",
    tagline: "Unburdening & fresh beginnings",
    body: "Those who feel tired, stuck, or are carrying a heavy burden from work, grief, or transitions. You come here to shed, let the root waters wash what is heavy, and start fresh.",
    pathLabel: "Apply for Immersion",
    pathHref: "/apply",
  },
  {
    id: "couples",
    category: "household",
    title: "Couples & Partnerships",
    tagline: "Arbitration, blessing, & shared craft",
    body: "Partners seeking honest arbitration, ancestral blessing, and shared tactile craft beside the night fire. Quiet work done genuinely together, never performed for an audience.",
    pathLabel: "Couples Immersion",
    pathHref: "/immersions",
  },
  {
    id: "families",
    category: "household",
    title: "Families & Lineage",
    tagline: "Living culture & generational peace",
    body: "Households introducing children to living culture, the farm herd, ancient medicinal trees, and ancestral craft. Generational reunion, arbitration, and one household at a time.",
    pathLabel: "Family Stays",
    pathHref: "/immersions",
  },
  {
    id: "retreat-groups",
    category: "group",
    title: "Spiritual Circles & Retreats",
    tagline: "Truth without performance",
    body: "A spiritual family built on truth and humility. Such circles can request whole-island buyout windows or group sessions to sit with the land and sacred caves.",
    pathLabel: "For Groups",
    pathHref: "/for-groups",
  },
  {
    id: "teams",
    category: "group",
    title: "Purpose-Driven Teams",
    tagline: "Shared labor, fire, & clarity",
    body: "Leaders and colleagues who come to ground themselves, work with their hands on the land, and find strategic stillness around the evening hearth.",
    pathLabel: "Group Enquiries",
    pathHref: "/for-groups",
  },
  {
    id: "ba-kyaala",
    category: "group",
    title: "Ekyoto Kya Ba Kyaala",
    tagline: "Annual sacred women's gathering",
    body: "An annual coming-together of women for profound rest, womb care, traditional herbal baths, and honest elder-guided talk around the fire.",
    pathLabel: "Learn about the Circle",
    pathHref: "/for-groups",
  },
];

export function WelcomedSelector() {
  const [activeTab, setActiveTab] = useState<Category>("all");

  const filteredItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item.category === activeTab);

  return (
    <div className="mt-10">
      {/* Category Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "all"
              ? "bg-canopy text-cream shadow-sm"
              : "border border-mist bg-cream text-ink/75 hover:bg-mist/60"
          }`}
        >
          All Guests ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("individual")}
          className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "individual"
              ? "bg-canopy text-cream shadow-sm"
              : "border border-mist bg-cream text-ink/75 hover:bg-mist/60"
          }`}
        >
          Solitude &amp; Seekers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("household")}
          className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "household"
              ? "bg-canopy text-cream shadow-sm"
              : "border border-mist bg-cream text-ink/75 hover:bg-mist/60"
          }`}
        >
          Couples &amp; Households
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("group")}
          className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === "group"
              ? "bg-canopy text-cream shadow-sm"
              : "border border-mist bg-cream text-ink/75 hover:bg-mist/60"
          }`}
        >
          Groups &amp; Circles
        </button>
      </div>

      {/* Grid of Cards */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-lg border border-mist bg-cream p-7 shadow-xs transition-all hover:border-bark/60 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-bark">
                  {item.category === "individual"
                    ? "Solo Journey"
                    : item.category === "household"
                    ? "Shared Hearth"
                    : "Collective"}
                </span>
                <span className="h-2 w-2 rounded-full bg-leaf/70" />
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">
                {item.title}
              </h3>
              <p className="mt-1 text-xs italic text-ink/60">{item.tagline}</p>
              <p className="mt-4 text-sm leading-relaxed text-ink/75">
                {item.body}
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-mist/60">
              <Link
                href={item.pathHref}
                className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-leaf hover:text-leaf/80 transition-colors uppercase"
              >
                <span>{item.pathLabel}</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
