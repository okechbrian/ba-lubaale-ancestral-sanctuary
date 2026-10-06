import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSessionToken,
} from "@/lib/admin/session";

/** Constant-time-ish string compare (never logs or echoes credentials). */
function matches(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request): Promise<Response> {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!user || !pass || !secret) {
    return Response.json({ error: "admin_not_configured" }, { status: 503 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const ok =
    typeof body.username === "string" &&
    typeof body.password === "string" &&
    matches(body.username, user) &&
    matches(body.password, pass);
  if (!ok) {
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": [
          `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
          process.env.NODE_ENV === "production" ? "Secure" : "",
        ]
          .filter(Boolean)
          .join("; "),
      },
    },
  );
}
