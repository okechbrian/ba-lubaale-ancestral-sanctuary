import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FireCirclePay from "@/components/FireCirclePay";
import { getFireCircleConfig, getFireCircleRequestByHash } from "@/lib/db/fire-circle";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { formatFireDate, nextFireSaturday } from "@/lib/fire-circle/date";
import { hashSeatToken } from "@/lib/fire-circle/token";

export const metadata: Metadata = {
  title: "Your fire circle seat",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function FireCircleSeatPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();

  let row;
  try {
    row = await getFireCircleRequestByHash(await hashSeatToken(token));
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return (
        <main className="bg-cream py-20">
          <div className="mx-auto max-w-xl px-4 text-ink/70">
            The seat list is not available right now.
          </div>
        </main>
      );
    }
    throw err;
  }
  if (!row || row.status === "requested") notFound();

  const when = formatFireDate(nextFireSaturday());

  return (
    <main className="bg-cream py-20">
      <div className="mx-auto max-w-xl px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bark">
          Fire circle
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
          {row.name.split(" ")[0]}, your seat
        </h1>
        <p className="mt-3 text-ink/70">Next evening: {when}. Her voice, then questions.</p>

        {row.status === "declined" && (
          <p className="mt-8 text-ink/80">This request was not accepted. Nothing has been paid.</p>
        )}

        {row.status === "approved" && row.fee_usd && (
          <FireCirclePay token={token} feeUsd={row.fee_usd} />
        )}

        {row.status === "paid" && <PaidSeat />}
      </div>
    </main>
  );
}

async function PaidSeat() {
  let join: string | null = null;
  try {
    join = (await getFireCircleConfig()).join_url;
  } catch {
    join = null;
  }
  if (!join) {
    return (
      <p className="mt-8 text-ink/80">
        Your seat is paid. The way in for this evening has not been placed yet.
        It will be on this page when it is.
      </p>
    );
  }
  return (
    <div className="mt-8">
      <p className="text-ink/80">Your seat is paid. This is the way in for the evening.</p>
      <a
        href={join}
        className="mt-4 inline-block rounded-md bg-lake px-6 py-3 text-sm font-semibold text-cream"
        rel="noopener noreferrer"
      >
        Enter the circle
      </a>
    </div>
  );
}
