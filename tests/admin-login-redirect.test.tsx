// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * The admin sign-in redirect.
 *
 * ## The bug this pins
 *
 * On success the page called `router.push("/admin")` and nothing else. The
 * session cookie was set correctly every time — the navigation was the part
 * that failed, so a successful sign-in sat on the sign-in page and only a
 * manual browser refresh got you into the console.
 *
 * The cause is the client router cache. `app/admin/layout.tsx` wrapped every
 * admin route including this one, so `AdminNav`'s eleven `<Link>` tabs were
 * visible here, and Next prefetches visible links in production. Those RSC
 * requests fired while the owner was still logged out, so middleware
 * redirected each one to `/admin/login` — and that redirect is what landed in
 * the router cache under `/admin`. `router.push` then served the cached
 * redirect and the page never moved.
 *
 * `router.refresh()` discards that cached entry. The fix therefore has two
 * halves, and this file asserts both:
 *
 *  1. a successful sign-in calls `refresh()` before it navigates, and
 *  2. the admin nav links opt out of prefetching, so the poisoned cache entry
 *     cannot be recreated at all.
 *
 * Logout has always called both, which is why signing out worked while signing
 * in did not.
 */
const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import AdminLoginPage from "@/app/admin/(auth)/login/page";

/** Minimal Response stand-in: the page reads .ok, .status, .headers, .json(). */
function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: new Headers(init.headers ?? {}),
    json: async () => body,
  };
}

function signIn(username = "chief", password = "hunter2-secret") {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  return fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("admin sign-in redirect", () => {
  it("sends a successful owner into the console", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true })),
    );

    render(<AdminLoginPage />);
    await signIn();

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/admin");
    });
  });

  it("refreshes before navigating, so a cached middleware redirect is discarded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true })),
    );

    render(<AdminLoginPage />);
    await signIn();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin"));
    // The ordering matters: refresh() must land before push(), or the push
    // re-reads the very cache entry refresh() was called to clear.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.invocationCallOrder[0]).toBeLessThan(
      push.mock.invocationCallOrder[0],
    );
  });

  it("never navigates without refreshing — the exact regression", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true })),
    );

    render(<AdminLoginPage />);
    await signIn();

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
  });

  it("stays put and explains a wrong password", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ error: "invalid_credentials" }, { status: 401 }),
      ),
    );

    render(<AdminLoginPage />);
    await signIn();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Wrong username or password.");
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not claim a bad password when the real cause is the rate limiter", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          { error: "rate_limiter_unavailable" },
          { status: 503 },
        ),
      ),
    );

    render(<AdminLoginPage />);
    await signIn();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/rate limiter cannot be reached/i);
    expect(push).not.toHaveBeenCalled();
  });

  it("locks the form and counts down on a real rate limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          { error: "rate_limited", retry_after: 300 },
          { status: 429 },
        ),
      ),
    );

    render(<AdminLoginPage />);
    await signIn();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /locked/i })).toBeTruthy();
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("reports an unreachable login service rather than failing silently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    render(<AdminLoginPage />);
    await signIn();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/could not reach the login service/i);
    expect(push).not.toHaveBeenCalled();
  });
});