import Link from "next/link";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listBookings } from "@/lib/db/bookings";

export const dynamic = "force-dynamic";

const FILTERS = ["pending", "approved", "paid", "declined", "all"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-ember/10 text-ember",
  approved: "bg-lake/15 text-lake",
  paid: "bg-canopy/15 text-canopy",
  declined: "bg-mist text-ink/50",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: Filter = FILTERS.includes(status as Filter)
    ? (status as Filter)
    : "pending";

  let bookings: Awaited<ReturnType<typeof listBookings>> = [];
  let dbMissing = false;
  try {
    bookings = await listBookings(filter === "all" ? undefined : filter);
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Booking requests
      </h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "pending" ? "/admin" : `/admin?status=${f}`}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${
              filter === f
                ? "bg-dusk font-semibold text-cream"
                : "bg-mist text-ink/70 hover:bg-mist/70"
            }`}
          >
            {f}
          </Link>
        ))}
      </div>

      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured. Set <code>SUPABASE_URL</code> and{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> and apply the migration in{" "}
          <code>supabase/migrations/</code> — see README → Engineering setup.
        </div>
      ) : bookings.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">Nothing here yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-mist">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist/60 text-xs uppercase text-ink/60">
              <tr>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Stay</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist bg-white">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-cream">
                  <td className="px-4 py-3 text-ink/60">
                    {b.created_at.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="font-medium text-lake hover:underline"
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {b.check_in} → {b.check_out}
                  </td>
                  <td className="px-4 py-3 text-ink/70">{b.stay_slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[b.status] || ""}`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/70">
                    {b.amount_usd ? `$${Number(b.amount_usd).toLocaleString("en-US")}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
