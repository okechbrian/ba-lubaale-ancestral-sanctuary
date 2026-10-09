const items = [
  {
    title: "Screened",
    body: "One household at a time",
    icon: "screen",
  },
  {
    title: "The cave",
    body: "Three open to guests",
    icon: "cave",
  },
  {
    title: "The lake",
    body: "Lake Victoria",
    icon: "lake",
  },
  {
    title: "The herd",
    body: "Goats and cows",
    icon: "herd",
  },
] as const;

function Mark({ name }: { name: (typeof items)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 32 32",
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "screen") {
    return (
      <svg {...common}>
        <circle cx="16" cy="16" r="8" />
        <path d="M16 4v3M16 25v3M4 16h3M25 16h3" />
      </svg>
    );
  }
  if (name === "cave") {
    return (
      <svg {...common}>
        <path d="M4 24V16c0-8 5-12 12-12s12 4 12 12v8" />
        <path d="M12 24v-5a4 4 0 0 1 8 0v5" />
      </svg>
    );
  }
  if (name === "lake") {
    return (
      <svg {...common}>
        <path d="M4 14c2 2 4 2 6 0s4-2 6 0 4 2 6 0 4-2 6 0" />
        <path d="M4 20c2 2 4 2 6 0s4-2 6 0 4 2 6 0 4-2 6 0" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="11" cy="14" r="3" />
      <circle cx="21" cy="14" r="3" />
      <path d="M6 23c1.2-3 3.2-4.5 5-4.5S15 20 16 23" />
      <path d="M16 23c1-3 3-4.5 5-4.5s3.8 1.5 5 4.5" />
    </svg>
  );
}

export function ValueStrip() {
  return (
    <section className="border-y border-ink/10 bg-mist" aria-label="The house">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <li
            key={item.title}
            className={`flex items-center gap-3 px-5 py-5 sm:px-7 ${
              i > 0 ? "lg:border-l lg:border-ink/10" : ""
            } ${i % 2 === 1 ? "border-l border-ink/10 lg:border-l" : ""} ${
              i >= 2 ? "border-t border-ink/10 lg:border-t-0" : ""
            }`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bark/30 text-bark">
              <Mark name={item.icon} />
            </span>
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">
                {item.title}
              </span>
              <span className="mt-0.5 block text-xs text-ink/60">{item.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
