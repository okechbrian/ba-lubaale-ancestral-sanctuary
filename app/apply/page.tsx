"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("A valid email is required"),
  whatsapp: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  window: z.string().optional(),
  party: z.enum(["solo", "couple", "family", "buyout"], {
    message: "Please select a party type",
  }),
  drawing: z.string().min(1, "Please share what is drawing you here"),
  comfort: z.string().min(1, "Please share your comfort level"),
  limits: z.string().optional(),
  protocols: z.enum(["yes", "no"], {
    message: "Please select yes or no",
  }),
  digitalSunset: z.enum(["yes", "no"], {
    message: "Please select yes or no",
  }),
  burden: z.string().min(1, "Please share what you are ready to set down"),
  policiesCheck: z.literal(true, {
    message: "You must acknowledge the policies",
  }),
  complementaryCheck: z.literal(true, {
    message: "You must acknowledge the complementary-care disclaimer",
  }),
});

type FormData = z.infer<typeof formSchema>;

const inputClass =
  "mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark";

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mailtoFallback, setMailtoFallback] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(data: FormData) {
    setSubmitting(true);

    const endpoint = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT ?? "";

    if (endpoint) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          setSubmitted(true);
        } else {
          fallbackMailto(data);
        }
      } catch {
        fallbackMailto(data);
      }
    } else {
      fallbackMailto(data);
    }

    setSubmitting(false);
  }

  function fallbackMailto(data: FormData) {
    const subject = encodeURIComponent(
      `Immersion request — ${data.fullName} (${data.party})`
    );
    const body = encodeURIComponent(
      [
        `Name: ${data.fullName}`,
        `Email: ${data.email}`,
        `WhatsApp: ${data.whatsapp || "not provided"}`,
        `Country: ${data.country}`,
        `Window: ${data.window || "flexible"}`,
        `Party: ${data.party}`,
        ``,
        `What is drawing you: ${data.drawing}`,
        `Comfort with traditional work: ${data.comfort}`,
        `Mobility / allergies: ${data.limits || "none"}`,
        `Honour protocols: ${data.protocols}`,
        `Digital sunset: ${data.digitalSunset}`,
        `Burden / conflict: ${data.burden}`,
      ].join("\n")
    );
    window.open(`mailto:queennalubaale@gmail.com?subject=${subject}&body=${body}`, "_self");
    setMailtoFallback(true);
    setSubmitted(true);
  }

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
          <p className="mt-3 max-w-xl text-cream/80">
            If approved, a deposit link is sent by email. This form does not
            take payment.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-cream py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <div className="rounded-md border border-canopy/20 bg-canopy/5 p-8 text-center">
              <p className="font-display text-xl text-ink">Thank you.</p>
              {mailtoFallback ? (
                <p className="mt-4 text-ink/70">
                  Your mail app should open with the request pre-filled. If it
                  does not, send the form details manually to{" "}
                  <a
                    href="mailto:queennalubaale@gmail.com"
                    className="font-semibold text-leaf hover:text-leaf/80"
                  >
                    queennalubaale@gmail.com
                  </a>
                  . We will write or WhatsApp within several days.
                </p>
              ) : (
                <p className="mt-4 text-ink/70">
                  If there is a fit, we will write or WhatsApp within several
                  days to arrange a short discovery conversation. Please do not
                  book flights until we confirm the boat.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 1. Full name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-ink"
                >
                  Full name
                </label>
                <input
                  type="text"
                  id="fullName"
                  {...register("fullName")}
                  className={inputClass}
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* 2. Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-ink"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  {...register("email")}
                  className={inputClass}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* 3. WhatsApp */}
              <div>
                <label
                  htmlFor="whatsapp"
                  className="block text-sm font-medium text-ink"
                >
                  WhatsApp number (with country code)
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  placeholder="+256..."
                  {...register("whatsapp")}
                  className={inputClass}
                />
              </div>

              {/* 4. Country */}
              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-ink"
                >
                  Country of residence
                </label>
                <input
                  type="text"
                  id="country"
                  {...register("country")}
                  className={inputClass}
                />
                {errors.country && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.country.message}
                  </p>
                )}
              </div>

              {/* 5. Requested window */}
              <div>
                <label
                  htmlFor="window"
                  className="block text-sm font-medium text-ink"
                >
                  Requested window (month / flexible dates)
                </label>
                <input
                  type="text"
                  id="window"
                  placeholder="e.g. March 2027, flexible"
                  {...register("window")}
                  className={inputClass}
                />
              </div>

              {/* 6. Party */}
              <div>
                <label
                  htmlFor="party"
                  className="block text-sm font-medium text-ink"
                >
                  Party
                </label>
                <select
                  id="party"
                  {...register("party")}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  <option value="solo">Solo</option>
                  <option value="couple">Couple</option>
                  <option value="family">Family</option>
                  <option value="buyout">Whole-island buyout</option>
                </select>
                {errors.party && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.party.message}
                  </p>
                )}
              </div>

              {/* 7. What is drawing you */}
              <div>
                <label
                  htmlFor="drawing"
                  className="block text-sm font-medium text-ink"
                >
                  What is drawing you to the sanctuary at this moment?
                </label>
                <textarea
                  id="drawing"
                  rows={4}
                  {...register("drawing")}
                  className={inputClass}
                />
                {errors.drawing && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.drawing.message}
                  </p>
                )}
              </div>

              {/* 8. Comfort with traditional work */}
              <div>
                <label
                  htmlFor="comfort"
                  className="block text-sm font-medium text-ink"
                >
                  How comfortable are you with traditional spiritual work in the
                  cave (breath, voice, energy reading)?
                </label>
                <textarea
                  id="comfort"
                  rows={3}
                  {...register("comfort")}
                  className={inputClass}
                />
                {errors.comfort && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.comfort.message}
                  </p>
                )}
              </div>

              {/* 9. Mobility / allergies */}
              <div>
                <label
                  htmlFor="limits"
                  className="block text-sm font-medium text-ink"
                >
                  Mobility limits or severe allergies (herbal, environmental,
                  animal)?
                </label>
                <textarea
                  id="limits"
                  rows={3}
                  {...register("limits")}
                  className={inputClass}
                />
              </div>

              {/* 10. Protocols */}
              <div>
                <label
                  htmlFor="protocols"
                  className="block text-sm font-medium text-ink"
                >
                  Will you honour the no-alcohol, no-drug, plant-respect, and
                  dress protocols, including the house food protocol for female
                  visitors?
                </label>
                <select
                  id="protocols"
                  {...register("protocols")}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                {errors.protocols && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.protocols.message}
                  </p>
                )}
              </div>

              {/* 11. Digital sunset */}
              <div>
                <label
                  htmlFor="digitalSunset"
                  className="block text-sm font-medium text-ink"
                >
                  Will you observe digital sunset (phones silent in the Lake
                  House, none in the cave)?
                </label>
                <select
                  id="digitalSunset"
                  {...register("digitalSunset")}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                {errors.digitalSunset && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.digitalSunset.message}
                  </p>
                )}
              </div>

              {/* 12. Burden / conflict */}
              <div>
                <label
                  htmlFor="burden"
                  className="block text-sm font-medium text-ink"
                >
                  What burden or conflict are you ready to set down?
                </label>
                <textarea
                  id="burden"
                  rows={4}
                  {...register("burden")}
                  className={inputClass}
                />
                {errors.burden && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.burden.message}
                  </p>
                )}
              </div>

              {/* 13. Checkbox: policies */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="policiesCheck"
                  {...register("policiesCheck")}
                  className="mt-1 h-4 w-4 rounded border-mist text-bark focus:ring-bark"
                />
                <label
                  htmlFor="policiesCheck"
                  className="text-sm text-ink/70"
                >
                  I have read the sanctuary policies and understand this is a
                  request, not a confirmed booking.
                </label>
              </div>
              {errors.policiesCheck && (
                <p className="text-xs text-ember">
                  {errors.policiesCheck.message}
                </p>
              )}

              {/* 14. Checkbox: complementary care */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="complementaryCheck"
                  {...register("complementaryCheck")}
                  className="mt-1 h-4 w-4 rounded border-mist text-bark focus:ring-bark"
                />
                <label
                  htmlFor="complementaryCheck"
                  className="text-sm text-ink/70"
                >
                  I understand the work is complementary to, not a replacement
                  for, medical care.
                </label>
              </div>
              {errors.complementaryCheck && (
                <p className="text-xs text-ember">
                  {errors.complementaryCheck.message}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-lake px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-lake/80 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          )}
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
