"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/db/types";

type NumField = {
  name: string;
  label: string;
  value: number;
};

function fieldsFrom(settings: Settings): NumField[] {
  const p = settings.stayPrices;
  return [
    { name: "essential.solo", label: "Essential — solo (USD)", value: p.essential.solo },
    { name: "essential.couple", label: "Essential — couple/family (USD)", value: p.essential.couple },
    { name: "master.solo", label: "Master — solo (USD)", value: p.master.solo },
    { name: "master.couple", label: "Master — couple/family (USD)", value: p.master.couple },
    { name: "buyout.base", label: "Buyout base up to 4 guests (USD)", value: p.buyout.base },
    { name: "buyout.extraGuest", label: "Buyout extra guest (USD)", value: p.buyout.extraGuest },
    { name: "buyout.maxGuests", label: "Buyout max guests", value: p.buyout.maxGuests },
    { name: "depositPercent", label: "Deposit percent (%)", value: settings.depositPercent },
    { name: "ugxRate", label: "UGX per 1 USD", value: settings.ugxRate },
  ];
}

export default function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const initial = fieldsFrom(settings);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((f) => [f.name, String(f.value)])),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const num = (name: string) => Number(values[name]);
    const payload = {
      settings: {
        stay_prices: {
          essential: { solo: num("essential.solo"), couple: num("essential.couple") },
          master: { solo: num("master.solo"), couple: num("master.couple") },
          buyout: {
            base: num("buyout.base"),
            extraGuest: num("buyout.extraGuest"),
            maxGuests: num("buyout.maxGuests"),
          },
        },
        deposit_percent: num("depositPercent"),
        ugx_rate: num("ugxRate"),
      },
    };
    if (Object.values(values).some((v) => !Number.isFinite(Number(v)) || Number(v) <= 0)) {
      setMsg({ ok: false, text: "All values must be positive numbers." });
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMsg({ ok: true, text: "Saved. The apply form and approvals use these numbers." });
        router.refresh();
        return;
      }
      const body: { error?: string } = await res.json().catch(() => ({}));
      if (body.error === "database_not_configured") {
        setMsg({ ok: false, text: "Database not configured — nothing was saved." });
      } else if (body.error === "unauthorized") {
        setMsg({ ok: false, text: "Your session expired. Sign in again." });
      } else {
        setMsg({ ok: false, text: "Save failed. Check the values and try again." });
      }
    } catch {
      setMsg({ ok: false, text: "Network error — nothing was saved." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="grid gap-4 rounded-md border border-mist bg-white p-4 sm:grid-cols-3">
        {initial.map((f) => (
          <div key={f.name}>
            <label
              htmlFor={f.name}
              className="block text-xs font-medium text-ink/60"
            >
              {f.label}
            </label>
            <input
              id={f.name}
              type="number"
              min={1}
              value={values[f.name]}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [f.name]: e.target.value }))
              }
              className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink focus:border-bark focus:outline-none"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-lake px-6 py-2.5 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save settings"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-canopy" : "text-ember"}`}>
            {msg.text}
          </p>
        )}
      </div>
      <p className="text-xs text-ink/50">
        UGX per 1 USD is a placeholder (3900) until you confirm your rate — it
        converts deposit amounts for Pesapal in UGX.
      </p>
    </form>
  );
}
