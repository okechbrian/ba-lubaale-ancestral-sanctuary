import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Minimal in-memory Upstash Redis REST stand-in for tests: implements only
 * the commands `lib/rate-limit.ts` uses (INCR, EXPIRE NX, PTTL, DEL) with
 * Upstash's JSON reply shapes. Real HTTP, real client code — only the remote
 * storage is scripted. Optionally simulates an EXPIRE backend error.
 */
export interface UpstashStub {
  url: string;
  /** Every command body received, in arrival order. */
  commands: string[];
  close: () => Promise<void>;
}

export async function startUpstashStub(
  opts: { failExpire?: boolean } = {},
): Promise<UpstashStub> {
  const counters = new Map<string, { n: number; expiresAt: number | null }>();
  const commands: string[] = [];
  const failExpire = opts.failExpire ?? false;

  function entry(key: string) {
    const e = counters.get(key);
    if (e && e.expiresAt !== null && Date.now() >= e.expiresAt) {
      counters.delete(key);
      return undefined;
    }
    return e;
  }

  function handle(cmd: string): { result?: unknown; error?: string } {
    const parts = cmd.split(/\s+/);
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
      const cmds = body
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      commands.push(...cmds);
      const results = cmds.map(handle);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(results.length === 1 ? JSON.stringify(results[0]) : JSON.stringify(results));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    commands,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
