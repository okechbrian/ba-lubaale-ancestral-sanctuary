import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The homepage in-page jump nav (components/home/HomeQuickJump.tsx) scrolls to
 * sections by id. A typo or a dropped anchor id produces a link that silently
 * does nothing on the busiest page of the site, and nothing else in the build
 * would catch it — these are runtime DOM lookups.
 *
 * So the nav's anchor list is parsed out of the source and checked against the
 * ids the homepage actually renders. It also pins the locked non-medical
 * disclaimer, which the interactive rewrite could otherwise have dropped.
 */
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const quickJump = read("components/home/HomeQuickJump.tsx");
const homepage = read("app/page.tsx");

/** The id="..." values in the nav's anchor table. */
function navAnchorIds(): string[] {
  const table = quickJump.slice(
    quickJump.indexOf("const navAnchors"),
    quickJump.indexOf("];", quickJump.indexOf("const navAnchors")),
  );
  return [...table.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** Every id="..." the homepage renders. */
function homepageSectionIds(): string[] {
  return [...homepage.matchAll(/\sid="([a-z0-9-]+)"/g)].map((m) => m[1]);
}

describe("HomeQuickJump anchors resolve on the homepage", () => {
  const anchors = navAnchorIds();
  const ids = homepageSectionIds();

  it("declares anchors", () => {
    expect(anchors.length).toBeGreaterThan(0);
  });

  it("points only at ids the homepage actually renders", () => {
    // The specific failure this guards: a dead #anchor on the homepage.
    const dead = anchors.filter((id) => !ids.includes(id));
    expect(dead, `dead jump-nav anchors: ${dead.join(", ")}`).toEqual([]);
  });

  it("keeps its six sections", () => {
    expect(anchors).toEqual([
      "land-gateways",
      "who-is-welcomed",
      "three-acts",
      "craft-healing",
      "the-host",
      "immersions",
    ]);
  });

  it("uses unique section ids, so getElementById is unambiguous", () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps real hrefs so the links survive without JS", () => {
    expect(quickJump).toMatch(/href=\{`#\$\{item\.id\}`\}/);
    expect(quickJump).toMatch(/href=\{`#\$\{anchor\.id\}`\}|href=\{`#/);
  });

  it("measures the header instead of hardcoding its height", () => {
    // The header was rebuilt with a variable height (it changes on scroll), so a
    // fixed `top-[58px]` would drift out of alignment with it.
    expect(quickJump).not.toMatch(/top-\[\d+px\]/);
    expect(quickJump).toMatch(/querySelector\("header"\)/);
    expect(quickJump).toMatch(/style=\{\{ top: `\$\{headerHeight\}px` \}\}/);
  });

  it("does not hijack the click when the target is missing", () => {
    // preventDefault before the null check would strand the user at the top of
    // the page with no navigation at all.
    const idx = quickJump.indexOf("const scrollToSection");
    const body = quickJump.slice(idx, idx + 600);
    expect(body.indexOf("if (!el) return")).toBeLessThan(body.indexOf("e.preventDefault()"));
  });
});

describe("interactive sections replace static markup without losing locked copy", () => {
  it("uses the interactive components", () => {
    expect(homepage).toMatch(/import \{ WelcomedSelector \}/);
    expect(homepage).toMatch(/import \{ ThreeActsStepper \}/);
    expect(homepage).toMatch(/import \{ HomeQuickJump \}/);
    expect(homepage).toMatch(/<WelcomedSelector \/>/);
    expect(homepage).toMatch(/<ThreeActsStepper \/>/);
    expect(homepage).toMatch(/<HomeQuickJump \/>/);
  });

  it("keeps the locked non-medical disclaimer on the Who Is Welcomed section", () => {
    // MASTER_PROMPT requires: sessions complement and do not replace medical or
    // psychiatric care. The interactive rewrite dropped this line once already.
    const section = homepage.slice(
      homepage.indexOf('id="who-is-welcomed"'),
      homepage.indexOf('id="three-acts"'),
    );
    expect(section).toMatch(/do not replace medical or psychiatric care/);
    expect(section).toMatch(/not a party island/);
  });

  it("still carries the locked prices and the no-shop rule", () => {
    expect(homepage).toMatch(/from USD 2,200/);
    expect(homepage).toMatch(/from USD 4,500/);
    expect(homepage).toMatch(/from USD 10,000/);
    expect(homepage).not.toMatch(/\/shop\b/);
  });

  it("never publishes the owner's personal number", () => {
    expect(homepage).not.toContain("0706559119");
  });
});

describe("ThreeActsStepper assets exist", () => {
  const stepper = read("components/home/ThreeActsStepper.tsx");

  it("references only images that are committed", () => {
    const imgs = [...stepper.matchAll(/image:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(imgs.length).toBeGreaterThan(0);
    for (const src of imgs) {
      expect(src.startsWith("/images/")).toBe(true);
      // next/image throws at build time on a missing src, but asserting here
      // names the exact file rather than surfacing a generic build error.
      expect(
        readFileSync(join(process.cwd(), "public", src), "utf8").length,
        `missing asset ${src}`,
      ).toBeGreaterThan(0);
    }
  });

  it("gives every image real alt text", () => {
    for (const m of stepper.matchAll(/alt:\s*"([^"]*)"/g)) {
      expect(m[1].trim().length).toBeGreaterThan(10);
    }
  });
});