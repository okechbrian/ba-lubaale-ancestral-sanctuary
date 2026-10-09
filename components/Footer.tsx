import Link from "next/link";
import { site } from "@/content/site";
import { channel, films } from "@/content/teaching";
import { SubscribeBox } from "@/components/SubscribeBox";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-mist bg-cream text-ink">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-4">
            <Link
              href="/"
              className="inline-flex flex-col leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-bark"
            >
              <span className="font-display text-2xl font-semibold tracking-tight text-ink">
                BA LUBAALE
              </span>
              <span className="text-[10px] font-medium tracking-[0.22em] text-bark uppercase">
                {site.subtitle}
              </span>
            </Link>

            <p className="font-display text-lg leading-snug text-ink max-w-sm">
              &ldquo;May the root hold you. May the fire warm you. May the water
              carry what you are ready to release.&rdquo;
            </p>

            <p className="text-[11px] tracking-[0.16em] text-bark uppercase">
              {site.place}
            </p>

            <div className="pt-2">
              <Link
                href="/apply"
                className="inline-flex items-center gap-2 rounded-full bg-bark px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-ember"
              >
                Request an Immersion →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-bark uppercase">
                The Sanctuary
              </p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/the-land" className="text-sm text-ink/70 transition-colors hover:text-bark">The Land</Link></li>
                <li><Link href="/the-cave" className="text-sm text-ink/70 transition-colors hover:text-bark">The Cave</Link></li>
                <li><Link href="/the-host" className="text-sm text-ink/70 transition-colors hover:text-bark">Queen Nalubaale</Link></li>
                <li><Link href="/atelier" className="text-sm text-ink/70 transition-colors hover:text-bark">The Atelier</Link></li>
                <li><Link href="/stories" className="text-sm text-ink/70 transition-colors hover:text-bark">Stories from the House</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-bark uppercase">
                Experiences
              </p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/immersions" className="text-sm text-ink/70 transition-colors hover:text-bark">Immersions (Retreats)</Link></li>
                <li><Link href="/practices" className="text-sm text-ink/70 transition-colors hover:text-bark">Day Practices</Link></li>
                <li><Link href="/for-groups" className="text-sm text-ink/70 transition-colors hover:text-bark">For Groups & Delegations</Link></li>
                <li><Link href="/fire-circle" className="text-sm text-ink/70 transition-colors hover:text-bark">The Fire Circle</Link></li>
                <li><Link href="/vouchers" className="text-sm text-ink/70 transition-colors hover:text-bark">Gift Vouchers</Link></li>
                <li><Link href="/apply" className="text-sm text-ink/70 transition-colors hover:text-bark">Apply for a Stay</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-bark uppercase">
                Plan Your Visit
              </p>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/arrive" className="text-sm text-ink/70 transition-colors hover:text-bark">How to Arrive</Link></li>
                <li><Link href="/prepare" className="text-sm text-ink/70 transition-colors hover:text-bark">How to Prepare</Link></li>
                <li><Link href="/faq" className="text-sm text-ink/70 transition-colors hover:text-bark">Questions & FAQ</Link></li>
                <li><Link href="/policies" className="text-sm text-ink/70 transition-colors hover:text-bark">Sanctuary Policies</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-ink/10 pt-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-bark uppercase">
                Hear Her Teachings
              </p>
              <p className="mt-1 text-xs text-ink/60">
                Oral teachings, reflections, and recordings with Queen Nalubaale
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                {films.map((film) => (
                  <Link
                    key={film.id}
                    href="/the-host#hear-her"
                    className="rounded-full border border-ink/15 px-3 py-2 text-xs text-ink/80 transition-colors hover:border-bark hover:text-bark"
                  >
                    <span className="font-semibold text-bark">▶</span> {film.title}
                  </Link>
                ))}
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-bark/40 px-3 py-2 text-xs font-medium text-bark transition-colors hover:bg-bark hover:text-cream"
                >
                  YouTube: {channel.label} ↗
                </a>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-bark uppercase">
                Direct Contact
              </p>
              <ul className="mt-3 space-y-2 text-sm text-ink/75">
                <li>
                  <span className="text-bark">Email:</span>{" "}
                  <a href={`mailto:${site.contact.email}`} className="transition-colors hover:text-bark underline decoration-ink/20">
                    {site.contact.email}
                  </a>
                </li>
                <li>
                  <span className="text-bark">WhatsApp:</span>{" "}
                  {site.contact.whatsapp ? (
                    <a href={`https://wa.me/${site.contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-bark">
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

        <div className="mt-12 border-t border-ink/10 pt-8">
          <SubscribeBox />
        </div>

        <div className="mt-12 border-t border-ink/10 pt-8 text-xs leading-relaxed text-ink/50 space-y-2">
          <p>
            Sessions here are traditional, energetic, spiritual, and artisanal. They
            complement and do not replace medical or psychiatric care. The
            sanctuary does not provide emergency or clinical services.
          </p>
          <p>
            Photography and recording are not permitted inside the cave or
            shrines.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-ink/45 text-[11px] gap-2">
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
