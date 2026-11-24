import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentMode } from "@/lib/env";
import { emailConfigured } from "@/lib/email";
import { storageMode } from "@/lib/storage";

export const dynamic = "force-dynamic";

// For uptime monitors and load balancers: 200 when the app and its database are up.
// Shows which services are configured, never any secret.
export async function GET() {
  let db = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "down";
  }

  const body = {
    status: db === "ok" ? "ok" : "degraded",
    database: db,
    payments: paymentMode(),
    uploads: storageMode(),
    email: emailConfigured() ? "on" : "off",
  };
  return NextResponse.json(body, {
    status: db === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
