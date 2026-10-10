// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * Why SettingsForm now sends a partial payload.
 *
 * The form used to submit ALL five settings keys on every save, so saving one
 * field rewrote the other four with whatever the form was showing. Paired with
 * a read that silently substitutes the in-code defaults when the database does
 * not answer, that produced a silent overwrite of real prices: one transient
 * blip while loading the page, one later Save, and the owner's UGX rate and
 * hold days were replaced by defaults with no error anywhere.
 *
 * The page-level guard (getSettingsStrict, and disabling the form when the read
 * fails) is the primary fix. This partial-save behaviour is the second lock,
 * and it holds even if a caller renders the form with defaults by mistake.
 */
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

import SettingsForm from "@/components/SettingsForm";
import type { Settings } from "@/lib/db/types";

const LIVE: Settings = {
  stayPrices: {
    essential: { solo: 2400, couple: 3900 },
    master: { solo: 4800, couple: 7600 },
    buyout: { base: 12000, extraGuest: 1700, maxGuests: 10 },
  },
  depositPercent: 60,
  ugxRate: 4100,
  voucherAmountsUsd: [250, 500],
  holdDays: 7,
};

let fetchMock: ReturnType<typeof vi.fn>;

function lastPayload(): { settings: Record<string, unknown> } {
  const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return JSON.parse(String(init.body));
}

function save() {
  return fireEvent.click(screen.getByRole("button", { name: /save settings/i }));
}

beforeEach(() => {
  refresh.mockClear();
  fetchMock = vi.fn(
    async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ ok: true }) }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SettingsForm partial save", () => {
  it("sends ONLY the field the owner edited", async () => {
    render(<SettingsForm settings={LIVE} />);

    fireEvent.change(screen.getByLabelText(/UGX per 1 USD/i), {
      target: { value: "4200" },
    });
    await save();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const { settings } = lastPayload();

    expect(settings).toEqual({ ugx_rate: 4200 });
    // The regression: these used to ride along on every save.
    expect(settings).not.toHaveProperty("stay_prices");
    expect(settings).not.toHaveProperty("deposit_percent");
    expect(settings).not.toHaveProperty("hold_days");
    expect(settings).not.toHaveProperty("voucher_amounts_usd");
  });

  it("sends only stay_prices when only a price changed", async () => {
    render(<SettingsForm settings={LIVE} />);

    fireEvent.change(screen.getByLabelText(/Master — solo/i), {
      target: { value: "5000" },
    });
    await save();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const { settings } = lastPayload();

    expect(Object.keys(settings)).toEqual(["stay_prices"]);
    expect(settings.stay_prices).toEqual({
      essential: { solo: 2400, couple: 3900 },
      master: { solo: 5000, couple: 7600 },
      buyout: { base: 12000, extraGuest: 1700, maxGuests: 10 },
    });
  });

  it("writes nothing at all when nothing was edited", async () => {
    render(<SettingsForm settings={LIVE} />);
    await save();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/nothing changed/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats re-typing the same number as no change", async () => {
    render(<SettingsForm settings={LIVE} />);

    // 4100 is already the stored UGX rate. A save must not rewrite the row.
    fireEvent.change(screen.getByLabelText(/UGX per 1 USD/i), {
      target: { value: "4100" },
    });
    await save();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/nothing changed/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
 * Worth being precise about: every numeric input carries `min={1}`, so the
 * browser's own constraint validation blocks a submit with a 0 or a negative
 * value BEFORE the form's onSubmit runs at all. A 0 therefore cannot even be
 * submitted, and asserting on that would test jsdom rather than our code.
 *
 * An empty field is the case that reaches the handler, because empty is valid
 * against `min` — and `Number("")` is 0, which the handler must still reject.
 * So this is the genuine second line of defence, not a restatement of the
 * browser's.
 */
it("rejects a blanked-out value even though the browser allows the submit", async () => {
    render(<SettingsForm settings={LIVE} />);

    fireEvent.change(screen.getByLabelText(/Deposit percent/i), {
      target: { value: "" },
    });
    await save();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/positive numbers/i),
    );
    expect(fetchMock).not.toHaveBeenCalled();
});

it("blocks a zero submit at the browser layer, before the handler", async () => {
    render(<SettingsForm settings={LIVE} />);
    const input = screen.getByLabelText(/Deposit percent/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "0" } });
    await save();

    // min={1} on the input means 0 is invalid HTML, so no submit is dispatched
    // and nothing is written.
    expect(input.validity.rangeUnderflow).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to submit when the page disabled it", async () => {
    render(<SettingsForm settings={LIVE} disabled />);
    const button = screen.getByRole("button", { name: /save settings/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await save();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a rejected save without pretending it worked", async () => {
    fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      headers: new Headers(),
      json: async () => ({ error: "database_not_configured" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<SettingsForm settings={LIVE} />);
    fireEvent.change(screen.getByLabelText(/UGX per 1 USD/i), {
      target: { value: "4200" },
    });
    await save();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/not configured/i),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});