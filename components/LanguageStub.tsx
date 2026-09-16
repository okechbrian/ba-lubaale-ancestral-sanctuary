"use client";

export function LanguageStub() {
  return (
    <div className="flex items-center gap-1 text-sm font-medium tracking-wide">
      <span className="text-ink">EN</span>
      <span className="text-bark">|</span>
      <button
        type="button"
        aria-label="Luganda coming"
        className="text-bark/50 cursor-default"
        disabled
      >
        LG
      </button>
    </div>
  );
}
