import Link from "next/link";
import { site } from "@/content/site";
import { channel, films } from "@/content/teaching";
import { SubscribeBox } from "@/components/SubscribeBox";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-mist/40 bg-dusk text-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-4">
            <Link
              href="/"
              className="inline-flex flex-col leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-bark"
            >
              <span className="font-display text-2xl font-semibold tracking-wide text-cream">
                BA LUBAALE
              </span>
              <span className="text-[11px] font-medium tracking-[0.25em] text-bark-soft uppercase">
                {site.subtitle}
              </span>
            </Link>

            <p className="font-display text-base italic leading-relaxed text-cream/90 max-w-sm">
              &ldquo;May the root hold you. May the fire warm you. May the water
              carry what you are ready to release.&rdquo;
            </p>

            <p className="text-xs tracking-wider text-bark-soft/80 uppercase">
              {site.place}
            </p>

            <div className="pt-2">
              <Link
                href="/apply"
                className="inline-block rounded-md bg-lake px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-lake/80"
              >
                Request an Immersion →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            <div>
              <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
                The Sanctuary
              </p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/the-land" className="text-sm text-cream/70 transition-colors hover:text-leaf">The Land</Link></li>
                <li><Link href="/the-cave" className="text-sm text-cream/70 transition-colors hover:text-leaf">The Cave</Link></li>
                <li><Link href="/the-host" className="text-sm text-cream/70 transition-colors hover:text-leaf">Queen Nalubaale</Link></li>
                <li><Link href="/atelier" className="text-sm text-cream/70 transition-colors hover:text-leaf">The Atelier</Link></li>
                <li><Link href="/stories" className="text-sm text-cream/70 transition-colors hover:text-leaf">Stories from the House</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
                Experiences
              </p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/immersions" className="text-sm text-cream/70 transition-colors hover:text-leaf">Immersions (Retreats)</Link></li>
                <li><Link href="/practices" className="text-sm text-cream/70 transition-colors hover:text-leaf">Day Practices</Link></li>
                <li><Link href="/for-groups" className="text-sm text-cream/70 transition-colors hover:text-leaf">For Groups & Delegations</Link></li>
                <li><Link href="/fire-circle" className="text-sm text-cream/70 transition-colors hover:text-leaf">The Fire Circle</Link></li>
                <li><Link href="/vouchers" className="text-sm text-cream/70 transition-colors hover:text-leaf">Gift Vouchers</Link></li>
                <li><Link href="/apply" className="text-sm text-cream/70 transition-colors hover:text-leaf">Apply for a Stay</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
                Plan Your Visit
              </p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/arrive" className="text-sm text-cream/70 transition-colors hover:text-leaf">How to Arrive</Link></li>
                <li><Link href="/prepare" className="text-sm text-cream/70 transition-colors hover:text-leaf">How to Prepare</Link></li>
                <li><Link href="/faq" className="text-sm text-cream/70 transition-colors hover:text-leaf">Questions & FAQ</Link></li>
                <li><Link href="/policies" className="text-sm text-cream/70 transition-colors hover:text-leaf">Sanctuary Policies</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-cream/15 pt-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
                Hear Her Teachings
              </p>
              <p className="mt-1 text-xs text-cream/60">
                Oral teachings, reflections, and recordings with Queen Nalubaale
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                {films.map((film) => (
                  <Link
                    key={film.id}
                    href="/the-host#hear-her"
                    className="rounded-md border border-cream/15 bg-cream/5 px-3 py-2 text-xs text-cream/80 transition-colors hover:border-leaf/50 hover:text-leaf"
                  >
                    <span className="font-semibold text-leaf">▶</span> {film.title}
                  </Link>
                ))}
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-bark-soft/40 bg-bark/10 px-3 py-2 text-xs font-medium text-bark-soft transition-colors hover:bg-bark/20 hover:text-cream"
                >
                  YouTube: {channel.label} ↗
                </a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
                Direct Contact
              </p>
              <ul className="mt-3 space-y-2 text-sm text-cream/75">
                <li>
                  <span className="text-bark-soft">Email:</span>{" "}
                  <a href={`mailto:${site.contact.email}`} className="transition-colors hover:text-leaf underline decoration-cream/30">
                    {site.contact.email}
                  </a>
                </li>
                <li>
                  <span className="text-bark-soft">WhatsApp:</span>{" "}
                  {site.contact.whatsapp ? (
                    <a href={`https://wa.me/${site.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-leaf">
                      {site.contact.whatsapp}
                    </a>
                  ) : (
                    <span>Available on request upon accepted application</span>
                  )}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-cream/15 pt-8">
          <SubscribeBox />
        </div>

        <div className="mt-12 border-t border-cream/15 pt-8 text-xs leading-relaxed text-cream/50 space-y-2">
          <p>
            Sessions here are traditional, energetic, spiritual, and artisanal. They
            complement and do not replace medical or psychiatric care. The
            sanctuary does not provide emergency or clinical services.
          </p>
          <p>
            Photography and recording are not permitted inside the cave or
            shrines.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-cream/40 text-[11px] gap-2">
            <p>
              © {currentYear} Ba Lubaale Ancestral Sanctuary Kiwamirembe. All rights reserved.
            </p>
            <p>
              Ssese Islands · Lake Victoria · Uganda
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
