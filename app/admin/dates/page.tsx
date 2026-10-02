import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { getBlockedDays } from "@/lib/db/availability";
import BlockedDatesAdmin from "@/components/BlockedDatesAdmin";

export const dynamic = "force-dynamic";

export default async function AdminDatesPage() {
  let days: string[] = [];
  let dbMissing = false;
  try {
    days = await getBlockedDays();
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Blocked dates
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Blocked days can never be requested on the apply form — use them for
        maintenance, ceremonies, or personal dates.
      </p>
      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured — blocked dates cannot be managed yet.
        </div>
      ) : (
        <BlockedDatesAdmin days={days} />
      )}
    </div>
  );
}
