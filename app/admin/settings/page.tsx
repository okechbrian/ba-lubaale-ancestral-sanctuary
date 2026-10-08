import { getSettings, getUgxRateStaleness } from "@/lib/db/settings";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, ugx] = await Promise.all([
    getSettings(),
    getUgxRateStaleness(),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        These numbers drive approvals, deposit amounts and the calendar. Change
        them here - no code changes needed.
      </p>

      {ugx.stale && (
        <div className="mt-4 rounded-md border border-ember/50 bg-ember/5 p-4 text-sm text-ink">
          <strong>UGX rate check:</strong> it was last reviewed{" "}
          {ugx.days === null ? "never (the placeholder is still in use)" : `${ugx.days} days ago`}{" "}
          and should be refreshed every 30 days. Update it below.
        </div>
      )}

      <SettingsForm settings={settings} />
    </div>
  );
}