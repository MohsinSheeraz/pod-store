import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 10 * 1024 * 1024;

// Trust the file's actual bytes, not the browser-supplied type or name.
function sniffImageType(buf: Buffer): "png" | "jpg" | "webp" | null {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length >= 8 && buf.subarray(0, 8).equals(png)) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Log in to upload artwork." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = sniffImageType(buffer);

  if (!ext) {
    return NextResponse.json(
      { error: "Upload a PNG, JPG, or WebP image." },
      { status: 400 }
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(uploadsDir, filename), buffer);

  const design = await prisma.design.create({
    data: {
      name: file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Untitled design",
      imageUrl: `/uploads/${filename}`,
      ownerId: session.user.id,
    },
  });

  return NextResponse.json(
    { design: { id: design.id, name: design.name, imageUrl: design.imageUrl } },
    { status: 201 }
  );
}