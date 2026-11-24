import { test } from "node:test";
import assert from "node:assert/strict";
import { hashToken, TOKEN_TTL_MINUTES } from "@/lib/tokens";
import { passwordProblem, isEmail } from "@/lib/auth-utils";

test("tokens are stored as a stable one-way hash", () => {
  assert.equal(hashToken("abc"), hashToken("abc"));
  assert.notEqual(hashToken("abc"), hashToken("abd"));
  assert.match(hashToken("abc"), /^[0-9a-f]{64}$/);
  assert.ok(!hashToken("abc").includes("abc"));
});

test("reset links are short-lived, verification links last a day", () => {
  assert.equal(TOKEN_TTL_MINUTES.reset, 60);
  assert.equal(TOKEN_TTL_MINUTES.verify, 1440);
});

test("password rules: at least 8 characters and no more than bcrypt reads", () => {
  assert.equal(passwordProblem("12345678"), null);
  assert.match(passwordProblem("short") ?? "", /at least 8/);
  assert.match(passwordProblem("é".repeat(40)) ?? "", /too long/); // 80 bytes
  assert.ok(passwordProblem(undefined));
  assert.ok(passwordProblem(12345678));
});

test("email check", () => {
  assert.equal(isEmail("a@b.co"), true);
  for (const bad of ["", "a", "a@b", "a b@c.de", "@b.co", "a@b.c"]) assert.equal(isEmail(bad), false, bad);
});
