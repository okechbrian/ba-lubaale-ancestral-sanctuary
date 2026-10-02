import Link from "next/link";

export type InlineSegment = { text: string; href?: string };

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function isSafeHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("https://");
}

/**
 * Tiny inline parser for owner-edited copy: `[label](/href)` becomes a link;
 * everything else is literal. No other markdown is interpreted.
 */
export function parseInlineLinks(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    if (isSafeHref(m[2])) out.push({ text: m[1], href: m[2] });
    else out.push({ text: `${m[1]}(${m[2]})` });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export default function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInlineLinks(text).map((seg, i) =>
        seg.href ? (
          <Link
            key={i}
            href={seg.href}
            className="font-semibold text-leaf hover:underline"
          >
            {seg.text}
          </Link>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
