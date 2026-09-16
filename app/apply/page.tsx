import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply",
  description:
    "Request an immersion at Ba Lubaale Ancestral Sanctuary. This is a request, not a confirmed booking.",
};

export default function ApplyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-dusk py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-semibold text-cream sm:text-5xl">
            Request an Immersion
          </h1>
          <p className="mt-3 max-w-xl text-cream/80">
            This is a request, not a confirmed booking. If there is a fit, we
            will write or WhatsApp within several days to arrange a short
            discovery conversation. Please do not book flights until we confirm
            the boat.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <form className="space-y-6">
            {/* 1. Full name */}
            <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-ink">
                Full name
              </label>
              <input
                type="text"
                id="full-name"
                name="full-name"
                required
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 2. Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 3. WhatsApp */}
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-ink">
                WhatsApp number (with country code)
              </label>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                placeholder="+256..."
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 4. Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-ink">
                Country of residence
              </label>
              <input
                type="text"
                id="country"
                name="country"
                required
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 5. Requested window */}
            <div>
              <label htmlFor="window" className="block text-sm font-medium text-ink">
                Requested window (month / flexible dates)
              </label>
              <input
                type="text"
                id="window"
                name="window"
                placeholder="e.g. March 2027, flexible"
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 6. Party */}
            <div>
              <label htmlFor="party" className="block text-sm font-medium text-ink">
                Party
              </label>
              <select
                id="party"
                name="party"
                required
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              >
                <option value="">Select...</option>
                <option value="solo">Solo</option>
                <option value="couple">Couple</option>
                <option value="family">Family</option>
                <option value="buyout">Whole-island buyout</option>
              </select>
            </div>

            {/* 7. What is drawing you */}
            <div>
              <label htmlFor="drawing" className="block text-sm font-medium text-ink">
                What is drawing you to the sanctuary at this moment?
              </label>
              <textarea
                id="drawing"
                name="drawing"
                rows={4}
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 8. Comfort with traditional work */}
            <div>
              <label htmlFor="comfort" className="block text-sm font-medium text-ink">
                How comfortable are you with traditional spiritual work in the
                cave (breath, voice, energy reading)?
              </label>
              <textarea
                id="comfort"
                name="comfort"
                rows={3}
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 9. Mobility / allergies */}
            <div>
              <label htmlFor="limits" className="block text-sm font-medium text-ink">
                Mobility limits or severe allergies (herbal, environmental,
                animal)?
              </label>
              <textarea
                id="limits"
                name="limits"
                rows={3}
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 10. Protocols */}
            <div>
              <label htmlFor="protocols" className="block text-sm font-medium text-ink">
                Will you honour the no-alcohol, no-drug, plant-respect, and
                dress protocols, including the house food protocol for female
                visitors?
              </label>
              <select
                id="protocols"
                name="protocols"
                required
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              >
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* 11. Digital sunset */}
            <div>
              <label htmlFor="digital-sunset" className="block text-sm font-medium text-ink">
                Will you observe digital sunset (phones silent in the Lake
                House, none in the cave)?
              </label>
              <select
                id="digital-sunset"
                name="digital-sunset"
                required
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              >
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* 12. Burden / conflict */}
            <div>
              <label htmlFor="burden" className="block text-sm font-medium text-ink">
                What burden or conflict are you ready to set down?
              </label>
              <textarea
                id="burden"
                name="burden"
                rows={4}
                className="mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark"
              />
            </div>

            {/* 13. Checkbox: policies */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="policies-check"
                name="policies-check"
                required
                className="mt-1 h-4 w-4 rounded border-mist text-bark focus:ring-bark"
              />
              <label htmlFor="policies-check" className="text-sm text-ink/70">
                I have read the sanctuary policies and understand this is a
                request, not a confirmed booking.
              </label>
            </div>

            {/* 14. Checkbox: complementary care */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="complementary-check"
                name="complementary-check"
                required
                className="mt-1 h-4 w-4 rounded border-mist text-bark focus:ring-bark"
              />
              <label htmlFor="complementary-check" className="text-sm text-ink/70">
                I understand the work is complementary to, not a replacement
                for, medical care.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-md bg-bark px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-bark/90"
            >
              Submit Request
            </button>
          </form>

          {/* Success message (placeholder) */}
          <div className="mt-8 rounded-md border border-canopy/20 bg-canopy/5 p-6 text-center">
            <p className="font-display text-lg text-ink">Thank you.</p>
            <p className="mt-2 text-sm text-ink/70">
              If there is a fit, we will write or WhatsApp within several days
              to arrange a short discovery conversation. Please do not book
              flights until we confirm the boat.
            </p>
          </div>
        </div>
      </section>

      {/* Legal lines */}
      <section className="bg-mist py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-ink/50">
            Sessions here are traditional, energetic, and artisanal. They
            complement and do not replace medical or psychiatric care. The
            sanctuary does not provide emergency or clinical services.
          </p>
          <p className="mt-2 text-xs text-ink/50">
            Photography and recording are not permitted inside the cave or
            shrines.
          </p>
        </div>
      </section>
    </>
  );
}
