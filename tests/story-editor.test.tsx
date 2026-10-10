// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * A newly written story could not be deleted, and saving it twice failed.
 *
 * The API returns the saved story with its id. The editor typed that response
 * and then never read it, so `draft.id` stayed undefined after a create. Two
 * consequences:
 *
 *  - `remove()` returns immediately when `!draft.id`, so the Delete button
 *    (also gated on `draft.id`) never appeared for anything the owner wrote.
 *  - The next save POSTs without an `id`, which the server treats as another
 *    CREATE. The slug is already taken, so it came back 409 `duplicate_slug`
 *    and the owner was told "Save failed (duplicate_slug)."
 *
 * Storing the returned id fixes both, because the next save is then an upsert.
 */
const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import StoryEditor from "@/components/admin/StoryEditor";

let fetchMock: ReturnType<typeof vi.fn>;

function respond(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    headers: new Headers(),
    json: async () => body,
  };
}

function lastPayload(): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return JSON.parse(String(init.body));
}

function fillStory() {
  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: "The Long Boat" },
  });
  fireEvent.change(screen.getByLabelText(/^body/i), {
    target: { value: "Some words about the crossing." },
  });
}

beforeEach(() => {
  refresh.mockClear();
  push.mockClear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fetchMock = vi.fn(async () =>
    respond({ ok: true, story: { id: "story-42", slug: "the-long-boat" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StoryEditor create then save again", () => {
  it("remembers the id the server assigned", async () => {
    render(<StoryEditor />);
    fillStory();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(lastPayload().id).toBeUndefined(); // a create legitimately has no id
    expect(lastPayload().slug).toBe("the-long-boat");
  });

  it("sends the id on a SECOND save, so the server upserts instead of duplicating", async () => {
    render(<StoryEditor />);
    fillStory();
    const save = screen.getByRole("button", { name: /save/i });
    fireEvent.click(save);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(save);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // The regression: this stayed undefined, so the server was asked to CREATE
    // the same slug twice and answered 409 duplicate_slug.
    expect(lastPayload().id).toBe("story-42");
  });

  it("offers Delete once the story exists", async () => {
    render(<StoryEditor />);
    fillStory();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /delete/i })).toBeTruthy(),
    );
  });

  it("actually deletes, and refreshes so the row leaves the list", async () => {
    render(<StoryEditor />);
    fillStory();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const del = await screen.findByRole("button", { name: /delete/i });
    fireEvent.click(del);

    await waitFor(() => {
      const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(init.method).toBe("DELETE");
      expect(url).toContain("id=story-42");
    });
    // The row must not linger in the client cache.
    expect(push).toHaveBeenCalledWith("/admin/stories");
    expect(refresh).toHaveBeenCalled();
  });

  it("reports a network failure on save instead of appearing to do nothing", async () => {
    fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StoryEditor />);
    fillStory();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/network error/i),
    );
  });

  it("reports a network failure on delete instead of appearing to do nothing", async () => {
    render(
      <StoryEditor
        initial={{
          id: "story-7",
          slug: "x",
          title: "T",
          excerpt: "E",
          body: "B",
          published: false,
          cover_image: "",
          cover_alt: "",
          author: "",
        }}
      />,
    );
    fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toMatch(/network error/i),
    );
    expect(push).not.toHaveBeenCalled();
  });
});