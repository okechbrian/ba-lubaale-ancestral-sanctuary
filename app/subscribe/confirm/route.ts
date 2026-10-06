import { DatabaseNotConfiguredError } from "@/lib/db/client";
import { confirmSubscriber } from "@/lib/db/subscribers";
import { sendAndLog } from "@/lib/email/sender";
import { subscriberWelcomeEmail } from "@/lib/email/templates";
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
 * GET /subscribe/confirm — the double opt-in click. Idempotent, honest
 * status codes (400 missing link, 404 unknown link, 503 no database), and
 * the one-and-only moment the welcome email (with its unsubscribe link) is
 * sent. Email failure never changes the page: the subscription is already
 * confirmed at that point.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return page(400, {
      tone: "error",
      title: "Link incomplete",
      heading: "This confirmation link is incomplete",
      paragraphs: [
        "The link is missing its confirmation token. Open the newest confirmation email, or subscribe again to get a fresh link.",
      ],
    });
  }

  try {
    const result = await confirmSubscriber(token);

    if (result.outcome === "confirmed" && result.email && result.unsubToken) {
      try {
        const welcome = subscriberWelcomeEmail(result.unsubToken);
        await sendAndLog(
          "subscriber_welcome",
          result.email,
          welcome.subject,
          welcome.text,
        );
      } catch (err) {
        console.error(
          "subscriber welcome email failed:",
          err instanceof Error ? err.message : "unknown",
        );
      }
      return page(200, {
        title: "Subscription confirmed",
        heading: "You are subscribed",
        paragraphs: [
          "Thank you — this address is now on the sanctuary mailing list. Occasional notes from the land and the household will arrive here.",
        ],
      });
    }

    if (result.outcome === "already") {
      return page(200, {
        title: "Already confirmed",
        heading: "This subscription was already confirmed",
        paragraphs: [
          "There is nothing more to do — this address is on the list.",
        ],
      });
    }

    return page(404, {
      tone: "error",
      title: "Link not recognised",
      heading: "This confirmation link is not valid",
      paragraphs: [
        "The link may have been replaced by a newer one, or it was never issued. Subscribe again to receive a fresh confirmation email.",
      ],
    });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return page(503, {
        tone: "error",
        title: "Subscriptions unavailable",
        heading: "The mailing list is not available right now",
        paragraphs: [
          "The subscription database is not configured on this deployment, so confirmation cannot be completed. Nothing was changed.",
        ],
      });
    }
    console.error(
      "subscribe confirm failed:",
      err instanceof Error ? err.message : "unknown",
    );
    return page(500, {
      tone: "error",
      title: "Confirmation failed",
      heading: "Confirmation could not be completed",
      paragraphs: [
        "Something went wrong on our side. Please try the link again in a moment, or subscribe again for a fresh link.",
      ],
    });
  }
}
