import "server-only";

/* ------------------------------------------------------------------ */
/*  Minimal Upstash Redis REST client (no SDK needed).                 */
/*  Works with either env-var naming:                                  */
/*    UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN                */
/*    KV_REST_API_URL / KV_REST_API_TOKEN  (Vercel Marketplace)        */
/* ------------------------------------------------------------------ */

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export function sharingEnabled() {
  return config() !== null;
}

export class RedisUnavailable extends Error {}

export async function redis<T = unknown>(...command: (string | number)[]): Promise<T> {
  const cfg = config();
  if (!cfg) throw new RedisUnavailable("Sharing is not configured");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command.map(String)),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || json.error) throw new RedisUnavailable(json.error ?? `Redis HTTP ${res.status}`);
  return json.result as T;
}
