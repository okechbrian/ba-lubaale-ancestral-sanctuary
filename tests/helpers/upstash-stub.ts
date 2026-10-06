import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Minimal in-memory Upstash Redis REST stand-in for tests: implements only
 * the commands `lib/rate-limit.ts` uses (INCR, EXPIRE NX, PTTL, DEL) with
 * Upstash's JSON reply shapes. Real HTTP, real client code — only the remote
 * storage is scripted. Optionally simulates an EXPIRE backend error.
 *
 * It is deliberately STRICT about the wire format: a real Upstash parses every
 * request body as JSON, so a `text/plain` body is rejected here exactly as it
 * would be in production. An earlier, lenient stub accepted newline-separated
 * plain text, which meant the limiter's real-world incompatibility with Upstash
 * stayed invisible to CI.
 */
export interface UpstashStub {
  url: string;
  /** Every command received, in arrival order, as "INCR key" strings. */
  commands: string[];
  /** Exact wire bytes of every request, for asserting the Upstash contract. */
  rawRequests: { url: string; contentType: string; body: string }[];
  close: () => Promise<void>;
}

export async function startUpstashStub(
  opts: { failExpire?: boolean } = {},
): Promise<UpstashStub> {
  const counters = new Map<string, { n: number; expiresAt: number | null }>();
  const commands: string[] = [];
  const rawRequests: UpstashStub["rawRequests"] = [];
  const failExpire = opts.failExpire ?? false;

  function entry(key: string) {
    const e = counters.get(key);
    if (e && e.expiresAt !== null && Date.now() >= e.expiresAt) {
      counters.delete(key);
      return undefined;
    }
    return e;
  }

  function handle(args: string[]): { result?: unknown; error?: string } {
    const parts = args;
    switch (parts[0]) {
      case "INCR": {
        let e = entry(parts[1]);
        if (!e) {
          e = { n: 0, expiresAt: null };
          counters.set(parts[1], e);
        }
        e.n += 1;
        return { result: e.n };
      }
      case "EXPIRE": {
        if (failExpire) return { error: "ERR unsupported option" };
        const e = entry(parts[1]);
        if (!e) return { result: 0 };
        if (parts[3] === "NX" && e.expiresAt !== null) return { result: 0 };
        e.expiresAt = Date.now() + Number(parts[2]) * 1000;
        return { result: 1 };
      }
      case "PTTL": {
        const e = entry(parts[1]);
        if (!e) return { result: -2 };
        if (e.expiresAt === null) return { result: -1 };
        return { result: e.expiresAt - Date.now() };
      }
      case "DEL":
        return { result: counters.delete(parts[1]) ? 1 : 0 };
      default:
        return { error: "ERR unknown command" };
    }
  }

  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (req.headers.authorization !== "Bearer stub-token") {
        res.writeHead(401, { "content-type": "application/json" });
        res.end('{"error":"unauthorized"}');
        return;
      }

      // Mirror the real Upstash REST API, which parses EVERY request body as
      // JSON and expects a JSON array of argument arrays. This stub used to
      // accept newline-separated `text/plain` commands instead, which meant it
      // agreed with a wire format no real Upstash accepts - the limiter was
      // never actually exercised against a real database and shipped broken.
      // Anything that is not a JSON array is now rejected the way Upstash
      // rejects it, so the test suite cannot mask this class of bug again.
      const contentType = String(req.headers["content-type"] ?? "");
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error:
              "invalid character looking for beginning of value - the real " +
              "Upstash REST API parses every request body as JSON, so a " +
              `text/plain body (${contentType}) is never valid here either`,
          }),
        );
        return;
      }
      if (
        !Array.isArray(parsed) ||
        parsed.some((c) => !Array.isArray(c) || typeof c[0] !== "string")
      ) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error:
              'unsupported arg type - expected a JSON array of argument arrays, e.g. [["INCR","key"]]',
          }),
        );
        return;
      }

      // Record as "INCR key" strings so existing assertions keep reading the
      // same way, while `rawRequests` keeps the exact wire bytes.
      const cmds = parsed.map((c) => (c as string[]).join(" "));
      commands.push(...cmds);
      rawRequests.push({
        url: req.url ?? "",
        contentType,
        body,
      });

      const results = parsed.map((c) => handle(c as string[]));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(results));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    commands,
    rawRequests,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
