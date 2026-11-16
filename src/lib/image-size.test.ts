import { test } from "node:test";
import assert from "node:assert/strict";
import { readImageSize } from "@/lib/image-size";

function png(w: number, h: number) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}

function sof(w: number, h: number) {
  const b = Buffer.alloc(19);
  b[0] = 0xff;
  b[1] = 0xc0;
  b.writeUInt16BE(17, 2);
  b[4] = 8;
  b.writeUInt16BE(h, 5);
  b.writeUInt16BE(w, 7);
  b[9] = 3;
  return b;
}

function exif(orientation: number, bigEndian = true) {
  const tiff = Buffer.alloc(8 + 2 + 12 + 4);
  tiff.write(bigEndian ? "MM" : "II", 0, "ascii");
  const w16 = (v: number, o: number) => (bigEndian ? tiff.writeUInt16BE(v, o) : tiff.writeUInt16LE(v, o));
  const w32 = (v: number, o: number) => (bigEndian ? tiff.writeUInt32BE(v, o) : tiff.writeUInt32LE(v, o));
  w16(42, 2);
  w32(8, 4);
  w16(1, 8);
  w16(0x0112, 10);
  w16(3, 12);
  w32(1, 14);
  w16(orientation, 18);
  const body = Buffer.concat([Buffer.from("Exif\u0000\u0000", "latin1"), tiff]);
  const head = Buffer.alloc(4);
  head[0] = 0xff;
  head[1] = 0xe1;
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
}

const SOI = Buffer.from([0xff, 0xd8]);

test("reads PNG dimensions", () => {
  assert.deepEqual(readImageSize(png(800, 600)), { width: 800, height: 600 });
});

test("reads JPEG dimensions", () => {
  assert.deepEqual(readImageSize(Buffer.concat([SOI, sof(1200, 900)])), { width: 1200, height: 900 });
});

test("swaps JPEG dimensions for sideways EXIF orientations, both byte orders", () => {
  for (const be of [true, false]) {
    assert.deepEqual(readImageSize(Buffer.concat([SOI, exif(6, be), sof(4000, 3000)])), {
      width: 3000,
      height: 4000,
    });
  }
  assert.deepEqual(readImageSize(Buffer.concat([SOI, exif(1), sof(4000, 3000)])), {
    width: 4000,
    height: 3000,
  });
});

test("reads WebP lossy, lossless and extended dimensions", () => {
  const base = Buffer.alloc(40);
  base.write("RIFF", 0, "ascii");
  base.write("WEBP", 8, "ascii");

  const lossy = Buffer.from(base);
  lossy.write("VP8 ", 12, "ascii");
  lossy.writeUInt16LE(640, 26);
  lossy.writeUInt16LE(480, 28);
  assert.deepEqual(readImageSize(lossy), { width: 640, height: 480 });

  const lossless = Buffer.from(base);
  lossless.write("VP8L", 12, "ascii");
  lossless.writeUInt32LE(((300 - 1) << 14) | (500 - 1), 21);
  assert.deepEqual(readImageSize(lossless), { width: 500, height: 300 });

  const ext = Buffer.from(base);
  ext.write("VP8X", 12, "ascii");
  ext.writeUIntLE(1999, 24, 3);
  ext.writeUIntLE(999, 27, 3);
  assert.deepEqual(readImageSize(ext), { width: 2000, height: 1000 });
});

test("returns null for junk and truncated files", () => {
  assert.equal(readImageSize(Buffer.from("not an image")), null);
  assert.equal(readImageSize(Buffer.alloc(0)), null);
  assert.equal(readImageSize(png(800, 600).subarray(0, 18)), null);
  assert.equal(readImageSize(Buffer.concat([SOI, Buffer.from([0xff, 0xe1, 0x00, 0x05])])), null);
});