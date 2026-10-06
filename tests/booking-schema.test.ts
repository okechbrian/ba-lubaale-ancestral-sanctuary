import { describe, expect, it } from "vitest";
import { bookingRequestSchema, type BookingRequest } from "@/lib/booking/schema";

function validPayload(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    name: "Amina Okello",
    email: "amina@example.com",
    whatsapp: "+256770000000",
    country: "Uganda",
    requested_window: "March 2027, flexible",
    party: "couple",
    stay_slug: "essential",
    check_in: "2027-03-05",
    check_out: "2027-03-07",
    drawing: "A quiet season after a hard year.",
    comfort: "Comfortable, I have sat with traditional elders before.",
    limits: "",
    protocols: "yes",
    digital_sunset: "yes",
    burden: "Grief I have been carrying alone.",
    policiesCheck: true,
    complementaryCheck: true,
    website: "",
    ...overrides,
  };
}

describe("bookingRequestSchema", () => {
  it("accepts a complete valid request", () => {
    const result = bookingRequestSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("accepts optional fields as undefined/empty", () => {
    const result = bookingRequestSchema.safeParse(
      validPayload({
        whatsapp: undefined,
        requested_window: undefined,
        limits: undefined,
        website: undefined,
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects malformed dates", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ check_in: "05/03/2027" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("check_in"))).toBe(true);
    }
  });

  it("rejects a filled honeypot", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ website: "spam" }));
    expect(result.success).toBe(false);
  });

  it("rejects missing acknowledgements", () => {
    const result = bookingRequestSchema.safeParse(
      validPayload({ policiesCheck: false as unknown as true }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects unknown party or stay values", () => {
    const badParty = bookingRequestSchema.safeParse(
      validPayload({ party: "group" as unknown as "solo" }),
    );
    const badStay = bookingRequestSchema.safeParse(
      validPayload({ stay_slug: "deluxe" as unknown as "essential" }),
    );
    expect(badParty.success).toBe(false);
    expect(badStay.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = bookingRequestSchema.safeParse(validPayload({ email: "not-an-email" }));
    expect(result.success).toBe(false);
  });
});
