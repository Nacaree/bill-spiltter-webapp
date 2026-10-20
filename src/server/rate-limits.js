import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  RateLimitError,
  RateLimitUnavailableError,
} from "@/lib/rate-limit-error";
import { reportAppError } from "@/server/monitoring";

export function ipSubject(
  header,
  {
    vercel = process.env.VERCEL === "1",
    secret = process.env.RATE_LIMIT_SECRET,
  } = {},
) {
  if (typeof secret !== "string" || Buffer.byteLength(secret) < 32)
    throw new RateLimitUnavailableError();
  let ip = "local-development";
  if (vercel) {
    if (
      typeof header !== "string" ||
      header.includes("%") ||
      !isIP(header.trim())
    )
      throw new RateLimitUnavailableError();
    ip = header.trim();
    if (isIP(ip) === 6) ip = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ip);
    if (mapped) {
      const high = parseInt(mapped[1], 16),
        low = parseInt(mapped[2], 16);
      ip = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
    }
  }
  return createHmac("sha256", secret)
    .update(`rate-limit-ip:${ip}`)
    .digest("hex");
}
export async function requestSubject() {
  return ipSubject(
    process.env.VERCEL === "1"
      ? (await headers()).get("x-vercel-forwarded-for")
      : null,
  );
}
export async function consumeLimits(buckets) {
  try {
    const { data, error } = await getServerSupabase({
      signal: AbortSignal.timeout(5000),
    }).rpc("consume_rate_limits", { buckets });
    if (error || typeof data?.allowed !== "boolean")
      throw new RateLimitUnavailableError();
    if (!data.allowed) {
      if (
        !Number.isFinite(data.retry_after_seconds) ||
        data.retry_after_seconds < 1
      )
        throw new RateLimitUnavailableError();
      throw new RateLimitError(data.retry_after_seconds, data.policy);
    }
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    reportAppError(new Error("Rate limiter unavailable"), "rate_limit");
    throw new RateLimitUnavailableError();
  }
}
export async function guardRequest() {
  let subject;
  try {
    subject = await requestSubject();
  } catch {
    reportAppError(new Error("Rate limiter unavailable"), "rate_limit");
    throw new RateLimitUnavailableError();
  }
  await consumeLimits([{ policy: "action_ip", subject }]);
}
export async function guardOperation(group, { billId, participantId } = {}) {
  const groups = {
    create: [
      ["create_ip", "ip"],
      ["create_ip_day", "ip"],
    ],
    people: [
      ["people_ip", "ip"],
      ["people_bill", "bill"],
    ],
    upload: [
      ["upload_ip", "ip"],
      ["upload_actor", "actor"],
      ["upload_bill", "bill"],
      ["upload_bill_day", "bill"],
    ],
    complete: [
      ["complete_actor", "actor"],
      ["complete_bill", "bill"],
    ],
    write: [
      ["write_actor", "actor"],
      ["write_bill", "bill"],
    ],
  };
  const policies = groups[group];
  if (!policies) throw new RateLimitUnavailableError();
  const subjects = { bill: billId, actor: participantId };
  if (policies.some(([, scope]) => scope === "ip"))
    subjects.ip = await requestSubject();
  if (policies.some(([, scope]) => !subjects[scope]))
    throw new RateLimitUnavailableError();
  await consumeLimits(
    policies.map(([policy, scope]) => ({ policy, subject: subjects[scope] })),
  );
}
