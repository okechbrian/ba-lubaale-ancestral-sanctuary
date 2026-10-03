#!/usr/bin/env node
/**
 * Runs the integrity integration tests against the REAL local
 * Supabase stack (supabase start in this repo) - no faked database:
 *   - tests/payment-integrity.test.ts    (atomic payment apply, IPN emails)
 *   - tests/subscribers-integrity.test.ts (double opt-in lifecycle)
 *   - tests/outbox-integrity.test.ts      (transactional email outbox)
 *
 * It discovers:
 *   - TEST_SUPABASE_URL            (REST API, from `supabase status -o json`)
 *   - TEST_DATABASE_URL            (direct Postgres, for SQL fault injection)
 *   - TEST_SUPABASE_SERVICE_ROLE_KEY (service-role JWT crafted from the
 *     running PostgREST container's JWKS oct key — the local stack does not
 *     print API keys)
 *
 * Usage:
 *   supabase start && supabase db reset   # once
 *   npm run test:integrity
 *
 * Exits non-zero with an honest message when the stack is not running.
 */
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function supabaseJson() {
  try {
    const out = execFileSync("supabase", ["status", "-o", "json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(out);
  } catch (err) {
    console.error("payment-integrity: cannot read `supabase status`.");
    console.error("Start the local stack first:");
    console.error("  supabase start -x edge-runtime,gotrue,imgproxy,logflare,mailpit,postgres-meta,realtime,studio,supavisor,vector --ignore-health-check");
    console.error("  supabase db reset");
    console.error(String(err.stdout ?? err.message ?? err));
    process.exit(1);
  }
}

function restContainerName() {
  const cfg = fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8");
  const m = cfg.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
  const projectId = m ? m[1] : "Website";
  return `supabase_rest_${projectId}`;
}

function serviceRoleKey() {
  let inspect;
  try {
    inspect = execFileSync(
      "docker",
      ["inspect", restContainerName(), "--format", "{{json .Config.Env}}"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    console.error(`payment-integrity: container ${restContainerName()} not found (is supabase start running?)`);
    console.error(String(err.stderr ?? err.message ?? err));
    process.exit(1);
  }
  const envs = JSON.parse(inspect);
  const jwksLine = envs.find((e) => e.startsWith("PGRST_JWT_SECRET="));
  if (!jwksLine) {
    console.error("payment-integrity: PGRST_JWT_SECRET not found in PostgREST container.");
    process.exit(1);
  }
  const jwks = JSON.parse(jwksLine.slice("PGRST_JWT_SECRET=".length));
  const oct = jwks.keys.find((k) => k.kty === "oct");
  if (!oct) {
    console.error("payment-integrity: no oct key in local JWKS.");
    process.exit(1);
  }
  const secret = Buffer.from(oct.k, "base64url").toString("utf8");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ role: "service_role", iss: "supabase", iat: now, exp: now + 3600 }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

const status = supabaseJson();
if (!status.API_URL || !status.DB_URL) {
  console.error("payment-integrity: supabase status returned no API_URL/DB_URL.");
  process.exit(1);
}

const env = {
  ...process.env,
  // supabase-js appends /rest/v1 itself — pass the API root, not REST_URL.
  TEST_SUPABASE_URL: status.API_URL,
  TEST_DATABASE_URL: status.DB_URL,
  TEST_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey(),
};

const args = process.argv.slice(2);
const vitestArgs = args.length
  ? args
  : [
      "run",
      "tests/payment-integrity.test.ts",
      "tests/subscribers-integrity.test.ts",
      "tests/outbox-integrity.test.ts",
    ];
const res = spawnSync("npx", ["vitest", ...vitestArgs], {
  cwd: root,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
process.exit(res.status ?? 1);
