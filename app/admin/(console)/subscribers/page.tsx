import Link from "next/link";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listSubscribers } from "@/lib/db/subscribers";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "pending", "confirmed", "unsubscribed"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-ember/10 text-ember",
  confirmed: "bg-canopy/15 text-canopy",
  unsubscribed: "bg-mist text-ink/50",
};

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: Filter = FILTERS.includes(status as Filter)
    ? (status as Filter)
    : "all";

  let rows: Awaited<ReturnType<typeof listSubscribers>> = [];
  let dbMissing = false;
  try {
    rows = await listSubscribers(
      filter === "all" ? undefined : (filter as "pending" | "confirmed" | "unsubscribed"),
    );
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Subscribers</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        People who asked about the stall. Confirmed rows are the only ones we
        actually mail. Use the filters and export when you need the list.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/subscribers" : `/admin/subscribers?status=${f}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === f
                ? "bg-lake text-cream"
                : "border border-mist bg-white text-ink/70 hover:bg-mist"
            }`}
          >
            {f}
          </Link>
        ))}
        <a
          href={`/api/admin/subscribers?format=csv${filter === "all" ? "" : `&status=${filter}`}`}
          className="ml-auto rounded-md border border-lake/40 px-3 py-1.5 text-xs font-semibold text-lake hover:bg-lake/5"
        >
          Export CSV
        </a>
      </div>

      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured - no subscribers available.
        </div>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-mist text-left text-xs uppercase text-ink/50">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Subscribed</th>
              <th className="py-2">Confirmed</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-ink/60">
                  No subscribers in this view.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-mist/60">
                  <td className="py-2 pr-4 font-mono text-xs">{r.email}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[r.status] ?? "bg-mist text-ink/50"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-ink/70">
                    {r.created_at.replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="py-2 text-ink/70">
                    {r.confirmed_at ? r.confirmed_at.replace("T", " ").slice(0, 16) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
