/**
 * Minimal branded HTML document for the double opt-in links. A route handler
 * (not a page) owns the response so the honest status code — 400/404/503 —
 * reaches the browser alongside the message.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function linkPage(opts: {
  title: string;
  heading: string;
  paragraphs: string[];
  tone?: "ok" | "error";
}): string {
  const accent = opts.tone === "error" ? "#8B2E14" : "#22E36A";
  const body = opts.paragraphs
    .map((p) => `<p>${esc(p)}</p>`)
    .join("\n      ");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${esc(opts.title)}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; align-items: center;
        justify-content: center; background: #1b2a28; color: #f4ede0;
        font-family: Georgia, "Times New Roman", serif; padding: 24px; }
      main { max-width: 34rem; background: #f4ede0; color: #1b2a28;
        border-radius: 6px; padding: 32px 28px; }
      h1 { margin: 0 0 16px; font-size: 1.6rem; line-height: 1.25; }
      p { margin: 0 0 12px; line-height: 1.6; font-size: 1rem; }
      p:last-child { margin-bottom: 0; }
      .rule { height: 3px; width: 56px; background: ${accent};
        margin: 0 0 20px; border-radius: 2px; }
      footer { margin-top: 22px; font-size: 0.85rem; opacity: 0.65; }
    </style>
  </head>
  <body>
    <main>
      <div class="rule"></div>
      <h1>${esc(opts.heading)}</h1>
      ${body}
      <footer>Ba Lubaale Ancestral Sanctuary · Ssese Islands, Lake Victoria</footer>
    </main>
  </body>
</html>
`;
}

/** Headers every link response carries: browsers and mail previews must not cache. */
export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "Content-Type": "text/html; charset=utf-8",
};
