import { createHash, createHmac, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { isProduction } from "@/lib/env";

// Where uploaded artwork lives.
//  - s3:       any S3-compatible bucket (AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO...)
//  - local:    the public/uploads folder, for development only
//  - disabled: production without a bucket. Uploads are refused rather than lost on redeploy.

export type StorageMode = "s3" | "local" | "disabled";

export function storageMode(env: Record<string, string | undefined> = process.env): StorageMode {
  if (env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) return "s3";
  return isProduction(env) ? "disabled" : "local";
}

// ---- AWS Signature Version 4 (just what a PUT / GET of one object needs) ------------------------

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: string | Buffer, data: string) => createHmac("sha256", key).update(data).digest();

// RFC 3986 encoding of one path segment, as AWS expects it
const encodeSegment = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

export type SignInput = {
  method: string;
  host: string;
  path: string; // already encoded, starts with "/"
  query?: string;
  headers: Record<string, string>; // extra headers to sign (host and x-amz-* are added by the caller)
  payloadHash: string;
  region: string;
  service?: string;
  accessKeyId: string;
  secretAccessKey: string;
  amzDate: string; // 20130524T000000Z
};

/** Computes the Authorization header value. Exported so it can be tested against AWS's own examples. */
export function signRequest(i: SignInput) {
  const service = i.service ?? "s3";
  const date = i.amzDate.slice(0, 8);
  const headers: Record<string, string> = { host: i.host, ...i.headers };
  const names = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v.trim()]));
  const canonicalHeaders = names.map((n) => `${n}:${lower[n]}\n`).join("");
  const signedHeaders = names.join(";");

  const canonicalRequest = [i.method, i.path, i.query ?? "", canonicalHeaders, signedHeaders, i.payloadHash].join("\n");
  const scope = `${date}/${i.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", i.amzDate, scope, sha256(canonicalRequest)].join("\n");

  const kDate = hmac("AWS4" + i.secretAccessKey, date);
  const kRegion = hmac(kDate, i.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return `AWS4-HMAC-SHA256 Credential=${i.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function s3Config() {
  const endpoint = (process.env.S3_ENDPOINT || `https://s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com`).replace(/\/+$/, "");
  return {
    endpoint,
    host: new URL(endpoint).host,
    bucket: process.env.S3_BUCKET as string,
    region: process.env.S3_REGION || "us-east-1",
    accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    // Where browsers read files from (a CDN or the bucket's public address)
    publicBase: (process.env.S3_PUBLIC_URL || `${endpoint}/${process.env.S3_BUCKET}`).replace(/\/+$/, ""),
  };
}

/** Public address of the storage, or null for local files. */
export function storagePublicBase() {
  return storageMode() === "s3" ? s3Config().publicBase : null;
}

async function s3Put(key: string, body: Buffer, contentType: string) {
  const c = s3Config();
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const payloadHash = sha256(body);
  const pathName = `/${encodeSegment(c.bucket)}/${key.split("/").map(encodeSegment).join("/")}`;
  const headers: Record<string, string> = {
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const authorization = signRequest({
    method: "PUT",
    host: c.host,
    path: pathName,
    headers,
    payloadHash,
    region: c.region,
    accessKeyId: c.accessKeyId,
    secretAccessKey: c.secretAccessKey,
    amzDate,
  });
  const res = await fetch(`${c.endpoint}${pathName}`, {
    method: "PUT",
    headers: { ...headers, Authorization: authorization },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Storage upload failed (${res.status})`);
}

export type StoredFile = { url: string; key: string };

/** Saves an uploaded file and returns the address it can be loaded from. */
export async function saveUpload(buffer: Buffer, ext: string, contentType: string): Promise<StoredFile> {
  const mode = storageMode();
  const name = `${randomUUID()}.${ext}`;

  if (mode === "disabled") throw new Error("Uploads are not configured on this server.");

  if (mode === "s3") {
    const key = `uploads/${name}`;
    await s3Put(key, buffer, contentType);
    return { key, url: `${s3Config().publicBase}/${key}` };
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return { key: `uploads/${name}`, url: `/uploads/${name}` };
}

/**
 * The first bytes of an uploaded file, to read its size without downloading all of it.
 * Only files on our own storage are fetched, so this can't be pointed at other sites.
 */
export async function readFileHead(url: string, bytes = 256 * 1024): Promise<Buffer | null> {
  const base = storagePublicBase();
  if (!base || !url.startsWith(base + "/")) return null;
  try {
    const res = await fetch(url, {
      headers: { Range: `bytes=0-${bytes - 1}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).subarray(0, bytes);
  } catch {
    return null;
  }
}
