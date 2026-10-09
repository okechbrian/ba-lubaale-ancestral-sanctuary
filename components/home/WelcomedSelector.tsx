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
    body: "People ready to sit with themselves in deep silence, beside the fire and the stones, where they can be lifted off a weight and grounded back to their roots.",
    pathLabel: "Essential Solo Immersion",
    pathHref: "/immersions",
  },
  {
    id: "seekers",
    category: "individual",
    title: "Seekers of Healing & Enrichment",
    tagline: "Shed, let go, start fresh",
    body: "People who are stressed, tired, lost, or hungry for self-knowing. There is a need to shed, let go, and make a major decision. If this is you, send the application.",
    pathLabel: "Apply for Immersion",
    pathHref: "/apply",
  },
  {
    id: "couples",
    category: "household",
    title: "Couples & Partnerships",
    tagline: "Arbitration, blessing, & shared craft",
    body: "Partners seeking a lasting relationship, arbitration, blessing, and a shared craft beside the fire. Work done together, to keep the two of you together.",
    pathLabel: "Couples Immersion",
    pathHref: "/immersions",
  },
  {
    id: "families",
    category: "household",
    title: "Families & Lineage",
    tagline: "Living culture, reunion, a fresh start",
    body: "Households introducing children to living culture, the land, the herd, the fire, the forest, and ancestral craft. Families seeking reunion, arbitration, youth rehabilitation, and a fresh start.",
    pathLabel: "Family Stays",
    pathHref: "/immersions",
  },
  {
    id: "retreat-groups",
    category: "group",
    title: "Spiritual Circles & Retreats",
    tagline: "A family, not a performance",
    body: "When people of the same frequency meet, they become more than friends. A spiritual family, with no lies and no hypocrisy. Such a family can visit this ground together.",
    pathLabel: "For Groups",
    pathHref: "/for-groups",
  },
  {
    id: "teams",
    category: "group",
    title: "Team Building",
    tagline: "Shared labor, fire, & clarity",
    body: "Teams who come to work with their hands on the land, sit by the fire, and leave with a clearer mind than they arrived with.",
    pathLabel: "Group Enquiries",
    pathHref: "/for-groups",
  },
  {
    id: "ba-kyaala",
    category: "group",
    title: "Ekyoto Kya Ba Kyaala",
    tagline: "Annual gathering of women",
    body: "Women carry the house, the work, and everyone else, and often forget themselves. This gathering is for rest, womb care, shared talk, and the girly deeds that no one else makes time for. Menopause is spoken of here. Someone is listening.",
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
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all min-h-11 ${
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
          className={`rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all min-h-11 ${
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
          className={`rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all min-h-11 ${
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
          className={`rounded-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all min-h-11 ${
            activeTab === "group"
              ? "bg-canopy text-cream shadow-sm"
              : "border border-mist bg-cream text-ink/75 hover:bg-mist/60"
          }`}
        >
          Groups &amp; Circles
        </button>
      </div>

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
