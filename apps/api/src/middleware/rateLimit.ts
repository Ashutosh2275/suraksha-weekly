import { NextFunction, Request, Response } from "express";

type LimitPolicy = {
  ipPerMinute: number;
  identityPerMinute: number;
  burstPerSecond: number;
};

const perMinute = new Map<string, { count: number; resetAt: number }>();
const perSecond = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimiterState() {
  perMinute.clear();
  perSecond.clear();
}

function consume(store: Map<string, { count: number; resetAt: number }>, key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfter: Math.ceil(windowMs / 1000) };
  }
  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return {
    ok: existing.count <= limit,
    remaining,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
  };
}

export function rateLimit(policy: LimitPolicy) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || "unknown";
    const identity = (req.header("x-user-id") || "anonymous").toLowerCase();

    const ipMinute = consume(perMinute, `ipm:${ip}:${req.path}`, policy.ipPerMinute, 60_000);
    const idMinute = consume(perMinute, `idm:${identity}:${req.path}`, policy.identityPerMinute, 60_000);
    const ipBurst = consume(perSecond, `ips:${ip}:${req.path}`, policy.burstPerSecond, 1_000);
    const idBurst = consume(perSecond, `ids:${identity}:${req.path}`, policy.burstPerSecond, 1_000);

    const violated = !ipMinute.ok || !idMinute.ok || !ipBurst.ok || !idBurst.ok;
    if (violated) {
      const retryAfter = Math.max(ipMinute.retryAfter, idMinute.retryAfter, ipBurst.retryAfter, idBurst.retryAfter);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(Math.min(policy.ipPerMinute, policy.identityPerMinute)));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json({ error_code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Retry later." });
      return;
    }

    res.setHeader("X-RateLimit-Limit", String(Math.min(policy.ipPerMinute, policy.identityPerMinute)));
    res.setHeader("X-RateLimit-Remaining", String(Math.min(ipMinute.remaining, idMinute.remaining)));
    next();
  };
}
