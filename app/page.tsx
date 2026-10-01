import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { MomentsStrip } from "@/components/MomentsStrip";

export const metadata: Metadata = {
  title: "Ba Lubaale Ancestral Sanctuary Kiwamirembe",
  description:
    "A screened ancestral sanctuary on the Ssese Islands of Lake Victoria, Uganda — cave work, root-water cleansing, bark cloth and fibre craft, and quiet time with land and herd.",
};

export default function HomePage() {
  return (
    <>
      {/* ─── Section 1: Hero ─── */}
      <Hero />

      {/* ─── Section 2: Host Invitation ─── */}
      <section className="bg-cream py-20 sm:py-28">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 sm:flex-row sm:px-6 lg:px-8">
          <Image
            src="/images/host-portrait-headwrap.jpg"
            alt="Queen Nalubaale outdoors in a brown headwrap and gold collar"
            width={224}
            height={224}
            className="h-48 w-48 rounded-full object-cover sm:h-56 sm:w-56"
          />
          <blockquote className="text-center sm:text-left">
            <p className="font-display text-2xl leading-relaxed text-ink sm:text-3xl">
              &ldquo;I listen to the wave upon the shore, the breath within your
              chest, and the stories carried in the roots of this land. Welcome
              home to yourself.&rdquo;
            </p>
            <cite className="mt-4 block text-sm not-italic text-bark">
              — Queen Nalubaale
            </cite>
          </blockquote>
        </div>
      </section>

      {/* ─── Section 2b: Sanctuary Moments ─── */}
      <MomentsStrip />

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
            Tropical forest against grassland, fed by a spring in the roots of
            an ancient tree. Free-roaming goats and cows. Naturally fed lake
            fish. An ancient resident tortoise, Mutaka — seen most afternoons.
            And more than a hundred caves, three of them open to guests.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Cave */}
            <Link href="/the-cave#cave" className="group block">
              <div className="relative overflow-hidden rounded-md">
                <Image
                  src="/images/og-cave-shore.jpg"
                  alt="Mossed rock mouth of Nalubaale Cave seen from the water"
                  width={400}
                  height={300}
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
                <Image
                  src="/images/lake-house.jpg"
                  alt="The Lake House on stilts over Lake Victoria, framed by mango trees"
                  width={400}
                  height={300}
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
                <Image
                  src="/images/forest-roots.jpg"
                  alt="Buttress roots of an ancient tree in the sanctuary forest"
                  width={400}
                  height={300}
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
                <Image
                  src="/images/herd-goats.jpg"
                  alt="Free-roaming goats in the sanctuary compound"
                  width={400}
                  height={300}
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

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <h3 className="font-display text-xl text-ink">Solitude Lovers</h3>
              <p className="mt-3 text-sm text-ink/70">
                People ready to sit with themselves in silence, beside the fire
                and the stones — grounded back to their roots.
              </p>
            </div>

            <div className="text-center">
              <h3 className="font-display text-xl text-ink">Couples</h3>
              <p className="mt-3 text-sm text-ink/70">
                Partners seeking arbitration, a blessing, and a shared craft
                beside the fire. Work done together, not performed for an
                audience.
              </p>
            </div>

            <div className="text-center">
              <h3 className="font-display text-xl text-ink">Families</h3>
              <p className="mt-3 text-sm text-ink/70">
                Households introducing children to living culture, land, herd,
                and ancestral craft. Reunion, arbitration, and a fresh start.
                One household at a time.
              </p>
            </div>

            <div className="text-center">
              <h3 className="font-display text-xl text-ink">
                Retreat Groups
              </h3>
              <p className="mt-3 text-sm text-ink/70">
                A spiritual family — no lies, no hypocrisy. Such a group can
                choose to visit the sanctuary and its grounds together.
              </p>
            </div>

            <div className="text-center">
              <h3 className="font-display text-xl text-ink">Team Building</h3>
              <p className="mt-3 text-sm text-ink/70">
                Teams who come to work together on the land and beside the
                fire.
              </p>
            </div>

            <div className="text-center">
              <h3 className="font-display text-xl text-ink">
                Ekyoto Kya Ba Kyaala
              </h3>
              <p className="mt-3 text-sm text-ink/70">
                An annual gathering of women for rest, womb care, and shared
                talk.
              </p>
            </div>

            <div className="text-center">
              <h3 className="font-display text-xl text-ink">
                Seekers of Healing &amp; Enrichment
              </h3>
              <p className="mt-3 text-sm text-ink/70">
                People tired, stuck, or carrying a lot — ready to shed, let go,
                and start fresh. If that is you, send the application.
              </p>
            </div>
          </div>

          <p className="mt-12 text-center text-sm text-ink/60">
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
              <span className="text-5xl font-display text-bark-soft">I</span>
              <h3 className="mt-4 font-display text-xl text-cream">Arrival</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Step off the boat onto warm earth. Set down your bag. Let the
                sound of the lake replace the sound of your phone. The first
                evening is simply land.
              </p>
            </div>

            <div className="text-center">
              <span className="text-5xl font-display text-bark-soft">II</span>
              <h3 className="mt-4 font-display text-xl text-cream">Work</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/70">
                Enter the cave. Sit by the fire. Work with breath, voice, bark
                cloth, and cowrie. The sessions are traditional, energetic, and
                artisanal — guided by the host.
              </p>
            </div>

            <div className="text-center">
              <span className="text-5xl font-display text-bark-soft">III</span>
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
              className="text-sm font-semibold text-leaf transition-colors hover:text-leaf/80"
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
              <Image
                src="/images/host-measuring-bark.jpg"
                alt="Mama Nalubaale measuring bark cloth with tape in the banana grove"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md">
              <Image
                src="/images/bark-dresses-stand.jpg"
                alt="Finished bark-cloth dresses hanging on a stand among banana trees"
                width={400}
                height={300}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-md sm:col-span-2 lg:col-span-1">
              <Image
                src="/images/cowrie-four.jpg"
                alt="Four women wearing cowrie strand necklaces"
                width={400}
                height={300}
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
              className="mt-6 inline-block text-sm font-semibold text-leaf transition-colors hover:text-leaf/80"
            >
              Visit the Atelier →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section 7: Host Block ─── */}
      <section className="bg-mist py-20 sm:py-28">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 sm:flex-row sm:px-6 lg:px-8">
          <Image
            src="/images/host-portrait-headwrap.jpg"
            alt="Queen Nalubaale — seer, healer, and master artisan"
            width={224}
            height={224}
            className="h-48 w-48 rounded-full object-cover sm:h-56 sm:w-56"
          />
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Queen Nalubaale
            </h2>
            <p className="mt-1 text-bark">Mama Nalubaale</p>
            <p className="mt-4 max-w-lg text-ink/70">
              I work with breath, bark, cowrie, root water, and the fire that has
              burned on this shore longer than any of us can remember. This
              sanctuary is not a business I started. It is a place I was given.
            </p>
            <Link
              href="/the-host"
              className="mt-4 inline-block text-sm font-semibold text-leaf transition-colors hover:text-leaf/80"
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
                A cottage, two Lake House readings — diagnostic and fish
                feeding — one cave healing session, daily root-water cleansing,
                fireplace release, and a cowrie talisman workshop.
              </p>
              <Link
                href="/immersions"
                className="mt-6 inline-block text-sm font-semibold text-leaf transition-colors hover:text-leaf/80"
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
                Full sanctuary access, three Lake House sessions, two cave
                sessions, daily spring cleansing, fireplace release and
                arbitration, a bark-cloth garment or wall hanging, and custom
                herbal teas.
              </p>
              <Link
                href="/immersions"
                className="mt-6 inline-block text-sm font-semibold text-leaf transition-colors hover:text-leaf/80"
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
                Exclusive use of the whole land — cave, Lake House, spring,
                livestock and fireplace, unlimited one-on-one sessions and
                workshops of the group&apos;s choice, and a private cook using
                farm milk, lake fish, herbs, and fruit. House food protocol
                still applies.
              </p>
              <Link
                href="/immersions"
                className="mt-6 inline-block text-sm font-semibold text-leaf transition-colors hover:text-leaf/80"
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
              className="rounded-md bg-lake px-6 py-2 text-sm font-semibold text-cream transition-colors hover:bg-lake/80"
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
        <Image
          src="/images/closing-shore.jpg"
          alt="Shore gathering on Lake Victoria at sunset"
          fill
          priority
          quality={85}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-dusk/60" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-display text-2xl text-cream sm:text-3xl">
            Leave the noise. Sit by the fire. Breathe inside the stone.
          </p>
          <Link
            href="/apply"
            className="mt-8 inline-block rounded-md bg-lake px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80"
          >
            Request an Immersion
          </Link>
        </div>
      </section>
    </>
  );
}
