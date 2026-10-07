"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadCmsImage, uploadErrorMessage } from "@/lib/cms/upload";

type Obj = Record<string, unknown>;

function humanize(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isImageRef(v: unknown): v is { src: string; alt: string } {
  return (
    isObj(v) &&
    Object.keys(v).length === 2 &&
    typeof v.src === "string" &&
    typeof v.alt === "string"
  );
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function emptyLike(v: unknown): unknown {
  if (Array.isArray(v)) return [];
  if (isObj(v)) {
    const out: Obj = {};
    for (const [k, val] of Object.entries(v)) out[k] = emptyLike(val);
    return out;
  }
  return typeof v === "string" ? "" : v;
}

const btn =
  "rounded border border-mist bg-cream px-2 py-1 text-xs text-ink/70 hover:bg-mist disabled:opacity-40";

function ArrayControls({
  index,
  total,
  onUp,
  onDown,
  onRemove,
}: {
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={btn}
        disabled={index === 0}
        onClick={onUp}
        aria-label="Move up"
      >
        ↑
      </button>
      <button
        type="button"
        className={btn}
        disabled={index === total - 1}
        onClick={onDown}
        aria-label="Move down"
      >
        ↓
      </button>
      <button
        type="button"
        className={`${btn} text-ember`}
        onClick={onRemove}
        aria-label="Remove item"
      >
        ✕
      </button>
    </div>
  );
}

function ImageField({
  name,
  value,
  onChange,
  images,
  onUploaded,
}: {
  name: string;
  value: { src: string; alt: string };
  onChange: (v: { src: string; alt: string }) => void;
  images: string[];
  onUploaded: (src: string) => void;
}) {
  const known = images.includes(value.src);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    setUploadErr(null);
    try {
      const result = await uploadCmsImage(f);
      if (result.ok) {
        onUploaded(result.publicUrl);
        onChange({ ...value, src: result.publicUrl });
      } else {
        setUploadErr(uploadErrorMessage(result.reason));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border border-mist bg-cream/70 p-3">
      {name && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bark">
          {humanize(name)}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-ink/70">
            Photo
            <select
              className="mt-1 block w-full rounded border border-mist bg-white px-2 py-1.5 text-sm text-ink"
              value={known ? value.src : "__other"}
              onChange={(e) => {
                if (e.target.value !== "__other")
                  onChange({ ...value, src: e.target.value });
              }}
            >
              {!known && value.src && (
                <option value="__other">{value.src}</option>
              )}
              {images.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${btn} mt-2`}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Upload a new photo"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={handleFile}
          />
        </div>
        <label className="block text-sm text-ink/70">
          Alt text (describe the photo)
          <input
            type="text"
            className="mt-1 block w-full rounded border border-mist bg-white px-2 py-1.5 text-sm text-ink"
            value={value.alt}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
          />
        </label>
      </div>
      {uploadErr && <p className="mt-2 text-xs text-ember">{uploadErr}</p>}
    </div>
  );
}

function Field({
  name,
  value,
  onChange,
  images,
  onUploaded,
}: {
  name: string;
  value: unknown;
  onChange: (v: unknown) => void;
  images: string[];
  onUploaded: (src: string) => void;
}) {
  if (isImageRef(value)) {
    return (
      <ImageField
        name={name}
        value={value}
        onChange={onChange}
        images={images}
        onUploaded={onUploaded}
      />
    );
  }

  if (Array.isArray(value)) {
    const template = () => {
      const t = emptyLike(value[0] ?? "");
      if (isObj(t) && typeof t.src === "string" && images.length) {
        t.src = images[0];
        if (typeof t.alt === "string" && !t.alt) t.alt = "Describe the photo";
      }
      return t;
    };
    const setAt = (i: number, v: unknown) => {
      const next = [...value];
      next[i] = v;
      onChange(next);
    };
    const move = (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= value.length) return;
      const next = [...value];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    };
    const remove = (i: number) => onChange(value.filter((_, k) => k !== i));

    return (
      <fieldset className="rounded border border-mist bg-cream/40 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-bark">
          {humanize(name)} ({value.length})
        </legend>
        <div className="space-y-3">
          {value.map((item, i) => (
            <div
              key={i}
              className="rounded border border-mist bg-white/70 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-bark/70">
                  {humanize(name)} #{i + 1}
                </span>
                <ArrayControls
                  index={i}
                  total={value.length}
                  onUp={() => move(i, -1)}
                  onDown={() => move(i, 1)}
                  onRemove={() => remove(i)}
                />
              </div>
              <Field
                name=""
                value={item}
                onChange={(v) => setAt(i, v)}
                images={images}
                onUploaded={onUploaded}
              />
            </div>
          ))}
          <button
            type="button"
            className={btn}
            onClick={() => onChange([...value, template()])}
          >
            + Add {humanize(name).toLowerCase().replace(/s$/, "")}
          </button>
        </div>
      </fieldset>
    );
  }

  if (isObj(value)) {
    const entries = Object.entries(value);
    const isRoot = name === "";
    return (
      <div
        className={
          isRoot
            ? "space-y-4"
            : "rounded border border-mist bg-cream/40 p-3"
        }
      >
        {!isRoot && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bark">
            {humanize(name)}
          </p>
        )}
        <div className="space-y-3">
          {entries.map(([k, v]) => (
            <Field
              key={k}
              name={k}
              value={v}
              onChange={(nv) => onChange({ ...value, [k]: nv })}
              images={images}
              onUploaded={onUploaded}
            />
          ))}
        </div>
      </div>
    );
  }

  if (typeof value === "string") {
    const multiline = value.includes("\n") || value.length > 110;
    return (
      <label className="block text-sm text-ink/70">
        {name ? humanize(name) : ""}
        {multiline ? (
          <textarea
            rows={Math.min(8, Math.max(2, Math.ceil(value.length / 60)))}
            className="mt-1 block w-full rounded border border-mist bg-white px-2 py-1.5 text-sm text-ink"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            type="text"
            className="mt-1 block w-full rounded border border-mist bg-white px-2 py-1.5 text-sm text-ink"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </label>
    );
  }

  return null;
}

type Message = { kind: "ok" | "err"; text: string };

export default function ContentEditor({
  blockKey,
  label,
  blurb,
  initial,
  hasOverride,
  images,
}: {
  blockKey: string;
  label: string;
  blurb?: string;
  initial: unknown;
  hasOverride: boolean;
  images: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<unknown>(() => clone(initial));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Message | null>(null);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [prevInitial, setPrevInitial] = useState(initial);

  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setDraft(clone(initial));
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: blockKey, value: draft }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: { path: (string | number)[]; message: string }[];
      };
      if (res.ok) {
        setMsg({ kind: "ok", text: "Saved. The public page updates within a minute." });
        router.refresh();
      } else if (body.error === "invalid_content") {
        const detail = (body.issues ?? [])
          .slice(0, 3)
          .map((i) => `${i.path.join(".") || "content"}: ${i.message}`)
          .join(" · ");
        setMsg({
          kind: "err",
          text: `Rejected — ${detail || "content did not match the block shape"}`,
        });
      } else if (body.error === "database_not_configured") {
        setMsg({ kind: "err", text: "Database not configured — nothing was saved." });
      } else {
        setMsg({ kind: "err", text: `Save failed (${body.error ?? res.status}).` });
      }
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/content?key=${encodeURIComponent(blockKey)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setMsg({ kind: "ok", text: "Reverted to the in-repo default content." });
        router.refresh();
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg({
          kind: "err",
          text:
            body.error === "database_not_configured"
              ? "Database not configured — nothing was saved."
              : `Reset failed (${body.error ?? res.status}).`,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-mist bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-mist pb-3">
        <h2 className="font-display text-xl font-semibold text-ink">{label}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            hasOverride
              ? "bg-lake/15 text-lake"
              : "bg-mist text-ink/50"
          }`}
        >
          {hasOverride ? "Custom version live" : "Showing default"}
        </span>
        {dirty && (
          <span className="rounded-full bg-ember/10 px-2 py-0.5 text-xs text-ember">
            Unsaved changes
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {hasOverride && (
            <button
              type="button"
              className={btn}
              disabled={busy}
              onClick={reset}
            >
              Revert to default
            </button>
          )}
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={save}
            className="rounded-md bg-lake px-4 py-1.5 text-sm font-semibold text-cream transition-colors hover:bg-lake/80 disabled:opacity-40"
          >
            {busy ? "Working…" : "Save"}
          </button>
        </div>
      </div>

      {blurb && <p className="mb-4 text-sm text-ink/60">{blurb}</p>}
      {msg && (
        <p
          className={`mb-4 rounded-md p-3 text-sm ${
            msg.kind === "ok"
              ? "bg-lake/10 text-lake"
              : "bg-ember/10 text-ember"
          }`}
        >
          {msg.text}
        </p>
      )}

      <Field
        name=""
        value={draft}
        onChange={setDraft}
        images={[...images, ...uploaded.filter((u) => !images.includes(u))]}
        onUploaded={(src) =>
          setUploaded((prev) => (prev.includes(src) ? prev : [...prev, src]))
        }
      />
    </section>
  );
}
