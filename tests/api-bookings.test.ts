import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/bookings/route";
import { GET } from "@/app/api/availability/route";
import type { BookingRequest } from "@/lib/booking/schema";

const savedEnv: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value !== undefined) process.env[key] = value;
  }
});

function validPayload(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    name: "Test Guest",
    email: "guest@example.com",
    country: "Uganda",
    party: "solo",
    stay_slug: "master",
    check_in: "2027-06-01",
    check_out: "2027-06-05",
    drawing: "Seeking stillness.",
    comfort: "Comfortable.",
    protocols: "yes",
    digital_sunset: "yes",
    burden: "Stress.",
    policiesCheck: true,
    complementaryCheck: true,
    ...overrides,
  };
}

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/bookings", () => {
  it("returns 400 for malformed JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_json");
  });

  it("returns 400 with issues for an invalid payload", async () => {
    const res = await post(validPayload({ check_in: "June 2027" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_request");
    expect(
      body.issues.some(
        (i: { path: string }) => i.path === "check_in",
      ),
    ).toBe(true);
  });

  it("returns 503 database_not_configured when Supabase is unset", async () => {
    const res = await post(validPayload());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});

describe("GET /api/availability", () => {
  it("returns 503 database_not_configured when Supabase is unset", async () => {
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("database_not_configured");
  });
});
