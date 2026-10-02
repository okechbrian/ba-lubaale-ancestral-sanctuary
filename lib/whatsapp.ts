const PLACEHOLDER = "256700000000";

/** Digits for wa.me links — "" when unset or still the example placeholder. */
export function whatsappDigits(raw: string | undefined): string {
  const digits = (raw || "").replace(/[^0-9]/g, "");
  if (!digits || digits === PLACEHOLDER) return "";
  return digits;
}
