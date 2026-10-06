import { getSettings } from "@/lib/db/settings";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        These numbers drive approvals, deposit amounts and the calendar. Change
        them here — no code changes needed.
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
