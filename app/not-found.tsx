import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.3em] text-bark uppercase">
        Ssese Islands · Lake Victoria · Uganda
      </p>
      <h1 className="mt-6 font-display text-6xl font-semibold text-ink">
        404
      </h1>
      <p className="mt-4 font-display text-2xl text-ink/80">
        The path you walked does not lead here.
      </p>
      <p className="mt-3 max-w-md text-sm text-ink/60">
        Perhaps the boat has not yet arrived, or you have wandered beyond the
        boundary markers. The shore is this way.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-lake px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80"
      >
        Return to the Shore
      </Link>
    </section>
  );
}
