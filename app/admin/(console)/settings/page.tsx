import { DatabaseNotConfiguredError } from "@/lib/db/client";
import {
  getSettingsStrict,
  getUgxRateStaleness,
  SettingsReadError,
} from "@/lib/db/settings";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

/**
 * /admin/settings — the page that writes live prices.
 *
 * It reads with `getSettingsStrict`, NOT `getSettings`, and that distinction is
 * the whole point of this page. The public read quietly substitutes the
 * in-code defaults whenever the database does not answer, which is right for a
 * visitor (a stale price page beats a broken one) and disastrous here: this form
 * submits every value it is shown, so a single transient database blip would
 * render the defaults and then overwrite the owner's real prices with them on
 * the next Save, with no error anywhere. A strict read fails loudly instead, and
 * the form is disabled so the destructive save cannot be performed.
 */
export default async function AdminSettingsPage() {
  let settings;
  let problems: { key: string; message: string }[] = [];
  let readFailure: SettingsReadError | null = null;

  try {
    const strict = await getSettingsStrict();
    settings = strict.settings;
    problems = strict.problems;
  } catch (err) {
    if (err instanceof SettingsReadError) {
      readFailure = err;
    } else if (err instanceof DatabaseNotConfiguredError) {
      readFailure = new SettingsReadError(
        "unconfigured",
        "No database is configured for this deployment.",
      );
    } else {
      throw err;
    }
  }

  // UGX staleness is a secondary signal; never let it mask the primary failure.
  const ugx = await getUgxRateStaleness().catch(() => ({ stale: false, days: null }));

  if (readFailure) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
        <div
          role="alert"
          className="mt-4 rounded-md border border-ember/50 bg-ember/5 p-4 text-sm text-ink"
        >
          <strong>
            {readFailure.reason === "unconfigured"
              ? "No database is configured."
              : "Your saved settings could not be read."}
          </strong>{" "}
          {readFailure.message} Nothing below was loaded, because the numbers this
          page would show are not the live ones.
          <p className="mt-2">
            <strong>Saving is switched off.</strong> If the form were filled in
            and saved now, it would overwrite your real prices with the
            in-code defaults. This usually clears on its own — reload in a moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        These numbers drive approvals, deposit amounts and the calendar. Change
        them here - no code changes needed.
      </p>

      {problems.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-ember/50 bg-ember/5 p-4 text-sm text-ink"
        >
          <strong>
            {problems.length === 1
              ? "One stored value could not be read"
              : `${problems.length} stored values could not be read`}
            :
          </strong>{" "}
          {problems.map((p) => (
            <span key={p.key} className="ml-1">
              <code>{p.key}</code> — {p.message}, showing the default for that one
              field only.
            </span>
          ))}
        </div>
      )}

      {ugx.stale && (
        <div className="mt-4 rounded-md border border-ember/50 bg-ember/5 p-4 text-sm text-ink">
          <strong>UGX rate check:</strong> it was last reviewed{" "}
          {ugx.days === null ? "never (the placeholder is still in use)" : `${ugx.days} days ago`}{" "}
          and should be refreshed every 30 days. Update it below.
        </div>
      )}

      <SettingsForm settings={settings!} />
    </div>
  );
}