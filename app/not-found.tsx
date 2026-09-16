import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 text-center sm:px-6 lg:px-8">
      <h1 className="font-display text-6xl font-semibold text-ink">404</h1>
      <p className="mt-4 text-lg text-ink/70">
        The path you walked does not lead here.
      </p>
      <p className="mt-2 text-sm text-bark">
        Perhaps the boat has not yet arrived, or you have wandered beyond the
        boundary markers.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-ember px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-ember/90"
      >
        Return to the Shore
      </Link>
    </section>
  );
}
