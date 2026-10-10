// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * Admin controls that failed silently.
 *
 * Four separate places used `try { … } finally { setBusy(false) }` with no
 * `catch`. When the fetch rejected, the spinner cleared and no message was set,
 * so Save/Revert/Delete looked like a button that simply did nothing — the
 * owner had no way to tell a failed save from a misclick, and would reasonably
 * assume the content was saved.
 *
 * A fifth case was worse: FireCircleAdmin's `save()` had no try/catch at all
 * AND its `setBusy(false)` sat on the happy path only, so one dropped
 * connection left `busy === true` permanently — the Save button stayed
 * disabled with no message until a full page reload.
 *
 * A sixth: fire-circle approve had no pending state, so a double-click sent two
 * POSTs. The first succeeded; the second came back 409 `not_open` and its error
 * message overwrote the success, making a completed approval read as a failure.
 */
const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import FireCircleAdmin from "@/components/admin/FireCircleAdmin";
import type { FireCircleRequestRow } from "@/lib/fire-circle/types";

const REQUESTS: FireCircleRequestRow[] = [
  {
    id: "req-1",
    name: "Amina",
    email: "amina@example.com",
    message: "I would like a seat.",
    status: "requested",
    created_at: "2026-10-01T00:00:00.000Z",
  } as FireCircleRequestRow,
];

let fetchMock: ReturnType<typeof vi.fn>;

function respond(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    headers: new Headers(),
    json: async () => body,
  };
}

function renderAdmin() {
  return render(
    <FireCircleAdmin
      config={{ fee_usd: null, join_url: null }}
      requests={REQUESTS}
    />,
  );
}

beforeEach(() => {
  refresh.mockClear();
  push.mockClear();
  fetchMock = vi.fn(async () => respond({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("FireCircleAdmin save", () => {
  it("re-enables Save and says so when the network fails", async () => {
    fetchMock = vi.fn(async () => {
      throw new Error("connection reset");
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin();
    const save = screen.getByRole("button", { name: /^save$/i });
    fireEvent.click(save);

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/network error/i),
    );
    // The regression: the button used to stay disabled for good.
    expect((screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports a rejected save rather than showing nothing", async () => {
    fetchMock = vi.fn(async () => respond({ error: "invalid_request" }, 400));
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/could not save/i),
    );
  });

  it("confirms a successful save", async () => {
    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Saved."));
    expect(refresh).toHaveBeenCalled();
  });
});

describe("FireCircleAdmin approve/decline", () => {
  it("blocks a second submission while one is in flight", async () => {
    let release: (value: unknown) => void = () => {};
    fetchMock = vi.fn(
      () => new Promise((resolve) => { release = resolve; }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin();
    const approve = screen.getByRole("button", { name: /approve/i });
    fireEvent.click(approve);

    await waitFor(() =>
      expect((screen.getByRole("button", { name: /working/i }) as HTMLButtonElement).disabled).toBe(
        true,
      ),
    );
    // A second click while the first is pending must not fire another request.
    fireEvent.click(screen.getByRole("button", { name: /working/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release(respond({ ok: true }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Approved."));
  });

  it("does not report a duplicate click as a failure", async () => {
    fetchMock = vi.fn(async () => respond({ error: "not_open" }, 409));
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    // 409 not_open is what a duplicate submission returns. Saying "that
    // request is no longer open" made a successful approval look failed.
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/already handled/i),
    );
  });

  it("explains a missing fee before claiming anything failed", async () => {
    fetchMock = vi.fn(async () => respond({ error: "fee_required" }, 409));
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/set the fee/i),
    );
  });

  it("reports a network failure on approve instead of doing nothing", async () => {
    fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/network error/i),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("re-enables the buttons after a failure", async () => {
    fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);

    renderAdmin();
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() =>
      expect((screen.getByRole("button", { name: /approve/i }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
  });
});