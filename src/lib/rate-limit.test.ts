import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { _resetRateLimits, clientIp, rateLimit } from "@/lib/rate-limit";

beforeEach(() => _resetRateLimits());

test("allows up to the limit, then blocks until the window passes", async () => {
  const opts = { limit: 3, windowSec: 60 };
  const t0 = 1_000_000;
  for (let i = 1; i <= 3; i++) {
    const r = await rateLimit("k", opts, t0 + i);
    assert.equal(r.ok, true);
    assert.equal(r.remaining, 3 - i);
  }
  const blocked = await rateLimit("k", opts, t0 + 10);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfter >= 1 && blocked.retryAfter <= 60);

  // a new window starts after 60 s
  assert.equal((await rateLimit("k", opts, t0 + 61_000)).ok, true);
});

test("keys are counted separately", async () => {
  const opts = { limit: 1, windowSec: 60 };
  assert.equal((await rateLimit("a", opts)).ok, true);
  assert.equal((await rateLimit("a", opts)).ok, false);
  assert.equal((await rateLimit("b", opts)).ok, true);
});

test("clientIp reads the first forwarded address", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(clientIp(new Headers({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(clientIp(new Headers()), "unknown");
});
