import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Public pages must show what the owner actually saved.
 *
 * /immersions hardcoded every price as a JSX literal and /policies wrote "50%"
 * four times, while the same numbers lived in /admin/settings and drove every
 * checkout. So editing a price moved the charge a guest pays and left the page
 * they read to decide still advertising the old figure — the exact opposite of
 * what the settings page promises ("Change them here - no code changes
 * needed").
 *
 * These tests pin the rendering to `getSettings`. They assert the OUTPUT moves
 * when the stored settings move, rather than merely that the code calls the
 * function, because the bug was never a missing call — it was a number written
 * down instead of read.
 */
const settings = {
  stayPrices: {
    essential: { solo: 2200, couple: 3600 },
    master: { solo: 4500, couple: 7200 },
    buyout: { base: 10000, extraGuest: 1500, maxGuests: 8 },
  },
  depositPercent: 50,
  ugxRate: 3900,
  voucherAmountsUsd: [],
  holdDays: 3,
};

const getSettings = vi.fn(async () => settings);

vi.mock("@/lib/db/settings", () => ({
  getSettings: () => getSettings(),
}));

import ImmersionsPage from "@/app/immersions/page";
import PoliciesPage from "@/app/policies/page";

/** Render the returned React tree to text without a DOM. */
async function renderToText(node: unknown): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const element = (await node) as Parameters<typeof renderToStaticMarkup>[0];
  return renderToStaticMarkup(element);
}

afterEach(() => {
  getSettings.mockClear();
});

describe("/immersions prices", () => {
  it("shows the prices held in the database, not numbers written into the page", async () => {
    settings.stayPrices = {
      essential: { solo: 2400, couple: 3900 },
      master: { solo: 4800, couple: 7600 },
      buyout: { base: 12000, extraGuest: 1700, maxGuests: 10 },
    };
    const html = await renderToText(ImmersionsPage());
    expect(html).toContain("2,400");
    expect(html).toContain("3,900");
    expect(html).toContain("4,800");
    expect(html).toContain("7,600");
    expect(html).toContain("12,000");
    expect(html).toContain("1,700");
    expect(html).toContain("10");
  });

  it("stops advertising the old hardcoded figures", async () => {
    settings.stayPrices = {
      essential: { solo: 2400, couple: 3900 },
      master: { solo: 4800, couple: 7600 },
      buyout: { base: 12000, extraGuest: 1700, maxGuests: 10 },
    };
    const html = await renderToText(ImmersionsPage());
    for (const stale of ["2,200", "3,600", "4,500", "7,200", "10,000", "1,500"]) {
      expect(html).not.toContain(`USD ${stale}`);
    }
  });

  it("re-renders when the stored price changes", async () => {
    settings.stayPrices = {
      essential: { solo: 2400, couple: 3900 },
      master: { solo: 4800, couple: 7600 },
      buyout: { base: 12000, extraGuest: 1700, maxGuests: 10 },
    };
    const first = await renderToText(ImmersionsPage());

    settings.stayPrices = {
      essential: { solo: 9999, couple: 3900 },
      master: { solo: 4800, couple: 7600 },
      buyout: { base: 12000, extraGuest: 1700, maxGuests: 10 },
    };
    const second = await renderToText(ImmersionsPage());

    expect(first).toContain("2,400");
    expect(second).toContain("9,999");
    expect(second).not.toContain("2,400");
  });

  it("formats with thousands separators the way the rest of the console does", async () => {
    settings.stayPrices = {
      essential: { solo: 2200, couple: 3600 },
      master: { solo: 4500, couple: 7200 },
      buyout: { base: 10000, extraGuest: 1500, maxGuests: 8 },
    };
    const html = await renderToText(ImmersionsPage());
    expect(html).toContain("USD 2,200");
    expect(html).toContain("USD 10,000");
  });
});

describe("/policies deposit percentage", () => {
  it("uses the saved percentage rather than a literal 50%", async () => {
    settings.depositPercent = 40;
    const html = await renderToText(PoliciesPage());
    expect(html).toContain("40%");
    expect(html).not.toContain("50%");
  });

  it("updates when the owner changes the percentage", async () => {
    settings.depositPercent = 60;
    const first = await renderToText(PoliciesPage());
    settings.depositPercent = 25;
    const second = await renderToText(PoliciesPage());

    expect(first).toContain("60%");
    expect(second).toContain("25%");
    expect(second).not.toContain("60%");
  });

  it("publishes the same percentage the checkout charges", async () => {
    // The failure mode this prevents: the policy page says 50% while the
    // deposit actually taken is 40%.
    settings.depositPercent = 40;
    const html = await renderToText(PoliciesPage());
    const occurrences = html.match(/40%/g) ?? [];
    // Deposits section and the two cancellation figures.
    expect(occurrences.length).toBeGreaterThanOrEqual(4);
  });
});