import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { unsubscribeSubscriber } from "@/lib/db/subscribers";
import { linkPage, NO_STORE_HEADERS } from "@/lib/subscribe/link-page";

export const dynamic = "force-dynamic";

function page(
  status: number,
  opts: Parameters<typeof linkPage>[0],
): Response {
  return new Response(linkPage(opts), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

/**
 * GET /subscribe/unsubscribe — one click, no login, idempotent.
 * 400 missing link · 404 unknown link · 503 no database · 200 done/already.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return page(400, {
      tone: "error",
      title: "Link incomplete",
      heading: "This unsubscribe link is incomplete",
      paragraphs: [
        "The link is missing its token. Use the unsubscribe link from one of the emails you received, or reply to any email and ask to be removed.",
      ],
    });
  }

  try {
    const outcome = await unsubscribeSubscriber(token);

    if (outcome === "unsubscribed") {
      return page(200, {
        title: "Unsubscribed",
        heading: "You have been unsubscribed",
        paragraphs: [
          "This address will receive no further mailing-list emails. The site, booking and payment emails are unaffected.",
        ],
      });
    }

    if (outcome === "already") {
      return page(200, {
        title: "Already unsubscribed",
        heading: "This address was already unsubscribed",
        paragraphs: ["There is nothing more to do — no further emails will be sent."],
      });
    }

    return page(404, {
      tone: "error",
      title: "Link not recognised",
      heading: "This unsubscribe link is not valid",
      paragraphs: [
        "The link may have been replaced by a newer one. Use the link from a recent email, or reply to any email and ask to be removed.",
      ],
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return page(503, {
        tone: "error",
        title: "Subscriptions unavailable",
        heading: "The mailing list is not available right now",
        paragraphs: [
          "The subscription database is not configured on this deployment, so the change could not be applied. Nothing was changed.",
        ],
      });
    }
    console.error(
      "subscribe unsubscribe failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return page(500, {
      tone: "error",
      title: "Unsubscribe failed",
      heading: "The change could not be applied",
      paragraphs: [
        "Something went wrong on our side. Please try the link again in a moment, or reply to any email and ask to be removed.",
      ],
    });
  }
}
