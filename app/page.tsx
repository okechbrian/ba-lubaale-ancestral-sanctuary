import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ba Lubaale Ancestral Sanctuary Kiwamirembe",
  description:
    "A screened ancestral sanctuary on the Ssese Islands of Lake Victoria, Uganda — cave work, root-water cleansing, bark cloth and fibre craft, and quiet time with land and herd.",
};

export default function HomePage() {
  return (
    <>
      {/* ─── Section 1: Hero ─── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Image placeholder */}
        <div className="absolute inset-0 bg-dusk" />
        <img
          src="/images/hero-shore-gathering.jpg"
          alt="Women in rust bark-cloth dresses standing on the Lake Victoria shore"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Dusk overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-dusk/60 via-dusk/50 to-dusk/70" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.3em] text-bark uppercase">
            Ssese Islands · Lake Victoria · Uganda
          </p>
          <h1 className="mt-6 font-display text-5xl font-semibold text-cream sm:text-7xl">
            Ba Lubaale
          </h1>
          <h2 className="mt-2 font-display text-3xl text-bark sm:text-4xl">
            Ancestral Sanctuary
          </h2>
          <p className="mt-6 text-lg text-cream/80 sm:text-xl">
            A living ancestral sanctuary of cave, craft, herd, and lake.
          </p>
          <p className="mt-2 text-sm tracking-widest text-bark/70 uppercase">
            The Weaver&apos;s Sanctuary &amp; Sacred Caves
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/apply"
              className="rounded-md bg-bark px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-bark/90"
            >
              Request an Immersion
            </Link>
            <a
              href="#land-gateways"
              className="rounded-md border border-cream/30 px-8 py-3 text-sm font-semibold text-cream transition-colors hover:border-cream/60"
            >
              Enter the Land
            </a>
          </div>

          <p className="mt-8 text-xs text-cream/50">
            Private. Screened. One household at a time.
          </p>
        </div>
      </section>

      {/* ─── Section 2: Host Invitation ─── */}
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 sm:flex-row sm:px-6 lg:px-8">
          <img
            src="/images/host-portrait-cowrie.jpg"
            alt="Queen Nalubaale wearing cowrie earrings and blue beads"
            className="h-32 w-32 rounded-full object-cover sm:h-40 sm:w-40"
          />
          <blockquote className="text-center sm:text-left">
            <p className="font-display text-2xl leading-relaxed text-ink sm:text-3xl">
              &ldquo;I listen to the wave upon the shore, the breath within your
              chest, and the stories carried in the roots of this land. Welcome
              home to yourself.&rdquo;
            </p>
            <cite className="mt-4 block text-sm not-italic text-bark">
              — Queen Nalubaale, Mama Nalubaale
            </cite>
          </blockquote>
        </div>
      </section>

      {/* ─── Section 3: Four Land Gateways ─── */}
      <section
        id="land-gateways"
        className="bg-mist py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold text-ink">
            The Land
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink/70">
            Ten acres of forest fed by an ancestral spring. A three-chambered
            sacred cave. Free-roaming goats and cows. Naturally fed lake fish.
            An ancient resident tortoise.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Cave */}
            <Link href="/the-cave#cave" className="group block">
              <div className="relative overflow-hidden rounded-md">
                <img
                  src="/images/og-cave-shore.jpg"
                  alt="Mossed rock mouth of Nalubaale Cave seen from the water"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dusk/60 to-transparent" />
                <h3 className="absolute bottom-4 left-4 font-display text-xl text-cream">
                  Cave
                </h3>
              </div>
            </Link>

            {/* Lake House */}
            <Link href="/the-land#lake-house" className="group block">
              <div className="relative overflow-hidden rounded-md">
                <img
                  src="/images/arrival-boat.jpg"
                  alt="Wooden boat crossing the water the Lake House sits on"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dusk/60 to-transparent" />
                <h3 className="absolute bottom-4 left-4 font-display text-xl text-cream">
                  Lake House
                </h3>
              </div>
            </Link>

            {/* Forest Spring */}
            <Link href="/the-land#spring" className="group block">
              <div className="relative overflow-hidden rounded-md">
                <img
                  src="/images/forest-roots.jpg"
                  alt="Buttress roots in the forest fed by an ancestral spring"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dusk/60 to-transparent" />
                <h3 className="absolute bottom-4 left-4 font-display text-xl text-cream">
                  Forest Spring
                </h3>
              </div>
            </Link>

            {/* Herd & Fire */}
            <Link href="/the-land#herd" className="group block">
              <div className="relative overflow-hidden rounded-md">
                <img
                  src="/images/fire-night.jpg"
                  alt="Night bonfire on the shore with free-roaming herd nearby"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dusk/60 to-transparent" />
                <h3 className="absolute bottom-4 left-4 font-display text-xl text-cream">
                  Herd &amp; Fire
                </h3>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section 4: Who Is Welcomed ─── */}
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold text-ink">
            Who Is Welcomed
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-canopy/10">
                <svg className="h-8 w-8 text-canopy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-xl text-ink">Solo Seekers</h3>
              <p className="mt-2 text-sm text-ink/70">
                Individuals ready to sit with themselves in silence, fire, and
                stone.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-canopy/10">
                <svg className="h-8 w-8 text-canopy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-xl text-ink">Couples</h3>
              <p className="mt-2 text-sm text-ink/70">
                Partners seeking fireplace arbitration, root-water cleansing, and
                shared craft.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-canopy/10">
                <svg className="h-8 w-8 text-canopy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-xl text-ink">Families</h3>
              <p className="mt-2 text-sm text-ink/70">
                Households wishing to introduce children to living culture, land,
                and craft.
              </p>
            </div>
          </div>

          <p className="mt-12 text-center text-sm text-ink/60 italic">
            This is not a party island, a drop-in lodge, or a clinical facility.
          </p>
        </div>
      </section>

      {/* ─── Section 5: Three Acts ─── */}
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold text-cream">
            Three Acts of an Immersion
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <span className="text-5xl font-display text-bark">I</span>
              <h3 className="mt-4 font-display text-xl text-cream">Arrival</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Step off the boat onto warm earth. Set down your bag. Let the
                sound of the lake replace the sound of your phone. The first
                evening is simply land.
              </p>
            </div>

            <div className="text-center">
              <span className="text-5xl font-display text-bark">II</span>
              <h3 className="mt-4 font-display text-xl text-cream">Work</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Enter the cave. Sit by the fire. Work with breath, voice, bark
                cloth, and cowrie. The sessions are traditional, energetic, and
                artisanal — guided by the host.
              </p>
            </div>

            <div className="text-center">
              <span className="text-5xl font-display text-bark">III</span>
              <h3 className="mt-4 font-display text-xl text-cream">Return</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Carry home a talisman you made, a garment you wove, and the
                quiet knowledge that you sat with what needed sitting with.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/immersions"
              className="text-sm font-semibold text-bark transition-colors hover:text-bark/80"
            >
              View immersions →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section 6: Craft as Healing ─── */}
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="overflow-hidden rounded-md">
              <img
                src="/images/host-measuring-bark.jpg"
                alt="Queen Nalubaale measuring bark cloth with tape in the banana grove"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <img
                src="/images/bark-dresses-stand.jpg"
                alt="Finished bark-cloth dresses hanging on a stand among banana trees"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md sm:col-span-2 lg:col-span-1">
              <img
                src="/images/cowrie-four.jpg"
                alt="Four women wearing cowrie strand necklaces"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>

          <div className="mt-10 max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-ink">
              Craft as Healing
            </h2>
            <p className="mt-4 text-lg text-ink/70">
              As the fingers work banana fibre, palm leaf, and bark cloth beside
              the fire, intention leaves the mouth and enters the object that
              goes home.
            </p>
            <p className="mt-2 text-lg text-ink/70">
              You do not only speak the intention. You weave it, sew it, and
              carry it home.
            </p>
            <Link
              href="/atelier"
              className="mt-6 inline-block text-sm font-semibold text-ember transition-colors hover:text-ember/80"
            >
              Visit the Atelier →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section 7: Host Block ─── */}
      <section className="bg-mist py-20 sm:py-28">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 sm:flex-row sm:px-6 lg:px-8">
          <img
            src="/images/host-portrait-cowrie.jpg"
            alt="Queen Nalubaale, Mama Nalubaale — seer, healer, and master artisan"
            className="h-48 w-48 rounded-full object-cover sm:h-56 sm:w-56"
          />
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Queen Nalubaale
            </h2>
            <p className="mt-1 text-bark">Mama Nalubaale</p>
            <p className="mt-4 max-w-lg text-ink/70">
              Born on these islands. Trained by the women who kept the cave
              before me. I work with breath, bark, cowrie, root water, and the
              fire that has burned on this shore longer than any of us can
              remember. This sanctuary is not a business I started. It is a
              place I was given.
            </p>
            <Link
              href="/the-host"
              className="mt-4 inline-block text-sm font-semibold text-ember transition-colors hover:text-ember/80"
            >
              Meet the Host →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section 8: Three Stay Cards ─── */}
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold text-ink">
            Immersions
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink/70">
            One household at a time. Private. Screened. Application-gated.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {/* Essential Healing */}
            <div className="rounded-md border border-mist bg-cream p-6">
              <h3 className="font-display text-xl text-ink">
                Essential Healing Immersion
              </h3>
              <p className="mt-1 text-sm text-bark">3 days / 2 nights</p>
              <p className="mt-4 text-sm leading-relaxed text-ink/70">
                Lake House room, organic meals, one cave diagnostic and sound
                session, one root-water spring rinse, cowrie talisman workshop.
              </p>
              <Link
                href="/immersions"
                className="mt-6 inline-block text-sm font-semibold text-ember transition-colors hover:text-ember/80"
              >
                View details →
              </Link>
            </div>

            {/* Master Transformation */}
            <div className="rounded-md border border-mist bg-cream p-6">
              <h3 className="font-display text-xl text-ink">
                Master Transformation &amp; Craft
              </h3>
              <p className="mt-1 text-sm text-bark">5 days / 4 nights</p>
              <p className="mt-4 text-sm leading-relaxed text-ink/70">
                Full sanctuary access, two cave sessions, daily root-water
                cleansing, fireplace arbitration for couples, bark-cloth
                garment or wall hanging, custom herbal teas.
              </p>
              <Link
                href="/immersions"
                className="mt-6 inline-block text-sm font-semibold text-ember transition-colors hover:text-ember/80"
              >
                View details →
              </Link>
            </div>

            {/* Whole-island buyout */}
            <div className="rounded-md border border-mist bg-cream p-6">
              <h3 className="font-display text-xl text-ink">
                Whole-Island Buyout
              </h3>
              <p className="mt-1 text-sm text-bark">3 days</p>
              <p className="mt-4 text-sm leading-relaxed text-ink/70">
                Exclusive ten acres, cave, Lake House, spring, livestock,
                unlimited one-on-one sessions and workshops for the group,
                private cook using farm milk, eggs, fish, and herbs.
              </p>
              <Link
                href="/immersions"
                className="mt-6 inline-block text-sm font-semibold text-ember transition-colors hover:text-ember/80"
              >
                View details →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 9: Readiness Strip ─── */}
      <section className="bg-canopy py-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p className="text-cream">
            Ready to sit with what needs sitting with?
          </p>
          <div className="flex gap-4">
            <Link
              href="/apply"
              className="rounded-md bg-bark px-6 py-2 text-sm font-semibold text-cream transition-colors hover:bg-bark/90"
            >
              Request Immersion
            </Link>
            <Link
              href="/prepare"
              className="rounded-md border border-cream/30 px-6 py-2 text-sm font-semibold text-cream transition-colors hover:border-cream/60"
            >
              How to Prepare
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section 10: Neighbouring Sacred Geography ─── */}
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-3xl font-semibold text-ink">
            Sacred Geography
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink/70">
            The Ssese Islands hold more than this sanctuary. Neighbouring sacred
            sites form a wider pilgrimage landscape across the lake.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="text-center">
              <h3 className="font-display text-lg text-ink">
                Wanema&apos;s Shrine
              </h3>
              <p className="mt-1 text-xs text-bark">Bubeke Island</p>
              <p className="mt-2 text-sm text-ink/60">
                A sacred shrine on a neighbouring island, reached by boat.
                Pilgrimage context, not included in sanctuary stays.
              </p>
            </div>

            <div className="text-center">
              <h3 className="font-display text-lg text-ink">
                Nanziri Waterfalls &amp; Caves
              </h3>
              <p className="mt-1 text-xs text-bark">Bukasa Island</p>
              <p className="mt-2 text-sm text-ink/60">
                Waterfalls and cave systems on a nearby island. Regional sacred
                geography, not on the sanctuary grounds.
              </p>
            </div>

            <div className="text-center">
              <h3 className="font-display text-lg text-ink">
                Buswa Forest &amp; Damula Source
              </h3>
              <p className="mt-1 text-xs text-bark">Regional</p>
              <p className="mt-2 text-sm text-ink/60">
                Forest and ancestral water source. Part of the wider sacred
                landscape of the Ssese Islands.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Section 11: Closing Full-Bleed ─── */}
      <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-dusk" />
        <img
          src="/images/closing-shore.jpg"
          alt="Shore gathering on Lake Victoria at sunset"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-dusk/60" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-display text-2xl text-cream sm:text-3xl">
            Leave the noise. Sit by the fire. Breathe inside the stone.
          </p>
          <Link
            href="/apply"
            className="mt-8 inline-block rounded-md bg-bark px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-bark/90"
          >
            Request an Immersion
          </Link>
        </div>
      </section>
    </>
  );
}
