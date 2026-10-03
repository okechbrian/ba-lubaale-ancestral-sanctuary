"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/growth/slug";

export interface StoryDraft {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_image: string;
  cover_alt: string;
  published: boolean;
  author: string;
}

const EMPTY: StoryDraft = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  cover_image: "",
  cover_alt: "",
  published: false,
  author: "",
};

/**
 * Story editor. Slug auto-fills from the title until the owner edits it by hand
 * (then we never touch it again). Cover images use the same Supabase Storage
 * bucket and library as the CMS image picker.
 */
export default function StoryEditor({ initial }: { initial?: StoryDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<StoryDraft>(initial ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);

  function set<K extends keyof StoryDraft>(key: K, value: StoryDraft[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
  }

  async function upload(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/content/images", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.url) {
        setMsg({ ok: false, text: `Upload failed (${body.error ?? res.status}).` });
        return;
      }
      set("cover_image", body.url);
      setMsg({ ok: true, text: "Cover uploaded." });
    } catch {
      setMsg({ ok: false, text: "Upload failed — network error." });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    setIssues([]);
    try {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(draft.id ? { id: draft.id } : {}),
          slug: draft.slug,
          title: draft.title,
          excerpt: draft.excerpt,
          body: draft.body,
          cover_image: draft.cover_image || undefined,
          cover_alt: draft.cover_alt || undefined,
          published: draft.published,
          author: draft.author || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        issues?: { path: string; message: string }[];
        story?: { id: string; slug: string };
      };
      if (!res.ok) {
        if (Array.isArray(body.issues) && body.issues.length > 0) setIssues(body.issues);
        else
          setMsg({
            ok: false,
            text: body.message ?? `Save failed (${body.error ?? res.status}).`,
          });
        return;
      }
      setMsg({
        ok: true,
        text: draft.published ? "Published." : "Saved as a draft.",
      });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error — nothing was saved." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft.id) return;
    if (!window.confirm("Delete this story permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/stories?id=${draft.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setMsg({ ok: false, text: "Delete failed." });
        return;
      }
      router.push("/admin/stories");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-title" className="block text-xs font-medium text-ink/60">
            Title
          </label>
          <input
            id="s-title"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="s-slug" className="block text-xs font-medium text-ink/60">
            Slug (the URL)
          </label>
          <input
            id="s-slug"
            value={draft.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            placeholder="the-boat-at-dawn"
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 font-mono text-sm text-ink"
          />
          <p className="mt-1 text-xs text-ink/40">
            /stories/{draft.slug || "…"} — lowercase letters, numbers, hyphens.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="s-excerpt" className="block text-xs font-medium text-ink/60">
          Excerpt (index card + meta description)
        </label>
        <textarea
          id="s-excerpt"
          rows={2}
          value={draft.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
          className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink"
        />
      </div>

      <div>
        <label htmlFor="s-body" className="block text-xs font-medium text-ink/60">
          Body (blank line = new paragraph)
        </label>
        <textarea
          id="s-body"
          rows={14}
          value={draft.body}
          onChange={(e) => set("body", e.target.value)}
          className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s-cover" className="block text-xs font-medium text-ink/60">
            Cover image
          </label>
          <input
            id="s-cover"
            value={draft.cover_image}
            onChange={(e) => set("cover_image", e.target.value)}
            placeholder="/images/lake-house.jpg or https://…"
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 font-mono text-xs text-ink"
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
            className="mt-2 text-xs text-ink/60"
          />
          {uploading && <p className="text-xs text-ink/40">Uploading…</p>}
          {draft.cover_image && (
            <img
              src={draft.cover_image}
              alt=""
              className="mt-2 aspect-[3/2] w-full rounded object-cover"
            />
          )}
        </div>
        <div>
          <label htmlFor="s-alt" className="block text-xs font-medium text-ink/60">
            Cover alt text
          </label>
          <input
            id="s-alt"
            value={draft.cover_alt}
            onChange={(e) => set("cover_alt", e.target.value)}
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink"
          />
          <label htmlFor="s-author" className="mt-4 block text-xs font-medium text-ink/60">
            Byline (optional — leave empty to credit the house)
          </label>
          <input
            id="s-author"
            value={draft.author}
            onChange={(e) => set("author", e.target.value)}
            className="mt-1 w-full rounded-md border border-mist bg-cream px-3 py-2 text-sm text-ink"
          />
          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => set("published", e.target.checked)}
            />
            Published (visible on /stories and in the sitemap)
          </label>
        </div>
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1 text-xs text-ember">
          {issues.map((i) => (
            <li key={`${i.path}-${i.message}`}>{i.message}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-lake px-5 py-2.5 text-sm font-semibold text-cream hover:bg-lake/80 disabled:opacity-60"
        >
          {busy ? "Saving…" : draft.published ? "Update story" : "Save draft"}
        </button>
        {draft.id && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-xs font-semibold text-ember"
          >
            Delete
          </button>
        )}
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-canopy" : "text-ember"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}