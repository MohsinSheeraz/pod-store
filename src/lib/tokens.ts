import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// One-time links sent by email (confirm an address, reset a password). The link carries a random
// token; only its hash is stored, so a database leak does not leak working links.

export type TokenType = "verify" | "reset";

export const TOKEN_TTL_MINUTES: Record<TokenType, number> = { verify: 60 * 24, reset: 60 };

export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Makes a new token for a user (older unused ones of the same type are dropped) and returns it. */
export async function createAuthToken(userId: string, type: TokenType) {
  const raw = randomBytes(32).toString("base64url");
  await prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES[type] * 60_000),
    },
  });
  return raw;
}

/** Uses a token once. Returns the user it belongs to, or null if it is wrong, expired or used. */
export async function consumeAuthToken(raw: string, type: TokenType) {
  if (!raw || raw.length > 200) return null;
  const tokenHash = hashToken(raw);
  const token = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!token || token.type !== type) return null;

  // updateMany with the conditions inside makes "use it once" safe even if two requests race.
  const { count } = await prisma.authToken.updateMany({
    where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  return count === 1 ? token.userId : null;
}
