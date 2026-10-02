"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import DateRangePicker from "@/components/DateRangePicker";
import { bookingRequestSchema } from "@/lib/booking/schema";
import type { DateRange } from "@/lib/booking/availability";
import { whatsappDigits } from "@/lib/whatsapp";

type FormData = z.infer<typeof bookingRequestSchema>;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const inputClass =
  "mt-1 block w-full rounded-md border border-mist bg-cream px-4 py-3 text-ink placeholder-ink/40 focus:border-bark focus:outline-none focus:ring-1 focus:ring-bark";

const whatsappNumber = whatsappDigits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);

// Cloudflare Turnstile — absent key disables the widget (the server disables
// verification just as loudly; both keys are required to enforce).
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<{
    message: string;
    whatsapp: boolean;
  } | null>(null);
  const [busy, setBusy] = useState<DateRange[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileDivRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(bookingRequestSchema),
  });

  const checkIn = useWatch({ control, name: "check_in" });
  const checkOut = useWatch({ control, name: "check_out" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/availability")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("unavailable"))))
      .then((data: { ranges?: DateRange[]; blocked?: string[] }) => {
        if (cancelled) return;
        setBusy(data.ranges ?? []);
        setBlocked(data.blocked ?? []);
      })
      .catch(() => {
        // Calendar hint only — the server re-validates every submission.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) {
      console.warn(
        "[apply] Turnstile disabled: NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.",
      );
      return;
    }
    const renderWidget = () => {
      if (widgetIdRef.current || !turnstileDivRef.current || !window.turnstile) {
        return;
      }
      widgetIdRef.current = window.turnstile.render(turnstileDivRef.current, {
        sitekey: turnstileSiteKey,
        action: "apply",
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    };
    // Script loads async (render=explicit): either it is already there, or
    // its onload fires window.onTurnstileLoad.
    window.onTurnstileLoad = renderWidget;
    if (window.turnstile) renderWidget();
    return () => {
      window.onTurnstileLoad = undefined;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, []);

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setApiError(null);
    // Tokens are single-use: after ANY failed submit the widget must issue a
    // fresh one, or the retry would be rejected as timeout-or-duplicate.
    // reset() with no id resets every widget on the page (there is only one).
    const resetTurnstile = () => {
      setTurnstileToken("");
      if (window.turnstile) window.turnstile.reset();
    };
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, cf_turnstile_response: turnstileToken }),
      });
      if (res.status === 201) {
        setSubmitted(true);
        return;
      }
      resetTurnstile();
      const body: { message?: string } = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setApiError({
          message:
            body.message ||
            "Those dates are no longer available. Please choose another window.",
          whatsapp: false,
        });
      } else if (res.status === 403) {
        setApiError({
          message:
            "The security check did not pass. Please try again in a moment.",
          whatsapp: false,
        });
      } else if (res.status === 429) {
        setApiError({
          message:
            "Too many attempts. Please wait a few minutes and try again.",
          whatsapp: false,
        });
      } else if (res.status === 503) {
        setApiError({
          message:
            "Booking intake is temporarily unavailable. Please try again in a few minutes.",
          whatsapp: true,
        });
      } else {
        setApiError({
          message: "Something went wrong submitting your request. Please try again.",
          whatsapp: true,
        });
      }
    } catch {
      setApiError({
        message:
          "We could not reach the booking service. Please check your connection and try again.",
        whatsapp: true,
      });
    } finally {
      setSubmitting(false);
    }
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
          {turnstileSiteKey && (
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad"
              strategy="afterInteractive"
            />
          )}
          {submitted ? (
            <div className="rounded-md border border-canopy/20 bg-canopy/5 p-8 text-center">
              <p className="font-display text-xl text-ink">Thank you.</p>
              <p className="mt-4 text-ink/70">
                If there is a fit, we will write or WhatsApp within several
                days to arrange a short discovery conversation. Please do not
                book flights until we confirm the boat.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 1. Full name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-ink"
                >
                  Full name
                </label>
                <input
                  type="text"
                  id="name"
                  {...register("name")}
                  className={inputClass}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.name.message}
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
                  htmlFor="requested_window"
                  className="block text-sm font-medium text-ink"
                >
                  Requested window (month / flexible dates)
                </label>
                <input
                  type="text"
                  id="requested_window"
                  placeholder="e.g. March 2027, flexible"
                  {...register("requested_window")}
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

              {/* 7. Dates */}
              <div>
                <span className="block text-sm font-medium text-ink">
                  Your dates
                </span>
                <div className="mt-1 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="check_in" className="text-xs text-ink/60">
                      Check-in
                    </label>
                    <input
                      type="date"
                      id="check_in"
                      value={checkIn || ""}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setValue("check_in", e.target.value, {
                        shouldValidate: true,
                      })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="check_out" className="text-xs text-ink/60">
                      Check-out
                    </label>
                    <input
                      type="date"
                      id="check_out"
                      value={checkOut || ""}
                      min={checkIn || undefined}
                      onChange={(e) => setValue("check_out", e.target.value, {
                        shouldValidate: true,
                      })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <DateRangePicker
                  busy={busy}
                  blocked={blocked}
                  checkIn={checkIn || ""}
                  checkOut={checkOut || ""}
                  onChange={(inDay, outDay) => {
                    setValue("check_in", inDay, { shouldValidate: true });
                    setValue("check_out", outDay, { shouldValidate: true });
                  }}
                />
                {(errors.check_in || errors.check_out) && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.check_in?.message || errors.check_out?.message}
                  </p>
                )}
              </div>

              {/* 8. Stay */}
              <div>
                <label
                  htmlFor="stay_slug"
                  className="block text-sm font-medium text-ink"
                >
                  Immersion
                </label>
                <select
                  id="stay_slug"
                  {...register("stay_slug")}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  <option value="essential">
                    Essential Healing Immersion — 3 days / 2 nights
                  </option>
                  <option value="master">
                    Master Transformation &amp; Craft Immersion — 5 days / 4
                    nights
                  </option>
                  <option value="buyout">Whole-island buyout</option>
                </select>
                {errors.stay_slug && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.stay_slug.message}
                  </p>
                )}
              </div>

              {/* 9. What is drawing you */}
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

              {/* 10. Comfort with traditional work */}
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

              {/* 11. Mobility / allergies */}
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

              {/* 12. Protocols */}
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

              {/* 13. Digital sunset */}
              <div>
                <label
                  htmlFor="digital_sunset"
                  className="block text-sm font-medium text-ink"
                >
                  Will you observe digital sunset (phones silent in the Lake
                  House, none in the cave)?
                </label>
                <select
                  id="digital_sunset"
                  {...register("digital_sunset")}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                {errors.digital_sunset && (
                  <p className="mt-1 text-xs text-ember">
                    {errors.digital_sunset.message}
                  </p>
                )}
              </div>

              {/* 14. Burden / conflict */}
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

              {/* Honeypot: humans never see or focus this. */}
              <input
                type="text"
                {...register("website")}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              {/* Checkbox: policies */}
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

              {/* Checkbox: complementary care */}
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

              {/* Server error */}
              {apiError && (
                <div className="rounded-md border border-ember/40 bg-ember/5 p-4 text-sm text-ink">
                  <p>{apiError.message}</p>
                  {apiError.whatsapp && whatsappNumber && (
                    <a
                      href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block font-semibold text-leaf hover:text-leaf/80"
                    >
                      Or message us on WhatsApp
                    </a>
                  )}
                </div>
              )}

              {/* Cloudflare Turnstile (only when a site key is configured) */}
              {turnstileSiteKey && (
                <div ref={turnstileDivRef} className="cf-turnstile" />
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
