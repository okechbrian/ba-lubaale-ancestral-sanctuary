export function WavyRule({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 14"
      className={`mt-4 block h-3 w-32 text-bark ${className}`}
      aria-hidden="true"
    >
      <path
        d="M1 8c8-8 16-8 24 0s16 8 24 0 16-8 24 0 16 8 24 0 16-8 24 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CircleGo() {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bark text-cream transition-transform duration-300 group-hover:scale-105"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          d="M5 10h10M11 6l4 4-4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
