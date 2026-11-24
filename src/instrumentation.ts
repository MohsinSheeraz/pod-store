import type { Instrumentation } from "next";

// Runs once when the server starts. A production server with unsafe settings refuses to start,
// instead of quietly running (for example) with a weak AUTH_SECRET.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { envProblems } = await import("@/lib/env");
  const { errors, warnings } = envProblems();
  for (const w of warnings) console.warn(`[config] ${w}`);
  if (errors.length > 0) {
    throw new Error(`Refusing to start with unsafe settings:\n - ${errors.join("\n - ")}`);
  }
}

// Every uncaught server error lands here: logged as one JSON line (easy to search in any log
// service) and, when ERROR_WEBHOOK_URL is set, posted to it (works with Slack and Discord webhooks).
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as Error & { digest?: string };
  const entry = {
    level: "error",
    message: err.message,
    digest: err.digest,
    path: request.path,
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    time: new Date().toISOString(),
  };
  console.error(JSON.stringify(entry));

  const hook = process.env.ERROR_WEBHOOK_URL;
  if (hook) {
    const text = `⚠️ ${entry.method} ${entry.path} failed: ${entry.message}`.slice(0, 1500);
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // "content" is read by Discord, "text" by Slack
      body: JSON.stringify({ text, content: text }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => undefined);
  }
};
