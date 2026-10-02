import Link from "next/link";
import { site } from "@/content/site";
import { channel, films } from "@/content/teaching";

export function Footer() {
  return (
    <footer className="border-t border-mist bg-dusk text-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand + blessing */}
          <div>
            <p className="font-display text-lg font-semibold">BA LUBAALE</p>
            <p className="mt-1 text-xs tracking-widest text-bark-soft uppercase">
              {site.subtitle}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-cream/70">
              May the root hold you. May the fire warm you. May the water carry
              what you are ready to release.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
              Sanctuary
            </p>
            <ul className="mt-3 space-y-2">
              {site.footerSecondary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-cream/70 transition-colors hover:text-leaf"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/arrive"
                  className="text-sm text-cream/70 transition-colors hover:text-leaf"
                >
                  Arrive
                </Link>
              </li>
            </ul>
          </div>

          {/* Hear her */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
              Hear her
            </p>
            <ul className="mt-3 space-y-2">
              {films.map((film) => (
                <li key={film.id}>
                  <Link
                    href="/the-host#hear-her"
                    className="text-sm text-cream/70 transition-colors hover:text-leaf"
                  >
                    {film.title}
                  </Link>
                </li>
              ))}
            </ul>
            <a
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-leaf transition-colors hover:text-leaf/80"
            >
              {channel.label}
            </a>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-bark-soft uppercase">
              Reach Us
            </p>
            <ul className="mt-3 space-y-2 text-sm text-cream/70">
              <li>
                <span className="text-bark-soft">WhatsApp</span>{" "}
                {site.contact.whatsapp || "Available on request"}
              </li>
              <li>
                <span className="text-bark-soft">Email</span>{" "}
                <a
                  href={`mailto:${site.contact.email}`}
                  className="transition-colors hover:text-leaf"
                >
                  {site.contact.email}
                </a>
              </li>
              <li className="pt-2 text-xs text-cream/50">
                {site.place}
              </li>
            </ul>
          </div>
        </div>

        {/* Legal lines */}
        <div className="mt-10 border-t border-cream/10 pt-6 text-xs leading-relaxed text-cream/50">
          <p>
            Sessions here are traditional, energetic, and artisanal. They
            complement and do not replace medical or psychiatric care. The
            sanctuary does not provide emergency or clinical services.
          </p>
          <p className="mt-2">
            Photography and recording are not permitted inside the cave or
            shrines.
          </p>
        </div>
      </div>
    </footer>
  );
}
