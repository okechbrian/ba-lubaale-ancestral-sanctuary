import type { Metadata } from "next";
import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { listGroupInquiries } from "@/lib/db/growth";
import { MarkInquiryHandled } from "@/components/admin/MarkInquiryHandled";

export const metadata: Metadata = { title: "Group enquiries" };
export const dynamic = "force-dynamic";

/**
 * /admin/inquiries — enquiries from /for-groups.
 *
 * Read-only apart from the handled flag: an enquiry is the operator's record of
 * a real conversation, so nothing here can rewrite or delete what they wrote.
 * No prices are shown or implied — groups are quoted by email.
 */
export default async function AdminInquiriesPage() {
  let inquiries: Awaited<ReturnType<typeof listGroupInquiries>> = [];
  let dbMissing = false;
  try {
    inquiries = await listGroupInquiries();
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) dbMissing = true;
    else throw err;
  }

  const open = inquiries.filter((i) => !i.handled).length;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Group enquiries
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        Enquiries from <code>/for-groups</code>.{" "}
        {open > 0 ? (
          <strong>{open} still open.</strong>
        ) : (
          "Nothing open right now."
        )}{" "}
        Reply by email — the address is on every row.
      </p>

      {dbMissing ? (
        <div className="mt-6 rounded-md border border-ember/40 bg-ember/5 p-6 text-sm text-ink">
          Database not configured — enquiries cannot be listed.
        </div>
      ) : inquiries.length === 0 ? (
        <p className="mt-6 text-sm text-ink/60">No enquiries yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {inquiries.map((i) => (
            <li
              key={i.id}
              className={`rounded-md border p-4 ${
                i.handled ? "border-mist bg-white/60" : "border-bark/40 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium text-ink">{i.name}</span>
                  {i.organisation && (
                    <span className="ml-2 text-ink/60">{i.organisation}</span>
                  )}
                  <a
                    href={`mailto:${i.email}`}
                    className="ml-2 text-lake underline"
                  >
                    {i.email}
                  </a>
                  <div className="mt-1 text-xs text-ink/40">
                    {i.group_size ? `${i.group_size} people · ` : ""}
                    {i.window ? `${i.window} · ` : ""}
                    {i.created_at.replace("T", " ").slice(0, 16)}
                  </div>
                </div>
                <MarkInquiryHandled id={i.id} handled={i.handled} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-ink/80">
                {i.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}