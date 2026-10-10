/**
 * Tab-change pending state for the admin console.
 *
 * Every admin page is `force-dynamic`, so switching tabs waits on a real
 * database round trip with nothing rendered meanwhile — the console simply
 * froze. /admin/content is the worst case: it fires sixteen Supabase queries
 * for its eight blocks.
 *
 * This is deliberately near-invisible: the admin nav is rendered by the layout,
 * so only the content area shows the placeholder. It exists so a slow query
 * looks like loading rather than like a broken console.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <p className="text-sm text-ink/60">Loading…</p>
      <div className="h-4 w-48 rounded bg-mist/60" />
      <div className="space-y-3">
        <div className="h-20 rounded-md border border-mist bg-white/60" />
        <div className="h-20 rounded-md border border-mist bg-white/60" />
        <div className="h-20 rounded-md border border-mist bg-white/60" />
      </div>
    </div>
  );
}