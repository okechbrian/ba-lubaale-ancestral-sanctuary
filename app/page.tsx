import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { HearHer } from "@/components/HearHer";
import { MomentsStrip } from "@/components/MomentsStrip";
import { HomeQuickJump } from "@/components/home/HomeQuickJump";
import { ValueStrip } from "@/components/home/ValueStrip";
import { WelcomedSelector } from "@/components/home/WelcomedSelector";
import { ThreeActsStepper } from "@/components/home/ThreeActsStepper";
import { WavyRule, CircleGo } from "@/components/editorial";
import { formatFireDate, nextFireSaturday } from "@/lib/fire-circle/date";
import { resolveContent } from "@/lib/cms";
import { momentsBlockSchema, testimonialsBlockSchema } from "@/lib/cms/blocks";
import { momentsDefault } from "@/content/moments";
import { testimonialsDefault } from "@/content/testimonials";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Ba Lubaale Ancestral Sanctuary Kiwamirembe",
  description:
    "A screened ancestral sanctuary on the Ssese Islands of Lake Victoria, Uganda, offering cave work, root-water cleansing, bark cloth and fibre craft, and quiet time with the land and herd.",
};

export default async function HomePage() {
  const [{ moments }, { one, two, three }] = await Promise.all([
    resolveContent("content:moments", momentsBlockSchema, momentsDefault),
    resolveContent(
      "content:testimonials",
      testimonialsBlockSchema,
      testimonialsDefault,
    ),
  ]);
  const voices = [one, two, three].filter((v) => v.quote.trim() !== "");
  // Same helpers the /fire-circle page uses, so the homepage can never quote a
  // different night than the page it sends the guest to.
  const nextFire = formatFireDate(nextFireSaturday());

  return (
    <>
      {/* ─── Section 1: Hero ─── */}
      <Hero />

      <ValueStrip />

      {/* ─── Section 1a: In-page jump nav ─── */}
      <HomeQuickJump />

      {/* ─── Section 1b: Teaching line ─── */}
      <section className="bg-cream pb-4 pt-10 sm:pt-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
          <p className="font-display text-2xl leading-snug text-ink sm:text-4xl">
            This ground is where the Lubaale of Ssese can be approached, and
            where the teaching is lived.
          </p>
          <WavyRule />
          <Link
            href="/the-host#hear-her"
            className="text-sm font-semibold text-ink underline decoration-bark/50 underline-offset-4 transition-colors hover:text-bark"
          >
            Hear her
          </Link>
        </div>
      </section>

      {/* ─── Section 2: Host Invitation ─── */}
      <section className="bg-cream pb-20 pt-12 sm:pb-28">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:grid-cols-[16rem_1fr] sm:px-6 lg:px-8">
          <Image
            src="/images/host-portrait-headwrap.jpg"
            alt="Queen Nalubaale outdoors in a brown headwrap and gold collar"
            width={320}
            height={400}
            className="hidden aspect-[4/5] w-full rounded-[2rem] object-cover sm:block"
          />
          <blockquote>
            <p className="font-display text-2xl leading-snug text-ink sm:text-4xl">
              &ldquo;I listen to the wave upon the shore, the breath within your
              chest, and the stories carried in the roots of this land. Welcome
              home to yourself.&rdquo;
            </p>
            <cite className="mt-5 block text-sm not-italic font-semibold uppercase tracking-[0.16em] text-bark">
              Queen Nalubaale
            </cite>
          </blockquote>
        </div>
      </section>

      {/* ─── Section 2b: Sanctuary Moments ─── */}
      <MomentsStrip moments={moments} />

      {/* ─── Section 3: Four Land Gateways ─── */}
      <section id="land-gateways" className="bg-cream pb-20 sm:pb-28">
        <div className="mx-auto grid max-w-7xl items-end gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bark">
              The land
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-[0.95] text-ink sm:text-6xl">
              The Land.
            </h2>
            <WavyRule />
            <p className="mt-6 max-w-sm text-ink/70">
              Tropical forest against grassland, fed by a spring in the roots of
              an ancient tree. Free-roaming goats and cows. Naturally fed lake
              fish. An ancient resident tortoise, Mutaka, who is seen most afternoons.
              And more than a hundred caves, three of them open to guests.
            </p>
            <Link
              href="/the-land"
              className="mt-6 inline-block text-sm font-semibold text-ink underline decoration-bark/50 underline-offset-4 hover:text-bark"
            >
              Enter the land
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:col-span-8">
            {/* Cave */}
            <Link href="/the-cave#cave" className="group flex flex-col">
              <div className="rounded-[1.6rem] bg-canopy p-3">
                <Image
                  src="/images/og-cave-shore.jpg"
                  alt="Mossed rock mouth of Nalubaale Cave seen from the water"
                  width={480}
                  height={600}
                  className="aspect-square w-full rounded-[1.1rem] object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:aspect-[4/5] sm:rounded-[1.15rem]"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
                <h3 className="min-w-0 font-display text-base leading-tight text-ink sm:text-xl">Cave</h3>
                <CircleGo />
              </div>
            </Link>

            {/* Lake House */}
            <Link href="/the-land#lake-house" className="group flex flex-col">
              <div className="rounded-[1.6rem] bg-bark-soft p-3">
                <Image
                  src="/images/lake-house.jpg"
                  alt="The Lake House on stilts over Lake Victoria, framed by mango trees"
                  width={480}
                  height={600}
                  className="aspect-square w-full rounded-[1.1rem] object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:aspect-[4/5] sm:rounded-[1.15rem]"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
                <h3 className="min-w-0 font-display text-base leading-tight text-ink sm:text-xl">Lake House</h3>
                <CircleGo />
              </div>
            </Link>

            {/* Forest Spring */}
            <Link href="/the-land#spring" className="group flex flex-col">
              <div className="rounded-[1.6rem] bg-dusk p-3">
                <Image
                  src="/images/forest-roots.jpg"
                  alt="Buttress roots of an ancient tree in the sanctuary forest"
                  width={480}
                  height={600}
                  className="aspect-square w-full rounded-[1.1rem] object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:aspect-[4/5] sm:rounded-[1.15rem]"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
                <h3 className="min-w-0 font-display text-base leading-tight text-ink sm:text-xl">Forest Spring</h3>
                <CircleGo />
              </div>
            </Link>

            {/* Herd & Fire */}
            <Link href="/the-land#herd" className="group flex flex-col">
              <div className="rounded-[1.6rem] bg-ember p-3">
                <Image
                  src="/images/herd-goats.jpg"
                  alt="Free-roaming goats in the sanctuary compound"
                  width={480}
                  height={600}
                  className="aspect-square w-full rounded-[1.1rem] object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:aspect-[4/5] sm:rounded-[1.15rem]"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
                <h3 className="min-w-0 font-display text-base leading-tight text-ink sm:text-xl">Herd & Fire</h3>
                <CircleGo />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section 4: Who Is Welcomed ─── */}
      <section id="who-is-welcomed" className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-4xl font-semibold text-ink sm:text-5xl">
            Who Is Welcomed
          </h2>
          <WavyRule className="mx-auto" />

          <WelcomedSelector />

          <p className="mt-12 text-center text-sm text-ink/60">
            This is not a party island, a drop-in lodge, or a clinical facility.
            Sessions are traditional, energetic, and artisanal; they complement
            and do not replace medical or psychiatric care.
          </p>
        </div>
      </section>

      {/* ─── Section 5: Three Acts ─── */}
      <section id="three-acts" className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-display text-4xl font-semibold text-cream sm:text-5xl">
            Three Acts of an Immersion
          </h2>
          <WavyRule className="mx-auto text-bark-soft!" />

          <ThreeActsStepper />
        </div>
      </section>

      {/* ─── Section 6: Craft as Healing ─── */}
      <section id="craft-healing" className="overflow-hidden">
        <div className="grid lg:grid-cols-12">
          <div className="flex flex-col justify-center bg-bark px-6 py-14 text-cream sm:px-10 lg:col-span-4 lg:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cream/80">
              The atelier
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-[0.95] sm:text-5xl">
              Craft as Healing.
            </h2>
            <WavyRule className="text-cream!" />
            <p className="mt-6 text-cream/90">
              As the fingers work banana fibre, palm leaf, and bark cloth beside
              the fire, intention leaves the mouth and enters the object that
              goes home.
            </p>
            <p className="mt-4 text-cream/90 lg:hidden">
              You do not only speak the intention. You weave it, sew it, and
              carry it home.
            </p>
            <Link
              href="/atelier"
              className="mt-8 text-sm font-semibold underline decoration-cream/50 underline-offset-4"
            >
              Visit the Atelier
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-mist p-4 lg:col-span-5 lg:grid-cols-1 lg:p-8">
            <Image
              src="/images/host-measuring-bark.jpg"
              alt="Mama Nalubaale measuring bark cloth with tape in the banana grove"
              width={800}
              height={520}
              className="col-span-2 aspect-[4/3] w-full rounded-[1.4rem] object-cover lg:col-span-1 lg:aspect-[16/10]"
            />
            <div className="col-span-2 grid grid-cols-2 gap-3 lg:col-span-1">
              <Image
                src="/images/bark-dresses-stand.jpg"
                alt="Finished bark-cloth dresses hanging on a stand among banana trees"
                width={400}
                height={300}
                className="aspect-square w-full rounded-[1.2rem] object-cover"
              />
              <Image
                src="/images/cowrie-four.jpg"
                alt="Four women wearing cowrie strand necklaces"
                width={400}
                height={300}
                className="aspect-square w-full rounded-[1.2rem] object-cover"
              />
            </div>
          </div>
          <div className="hidden flex-col items-center justify-center bg-canopy px-8 py-14 text-center text-cream lg:col-span-3 lg:flex">
            <svg viewBox="0 0 160 160" className="h-40 w-40" aria-hidden="true">
              <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="1" />
              <path
                id="craft-seal"
                d="M80,80 m-52,0 a52,52 0 1,1 104,0 a52,52 0 1,1 -104,0"
                fill="none"
              />
              <text fill="currentColor" fontSize="9" letterSpacing="2.4">
                <textPath href="#craft-seal">
                  WEAVE IT · SEW IT · CARRY IT HOME ·
                </textPath>
              </text>
              <text
                x="80"
                y="84"
                textAnchor="middle"
                fill="currentColor"
                fontSize="13"
                fontFamily="Georgia, serif"
              >
                Home
              </text>
            </svg>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-cream/85">
              You do not only speak the intention. You weave it, sew it, and
              carry it home.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section 7: Host Block ─── */}
      <section id="the-host" className="bg-cream py-20 sm:py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:grid-cols-[18rem_1fr] sm:px-6 lg:px-8">
          <Image
            src="/images/host-portrait-headwrap.jpg"
            alt="Queen Nalubaale, a seer, healer, and master artisan"
            width={360}
            height={440}
            className="mx-auto aspect-[4/5] w-56 rounded-[2rem] object-cover sm:w-full"
          />
          <div className="max-w-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bark">
              Mama Nalubaale
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-none text-ink sm:text-5xl">
              Queen Nalubaale
            </h2>
            <WavyRule />
            <p className="mt-6 text-lg text-ink/70">
              I work with breath, bark, cowrie, root water, and the fire that
              has burned on this shore longer than any of us can remember. This
              sanctuary is not a business I started — it is a place I was given.
            </p>
            <Link
              href="/the-host"
              className="mt-6 inline-block text-sm font-semibold text-ink underline decoration-bark/50 underline-offset-4 hover:text-bark"
            >
              Meet the host
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section 7a: Her voice — the same component /the-host renders ─── */}
      <HearHer />

      {/* ─── Section 7b: Guest voices (hidden while every slot is empty) ─── */}
      {voices.length > 0 && (
        <section className="bg-dusk py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center font-display text-3xl font-semibold text-cream">
              Guest Voices
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {voices.map((v) => (
                <figure
                  key={v.quote}
                  className="flex flex-col rounded-md border border-cream/15 bg-cream/5 p-6"
                >
                  <blockquote className="font-display text-lg leading-relaxed text-cream/90">
                    &ldquo;{v.quote}&rdquo;
                  </blockquote>
                  {v.author.trim() !== "" && (
                    <figcaption className="mt-4 text-sm text-leaf">
                      &mdash; {v.author}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Section 8: Three Stay Cards ─── */}
      <section id="immersions" className="bg-cream py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bark">
            Stays
          </p>
          <h2 className="mt-3 text-center font-display text-4xl font-semibold text-ink sm:text-5xl">
            Immersions.
          </h2>
          <WavyRule className="mx-auto" />
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink/70">
            One household at a time. Private. Screened. Application-gated.
          </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {/* Essential Healing */}
            <div className="flex h-full flex-col overflow-hidden rounded-[1.6rem]">
              <div className="bg-canopy px-6 py-7 text-cream">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/75">
                  3 days / 2 nights
                </p>
                <h3 className="mt-2 font-display text-2xl leading-tight">
                  Essential Healing Immersion
                </h3>
              </div>
              <div className="flex flex-1 flex-col bg-mist p-6">
                <p className="text-sm font-semibold text-ink">
                  Essential from USD 2,200
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ink/70">
                  A cottage, two Lake House readings — diagnostic and fish
                  feeding — one cave healing session, daily root-water cleansing,
                  fireplace release, and a cowrie talisman workshop.
                </p>
                <Link
                  href="/immersions"
                  className="group mt-auto flex items-center justify-between pt-6 text-sm font-semibold text-ink"
                >
                  View details
                  <CircleGo />
                </Link>
              </div>
            </div>

            {/* Master Transformation */}
            <div className="flex h-full flex-col overflow-hidden rounded-[1.6rem]">
              <div className="bg-ember px-6 py-7 text-cream">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/75">
                  5 days / 4 nights
                </p>
                <h3 className="mt-2 font-display text-2xl leading-tight">
                  Master Transformation & Craft
                </h3>
              </div>
              <div className="flex flex-1 flex-col bg-mist p-6">
                <p className="text-sm font-semibold text-ink">
                  Master from USD 4,500
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ink/70">
                  Full sanctuary access, three Lake House sessions, two cave
                  sessions, daily spring cleansing, fireplace release and
                  arbitration, a bark-cloth garment or wall hanging, and custom
                  herbal teas.
                </p>
                <Link
                  href="/immersions"
                  className="group mt-auto flex items-center justify-between pt-6 text-sm font-semibold text-ink"
                >
                  View details
                  <CircleGo />
                </Link>
              </div>
            </div>

            {/* Whole-island buyout */}
            <div className="flex h-full flex-col overflow-hidden rounded-[1.6rem]">
              <div className="bg-dusk px-6 py-7 text-cream">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/75">
                  3 days
                </p>
                <h3 className="mt-2 font-display text-2xl leading-tight">
                  Whole-Island Buyout
                </h3>
              </div>
              <div className="flex flex-1 flex-col bg-mist p-6">
                <p className="text-sm font-semibold text-ink">
                  Buyout from USD 10,000
                </p>
                <p className="mt-4 text-sm leading-relaxed text-ink/70">
                  Exclusive use of the whole land — cave, Lake House, spring,
                  livestock and fireplace, unlimited one-on-one sessions and
                  workshops of the group&apos;s choice, and a private cook using
                  farm milk, lake fish, herbs, and fruit. House food protocol
                  still applies.
                </p>
                <Link
                  href="/immersions"
                  className="group mt-auto flex items-center justify-between pt-6 text-sm font-semibold text-ink"
                >
                  View details
                  <CircleGo />
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-ink/60">
            East Africa resident rates are on{" "}
            <Link href="/practices" className="text-bark underline underline-offset-2">
              /practices
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ─── Section 8b: The fire circle ─── */}
      <section id="fire-circle" className="bg-bark py-20 text-cream sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cream/80">
            One evening a month
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
            The fire circle
          </h2>
          <WavyRule className="mx-auto text-cream!" />
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/90">
            Online. Queen Nalubaale speaks, then there are questions. No class,
            no recording, no chat.
          </p>
          <p className="mt-4 text-cream/90">
            The next one is {nextFire}.
          </p>
          <p className="mt-2 text-cream/90">
            The amount is not on this page. She confirms it if she approves a
            seat.
          </p>
          <Link
            href="/fire-circle#request"
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-cream px-6 py-3 text-sm font-semibold text-bark transition-colors hover:bg-mist sm:w-auto"
          >
            Request a seat
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ─── Section 9: Readiness Strip ─── */}
      <section className="bg-canopy py-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p className="text-cream">
            Ready to sit with what needs sitting with?
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/apply"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-cream px-6 py-2.5 text-sm font-semibold text-canopy transition-colors hover:bg-mist sm:w-auto"
            >
              Request Immersion
            </Link>
            <Link
              href="/prepare"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-cream/40 px-6 py-2.5 text-sm font-semibold text-cream transition-colors hover:border-cream sm:w-auto"
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
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-bark px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-ember sm:w-auto"
          >
            Request an Immersion
          </Link>
        </div>
      </section>
    </>
  );
}
