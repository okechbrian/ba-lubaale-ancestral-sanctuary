import { SESSION_COOKIE } from "@/lib/admin/session";

export async function POST(): Promise<Response> {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      },
    },
  );
}
