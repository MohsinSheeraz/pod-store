// Reads pixel dimensions from the first bytes of a PNG, JPEG or WebP, with no dependencies.
// JPEG EXIF orientation is applied so the result matches what browsers draw.

export type ImageSize = { width: number; height: number };

function png(buf: Buffer): ImageSize | null {
  if (buf.length < 24 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function exifOrientation(buf: Buffer, segment: number): number {
  try {
    const start = segment + 4;
    if (buf.toString("latin1", start, start + 6) !== "Exif\u0000\u0000") return 1;
    const tiff = start + 6;
    const order = buf.toString("ascii", tiff, tiff + 2);
    if (order !== "II" && order !== "MM") return 1;
    const le = order === "II";
    const r16 = (o: number) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
    const r32 = (o: number) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
    if (r16(tiff + 2) !== 42) return 1;
    const ifd = tiff + r32(tiff + 4);
    const count = r16(ifd);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (r16(entry) === 0x0112) return r16(entry + 8);
    }
  } catch {
    // Truncated EXIF: treat as upright.
  }
  return 1;
}

function jpeg(buf: Buffer): ImageSize | null {
  let orientation = 1;
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9) break;

    const len = buf.readUInt16BE(i + 2);
    if (marker === 0xe1) orientation = exifOrientation(buf, i);

    const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isFrame) {
      if (i + 9 > buf.length) return null;
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return orientation >= 5 && orientation <= 8
        ? { width: height, height: width }
        : { width, height };
    }
    i += 2 + len;
  }
  return null;
}

function webp(buf: Buffer): ImageSize | null {
  if (buf.length < 30) return null;
  const kind = buf.toString("ascii", 12, 16);
  if (kind === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (kind === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === "VP8X") {
    return {
      width: buf.readUIntLE(24, 3) + 1,
      height: buf.readUIntLE(27, 3) + 1,
    };
  }
  return null;
}

export function readImageSize(buf: Buffer): ImageSize | null {
  let size: ImageSize | null = null;
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    size = png(buf);
  } else if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    size = jpeg(buf);
  } else if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    size = webp(buf);
  }
  return size && size.width > 0 && size.height > 0 ? size : null;
}