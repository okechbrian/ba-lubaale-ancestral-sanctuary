"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Act {
  num: string;
  title: string;
  sub: string;
  image: string;
  alt: string;
  narrative: string[];
  rituals: string[];
  takeaway: string;
}

/**
 * Ritual copy below is drafted from the owner's sanctuary practice and still
 * needs her sign-off before it is treated as canonical — see the CHANGELOG
 * entry for this section. The locked non-medical disclaimer is rendered by
 * `app/page.tsx` directly beneath this component.
 */
const acts: Act[] = [
  {
    num: "I",
    title: "Arrival & Stepping In",
    sub: "Crossing the water & setting down the burden",
    image: "/images/arrival-canoe.jpg",
    alt: "Wooden canoe crossing the waters of Lake Victoria to the sanctuary",
    narrative: [
      "The crossing begins from Entebbe over the vast expanse of Lake Victoria toward the quiet waters of the Ssese archipelago.",
      "Step off the wooden boat onto warm red earth. The first evening asks nothing of you except stillness. Let the gentle roll of the lake waves replace the noise of your phone and city rhythms.",
    ],
    rituals: [
      "Foot washing in lake water",
      "Digital sunset — phones placed into cedar box",
      "Evening lake fish broth & herbal infusion",
      "First night sleep beneath the island stars",
    ],
    takeaway: "You arrive not as a customer, but as someone coming home to their roots.",
  },
  {
    num: "II",
    title: "The Sacred Work",
    sub: "Stone chambers, fire arbitration, & root cleansing",
    image: "/images/fire-night.jpg",
    alt: "Sacred night fire on the shore of Lake Victoria",
    narrative: [
      "Guided by Queen Nalubaale, you cross the mossed threshold into Nalubaale Cave. The air is cool, ancient, and charged with stone and water.",
      "Diagnostic readings reveal what has been blocking energy and life. Beside the eternal fireplace, you speak intentions that leave your mouth and enter the bark cloth and cowrie talisman you weave with your own fingers.",
    ],
    rituals: [
      "Cave diagnostic & trauma release session",
      "Daily forest spring root-water cleansing",
      "Fireplace relationship arbitration & blessing",
      "Bark cloth beating & banana fibre weaving",
    ],
    takeaway: "The work is traditional, energetic, and artisanal. Real, grounded, and unhurried.",
  },
  {
    num: "III",
    title: "The Return",
    sub: "Carrying home the woven intention & quiet strength",
    image: "/images/closing-shore.jpg",
    alt: "Shore gathering on Lake Victoria at golden hour sunset",
    narrative: [
      "Before the sanctuary boat departs, you stand again at the shore with the lake wind on your face.",
      "You do not leave empty-handed or unchanged. You carry home the cowrie talisman you crafted, the bark-cloth garment infused with your spoken prayer, and the peaceful knowing that you sat with what needed sitting with.",
    ],
    rituals: [
      "Closing shore blessing with Queen Nalubaale",
      "Consecration of your hand-made talisman",
      "Packing farm herbal blends for home integration",
      "Quiet boat departure across the lake",
    ],
    takeaway: "A quiet anchor you carry inside you long after you return to the world.",
  },
];

export function ThreeActsStepper() {
  const [activeStep, setActiveStep] = useState(0);
  const current = acts[activeStep];

  return (
    <div className="mt-12">
      {/* Step Indicator Tabs */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 border-b border-cream/20 pb-4">
        {acts.map((act, index) => {
          const isActive = activeStep === index;
          return (
            <button
              key={act.num}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`flex flex-col items-center sm:items-start text-center sm:text-left transition-all p-3 rounded-lg ${
                isActive
                  ? "bg-cream/10 border-b-2 border-bark-soft"
                  : "hover:bg-cream/5 opacity-70 hover:opacity-100"
              }`}
            >
              <span className="font-display text-2xl sm:text-4xl text-bark-soft font-bold">
                Act {act.num}
              </span>
              <span
                className={`mt-1 font-display text-sm sm:text-lg font-semibold ${
                  isActive ? "text-cream" : "text-cream/80"
                }`}
              >
                {act.title.split("&")[0]}
              </span>
              <span className="hidden sm:inline-block mt-0.5 text-xs text-cream/60">
                {act.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Step Content */}
      <div className="mt-8 grid items-center gap-10 lg:grid-cols-12">
        {/* Left: Image with badge (5 cols) */}
        <div className="lg:col-span-5 relative">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg shadow-xl ring-1 ring-cream/10">
            <Image
              src={current.image}
              alt={current.alt}
              fill
              className="object-cover transition-all duration-700"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dusk/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span className="inline-block rounded-full bg-bark px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cream shadow">
                Act {current.num}: {current.title}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Narrative & Rituals (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h3 className="font-display text-2xl sm:text-3xl font-semibold text-cream">
              {current.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-bark-soft">{current.sub}</p>
          </div>

          <div className="space-y-3 text-sm sm:text-base leading-relaxed text-cream/80">
            {current.narrative.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* Rituals Pill List */}
          <div className="rounded-lg border border-cream/15 bg-cream/5 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-bark-soft">
              Living Sanctuary Rhythms
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-xs sm:text-sm text-cream/90">
              {current.rituals.map((ritual, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-leaf shrink-0" />
                  <span>{ritual}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Grounding Takeaway */}
          <p className="border-l-2 border-bark-soft pl-4 font-display text-sm italic text-cream/90">
            &ldquo;{current.takeaway}&rdquo;
          </p>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={activeStep === 0}
                onClick={() => setActiveStep(activeStep - 1)}
                className="rounded-md border border-cream/20 px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:border-cream/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Previous Act
              </button>
              <button
                type="button"
                disabled={activeStep === acts.length - 1}
                onClick={() => setActiveStep(activeStep + 1)}
                className="rounded-md border border-cream/20 px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:border-cream/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next Act →
              </button>
            </div>

            <Link
              href="/immersions"
              className="text-xs font-semibold uppercase tracking-wider text-leaf hover:underline"
            >
              Explore Full Immersions →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
